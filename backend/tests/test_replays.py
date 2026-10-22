import json
import subprocess

import pytest
from sqlalchemy import select

from app.database import Feedback, Replay, ReviewLabel
from app.worker import run_parser


@pytest.mark.parametrize(
    ("name", "content", "mime", "status"),
    [
        ("empty.replay", b"", "application/octet-stream", 422),
        ("notes.txt", b"x" * 100, "application/octet-stream", 422),
        ("../escape.replay", b"x" * 100, "application/octet-stream", 422),
        ("web.replay", b"x" * 100, "text/html", 415),
        ("large.replay", b"x" * (20 * 1024**2 + 1), "application/octet-stream", 413),
    ],
    ids=["empty", "extension", "traversal", "mime", "oversized"],
)
def test_upload_validation(authenticated, name, content, mime, status):
    response = authenticated.post("/api/replays", files={"file": (name, content, mime)})
    assert response.status_code == status, response.text
    assert authenticated.get("/api/replays").json() == []


def test_corrupt_replay_fails_safely(authenticated, application):
    response = authenticated.post(
        "/api/replays",
        files={"file": ("corrupt.replay", b"invalid" * 100, "application/octet-stream")},
    )
    replay_id = response.json()["id"]
    assert response.status_code == 202
    assert application.state.worker.process_one()
    result = authenticated.get(f"/api/replays/{replay_id}").json()
    assert result["status"] == "failed"
    assert "Traceback" not in result["error"]
    assert authenticated.get(f"/api/replays/{replay_id}/frames").status_code == 409
    assert authenticated.delete(f"/api/replays/{replay_id}").status_code == 204
    assert not (application.state.settings.data_dir / "replays" / replay_id).exists()


def test_subprocess_timeout(monkeypatch, tmp_path):
    def timeout(*args, **kwargs):
        assert kwargs["shell"] is False
        raise subprocess.TimeoutExpired(args[0], 1)

    monkeypatch.setattr(subprocess, "run", timeout)
    with pytest.raises(subprocess.TimeoutExpired):
        run_parser(tmp_path / "x.replay", tmp_path / "frames.json", 1)


def test_real_replay_pipeline(authenticated, application, genuine_replay):
    # This test executes the actual native parser; no mocked replay movement.
    response = authenticated.post(
        "/api/replays",
        files={
            "file": (genuine_replay.name, genuine_replay.read_bytes(), "application/octet-stream")
        },
    )
    assert response.status_code == 202, response.text
    replay_id = response.json()["id"]
    assert application.state.worker.process_one()
    result = authenticated.get(f"/api/replays/{replay_id}").json()
    assert result["status"] == "ready", result
    assert result["metadata"]["score"] == [4, 1]
    assert len(result["metadata"]["players"]) == 4
    assert result["metadata"]["frame_count"] == 9530
    assert result["metadata"]["active_seconds"] > 250
    data = authenticated.get(f"/api/replays/{replay_id}/frames").json()
    assert data["frames"][0]["time"] == 0
    assert data["frames"][-1]["time"] == result["metadata"]["duration"]
    assert data["frames"][0]["ball"]["position"] == {"x": 0, "y": 0, "z": 92.75}
    assert data["frames"][0]["source_time"] == data["metadata"]["source_time_offset"]
    times = [f["time"] for f in data["frames"]]
    assert times == sorted(times)
    assert len({json.dumps(f["ball"]["position"]) for f in data["frames"] if f["ball"]}) > 1000
    player = result["metadata"]["players"][0]
    saved = authenticated.put(
        f"/api/replays/{replay_id}/session",
        json={"player_id": player["id"], "time": 20, "reviewed_ids": []},
    )
    assert saved.status_code == 200
    assert (
        authenticated.put(
            f"/api/replays/{replay_id}/session", json={"player_id": "someone-else", "time": 0}
        ).status_code
        == 422
    )
    assert (
        authenticated.put(
            f"/api/replays/{replay_id}/session", json={"player_id": player["id"], "time": 9000}
        ).status_code
        == 422
    )
    moment = authenticated.post(
        f"/api/replays/{replay_id}/moments",
        json={
            "player_id": player["id"],
            "time": 25,
            "title": "Review this challenge",
            "explanation": "Manual test note",
            "alternative": "Consider a deeper supporting lane",
        },
    )
    assert moment.status_code == 201
    manual = next(f for f in moment.json()["findings"] if f["source"] == "manual")
    feedback_url = f"/api/replays/{replay_id}/findings/{manual['id']}/feedback"
    assert authenticated.put(feedback_url, json={"inaccurate": True}).status_code == 200
    assert authenticated.put(feedback_url, json={"inaccurate": False}).json()["inaccurate"] is False
    report = authenticated.get(f"/api/replays/{replay_id}/report").json()
    assert manual["id"] in [f["id"] for f in report["findings"]]
    assert report["selected_player"]["id"] == player["id"]
    stats = authenticated.get("/api/analytics").json()
    assert stats["matches"] == 1
    assert stats["findings"] == sum(f["source"] == "rule" for f in report["findings"])
    assert stats["minutes"] == report["active_seconds"] / 60
    assert authenticated.delete(f"/api/replays/{replay_id}").status_code == 204
    with application.state.sessions() as db:
        assert db.get(Replay, replay_id) is None
        assert db.scalar(select(Feedback).where(Feedback.replay_id == replay_id)) is None
        assert db.scalar(select(ReviewLabel).where(ReviewLabel.replay_id == replay_id)) is None
