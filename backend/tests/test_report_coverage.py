from app.database import Replay


def test_report_explicitly_labels_duel_coverage(authenticated, application):
    user = authenticated.get("/api/auth/me").json()
    with application.state.sessions() as db:
        replay = Replay(
            user_id=user["id"],
            filename="coverage-test.replay",
            status="ready",
            selected_player="a",
            metadata_json={
                "players": [
                    {"id": "a", "name": "A", "team": 0},
                    {"id": "b", "name": "B", "team": 1},
                ]
            },
        )
        db.add(replay)
        db.commit()
        replay_id = replay.id
    report = authenticated.get(f"/api/replays/{replay_id}/report").json()
    assert report["coverage"]["team_rules_supported"] is False
    assert "not supported" in report["coverage"]["message"]
    assert report["priorities"] == [report["coverage"]["message"]]
