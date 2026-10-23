import json

from sqlalchemy import select
from test_sequences import sequence

from app.analysis import analyse
from app.database import Replay, TacticalReview
from app.evaluation import evaluate


def test_reviews_preserve_originals_isolate_accounts_export_and_cleanup(authenticated, application):
    client = authenticated
    owner = client.get("/api/auth/me").json()["id"]
    data = sequence()
    findings, seconds = analyse(data, "review-fixture")
    event = next(f for f in findings if f["category"] == "duel_cover_advance")
    with application.state.sessions() as db:
        db.add(
            Replay(
                id="review-fixture",
                user_id=owner,
                filename="synthetic-unit.replay",
                status="ready",
                findings=findings,
                metadata_json={**data["metadata"], "duration": 8, "active_seconds": seconds},
            )
        )
        db.commit()
    directory = application.state.settings.data_dir / "replays" / "review-fixture"
    directory.mkdir(parents=True)
    (directory / "frames.json").write_text(json.dumps(data))
    payload = {
        "player_id": "0-0",
        "start": event["time"] - 1,
        "end": event["time"],
        "category": event["category"],
        "label": "reasonable_decision",
        "explanation": "Synthetic test: reject interpretation, preserve evidence.",
        "finding_id": event["id"],
    }
    assert client.post("/api/replays/review-fixture/reviews", json=payload).status_code == 201
    assert client.get("/api/replays/review-fixture").json()["findings"] == findings
    assert (
        client.put(
            f"/api/replays/review-fixture/findings/{event['id']}/feedback",
            json={"rating": "helpful"},
        ).json()["rating"]
        == "helpful"
    )
    reviews = client.get("/api/replays/review-fixture/reviews").json()
    assert reviews[0]["label"] == "reasonable_decision"
    assert reviews[0]["reviewer_qualification"] == "account_owner_not_expert_verified"
    export = client.get("/api/reviews/export").text
    assert "synthetic-unit.replay" not in export and owner not in export
    assert evaluate([json.loads(line) for line in export.splitlines()])["metrics"] is None
    for changes in [
        {"end": 30},
        {"category": "invented"},
        {"player_id": "unknown"},
        {"target": {"x": float(9999), "y": 0}},
        {"start": 7, "end": 6},
    ]:
        assert (
            client.post(
                "/api/replays/review-fixture/reviews", json={**payload, **changes}
            ).status_code
            == 422
        )
    client.cookies.clear()
    from conftest import register

    register(client, "other@example.com")
    assert client.get("/api/replays/review-fixture/reviews").status_code == 404
    assert client.get("/api/reviews/export").text == ""
    # Return to the owner through the real login route.
    client.post(
        "/api/auth/login",
        json={"email": "reviewer@example.com", "password": "test-only-password-123"},
    )
    assert client.delete("/api/replays/review-fixture").status_code == 204
    with application.state.sessions() as db:
        assert list(db.scalars(select(TacticalReview))) == []
    assert not directory.exists()


def test_evaluation_only_counts_qualified_reviewed_windows_and_uncertain_is_excluded():
    base = {
        "record_type": "review",
        "replay_ref": "r",
        "player_ref": "a",
        "category": "test",
        "playlist": "1v1",
        "start": 5,
        "end": 6,
        "label": "confirmed_issue",
        "reviewer_qualification": "externally-verified-expert",
    }
    finding = {**base, "record_type": "finding", "time": 5.5}
    result = evaluate([base, finding, {**base, "start": 7, "end": 8}])
    assert result["counts"] == {"tp": 1, "fn": 1}
    assert result["metrics"] == {"precision": 1, "reviewed_window_recall": 0.5}
    assert evaluate([{**base, "label": "uncertain"}])["metrics"] is None
    assert (
        evaluate([{**base, "reviewer_qualification": "account_owner_not_expert_verified"}])[
            "metrics"
        ]
        is None
    )
