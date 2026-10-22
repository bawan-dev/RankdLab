from app.database import Replay
from app.playlists import classify


def roster(n):
    return [{"id": f"{t}-{i}", "team": t} for t in (0, 1) for i in range(n)]


def test_roster_never_proves_ranked_and_conflicts_require_confirmation():
    for n in (1, 2, 3):
        value = classify({"players": roster(n)}, {"TeamSize": n, "MatchType": "Online"})
        assert value["format"] == f"{n}v{n}"
        assert value["ranked"] is None
    assert classify({"players": roster(1)}, {"TeamSize": 2})["format"] is None
    assert classify({"players": roster(2)[:-1]})["format"] is None


def test_mode_mismatch_blocks_selection_and_histories_are_separate(authenticated, application):
    client = authenticated
    owner = client.get("/api/auth/me").json()["id"]
    with application.state.sessions() as db:
        for n in (1, 2, 3):
            db.add(
                Replay(
                    id=f"mode-{n}",
                    user_id=owner,
                    filename=f"{n}.replay",
                    status="ready",
                    requested_playlist="1v1",
                    selected_player="0-0",
                    metadata_json={"players": roster(n), "duration": 300, "active_seconds": 300},
                )
            )
        db.commit()
    detail = client.get("/api/replays/mode-2").json()
    assert detail["mode_confirmation_required"]
    assert client.put("/api/replays/mode-2/session", json={"player_id": "0-0"}).status_code == 409
    assert client.put("/api/replays/mode-2/mode?playlist=1v1").status_code == 422
    assert client.put("/api/replays/mode-2/mode?playlist=2v2").status_code == 200
    assert client.put("/api/replays/mode-2/session", json={"player_id": "0-0"}).status_code == 200
    for n in (1, 2, 3):
        data = client.get(f"/api/analytics?playlist={n}v{n}").json()
        assert data["matches"] == 1
        assert data["minutes"] == 5
        assert data["sessions"][0]["id"] == f"mode-{n}"
