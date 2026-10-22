from copy import deepcopy

import pytest
from test_analysis import actor, data_for, scenario

from app.analysis import DuelGoalExposure, analyse
from app.coaching import present, snapshot
from app.database import Replay


def duel_data():
    data = data_for(scenario(), 10)
    data["metadata"]["players"] = [{"id": "a", "team": 0}, {"id": "c", "team": 1}]
    for frame in data["frames"]:
        frame["ball"] = actor(0, -1800, 92, vy=-1200)
        frame["players"] = {"a": actor(0, 0), "c": actor(0, -1400)}
    return data


def test_duel_positive_sustain_and_recorded_context():
    data = duel_data()
    findings, _ = analyse(data, "duel")
    assert len(findings) == 1
    event = findings[0]
    assert event["category"] == "duel_goal_exposure"
    assert event["time"] >= 4.9
    assert event["candidate_start"] == 4
    assert event["spatial_context"]["players"]["a"]["position"]["y"] == 0
    assert event["evidence"]["projected_goal_x_uu"] == 0
    assert event["playlist"] == "1v1"


@pytest.mark.parametrize(
    "case", ["away", "wide", "high", "missing", "covered", "no_pressure", "transient", "gap"]
)
def test_duel_negative_cases(case):
    data = duel_data()
    for frame in data["frames"]:
        if case == "away":
            frame["ball"]["velocity"]["y"] = 1200
        if case == "wide":
            frame["ball"]["velocity"]["x"] = 1200
        if case == "high":
            frame["ball"]["position"]["z"] = 800
        if case == "missing":
            frame["ball"]["velocity"] = None
        if case == "covered":
            frame["players"]["a"]["position"]["y"] = -3000
        if case == "no_pressure":
            frame["players"]["c"]["position"]["y"] = 4000
        if case == "transient" and not 5 < frame["time"] < 5.5:
            frame["ball"]["velocity"]["y"] = 1200
        if case == "gap" and frame["time"] >= 4.7:
            frame["time"] += 1
    if case == "gap":
        data["frames"] = data["frames"][:180]
    assert analyse(data, case)[0] == []


def test_duel_symmetry_and_teammate_exclusion():
    data = duel_data()
    frame = deepcopy(data["frames"][-1])
    for a in [frame["ball"], *frame["players"].values()]:
        for field in ("position", "velocity"):
            a[field]["x"] *= -1
            a[field]["y"] *= -1
    detector = DuelGoalExposure()
    assert detector.evaluate(frame, {"id": "a", "team": 1}, [], [frame["players"]["c"]])
    assert (
        detector.evaluate(frame, {"id": "a", "team": 1}, [actor(0, 0)], [frame["players"]["c"]])
        is None
    )


def test_standard_bunching_candidate_positive_and_negative():
    data = data_for(scenario())
    data["metadata"]["players"] += [{"id": "e", "team": 0}, {"id": "f", "team": 1}]
    for frame in data["frames"]:
        frame["ball"] = actor(0, -1000, 92)
        frame["players"].update(
            a=actor(-500, -3500),
            b=actor(-300, -3550),
            c=actor(0, -600),
            e=actor(2200, -3800),
            f=actor(3000, 2000),
        )
    findings, _ = analyse(data, "standard")
    assert any(f["category"] == "defensive_bunching" and f["playlist"] == "3v3" for f in findings)
    for frame in data["frames"]:
        frame["players"]["b"] = actor(1400, -3500)
    assert not any(f["category"] == "defensive_bunching" for f in analyse(data, "standard")[0])


def test_rank_context_is_immutable_and_does_not_change_facts(authenticated, application):
    client = authenticated
    user = client.get("/api/auth/me").json()["id"]
    client.put("/api/rocket-league/ranks/1v1", json={"rank": "Gold II"})
    findings, seconds = analyse(duel_data(), "snapshot")
    with application.state.sessions() as db:
        context = snapshot(db, user, "1v1", "snapshot")
        db.add(
            Replay(
                id="snapshot",
                user_id=user,
                filename="synthetic-test.replay",
                status="ready",
                engine_version="geometry-0.2.0",
                selected_player="a",
                findings=findings,
                coaching_context=context,
                metadata_json={
                    **duel_data()["metadata"],
                    "duration": 10,
                    "active_seconds": seconds,
                },
            )
        )
        db.commit()
    old = client.get("/api/replays/snapshot/report").json()
    client.put("/api/rocket-league/ranks/1v1", json={"rank": "Grand Champion II"})
    assert client.get("/api/replays/snapshot/report").json() == old
    with application.state.sessions() as db:
        advanced = snapshot(db, user, "1v1", "next")
    basic_finding = old["findings"][0]
    advanced_finding = present(findings, advanced)[0]
    assert basic_finding["coaching"]["guidance"] != advanced_finding["coaching"]["guidance"]
    assert basic_finding["coaching"]["rank"]["rank"] == "Gold II"
    assert advanced_finding["coaching"]["prior_category_findings"] == 1
    for key in ("evidence", "time", "explanation", "category", "target"):
        assert basic_finding[key] == advanced_finding[key]
