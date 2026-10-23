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


def test_saved_report_coverage_does_not_claim_new_rules(authenticated, application):
    from app.analysis import VERSION

    user = authenticated.get("/api/auth/me").json()
    for version, phrase in [("geometry-0.2.0", "exposure only"), (VERSION, "movement candidates")]:
        with application.state.sessions() as db:
            replay = Replay(
                user_id=user["id"],
                filename="version-unit.replay",
                status="ready",
                engine_version=version,
                selected_player="a",
                metadata_json={"players": [{"id": "a", "team": 0}, {"id": "b", "team": 1}]},
            )
            db.add(replay)
            db.commit()
            identifier = replay.id
        report = authenticated.get(f"/api/replays/{identifier}/report").json()
        assert phrase in report["coverage"]["message"]
