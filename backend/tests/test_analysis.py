from copy import deepcopy

import pytest

from app.analysis import DefensiveBunching, DoubleCommit, ExposedGoal, analyse

PLAYERS = [{"id": "a", "team": 0}, {"id": "b", "team": 0}, {"id": "c", "team": 1}]


def actor(x, y, z=20, vx=0, vy=0):
    return {
        "position": {"x": x, "y": y, "z": z},
        "velocity": {"x": vx, "y": vy, "z": 0},
        "boost": 50,
    }


def scenario():
    return {
        "time": 6,
        "state": "Active",
        "ball": actor(0, 0, 92),
        "players": {
            "a": actor(-100, -800, vy=900),
            "b": actor(100, -750, vy=1000),
            "c": actor(0, 600),
        },
    }


def evaluate(detector, frame):
    return detector.evaluate(frame, PLAYERS[0], [frame["players"]["b"]], [frame["players"]["c"]])


def test_double_commit_and_negative_cases():
    frame = scenario()
    assert evaluate(DoubleCommit(), frame)
    # Teammate facing away from the ball: no inferred challenge.
    frame["players"]["b"]["velocity"]["y"] = -1000
    assert evaluate(DoubleCommit(), frame) is None
    frame = scenario()
    frame["ball"]["position"]["y"] = -4500
    frame["players"]["a"]["position"]["y"] = -4900
    frame["players"]["b"]["position"]["y"] = -4800
    assert evaluate(DoubleCommit(), frame) is None  # emergency goal-line defence
    frame = scenario()
    frame["ball"]["position"]["z"] = 1200
    assert evaluate(DoubleCommit(), frame) is None  # aerial handoff


def test_covering_third_player_suppresses_double_commit():
    frame = scenario()
    result = DoubleCommit().evaluate(
        frame, PLAYERS[0], [frame["players"]["b"], actor(1500, -3000)], [frame["players"]["c"]]
    )
    assert result is None


def test_bunching_requires_pressure_and_separate_space():
    frame = scenario()
    frame["ball"] = actor(0, -1000, 92)
    frame["players"] = {"a": actor(-500, -3500), "b": actor(-300, -3550), "c": actor(0, -600)}
    assert evaluate(DefensiveBunching(), frame)
    frame["players"]["c"] = actor(3000, 3000)
    assert evaluate(DefensiveBunching(), frame) is None
    frame["players"]["c"] = actor(0, -600)
    frame["players"]["b"] = actor(1500, -3550)
    assert evaluate(DefensiveBunching(), frame) is None


def test_exposed_goal_requires_goalward_ball_and_no_cover():
    frame = scenario()
    frame["ball"] = actor(0, -1500, 92, vy=-1200)
    frame["players"] = {"a": actor(0, 0), "b": actor(1000, 500), "c": actor(0, -1000)}
    assert evaluate(ExposedGoal(), frame)
    frame["ball"]["velocity"]["y"] = 1200
    assert evaluate(ExposedGoal(), frame) is None
    frame["ball"]["velocity"]["y"] = -1200
    frame["players"]["b"] = actor(0, -4000)
    assert evaluate(ExposedGoal(), frame) is None


def data_for(frame, seconds=10):
    frames = []
    for i in range(int(seconds * 30)):
        copy = deepcopy(frame)
        copy["time"] = i / 30
        frames.append(copy)
    return {"metadata": {"players": PLAYERS}, "frames": frames}


def test_sustain_cooldown_kickoff_and_provenance():
    data = data_for(scenario(), 30)
    findings, active = analyse(data, "real-id")
    assert active == pytest.approx(30 - 1 / 30)
    assert findings and findings[0]["time"] >= 4.65
    assert len(findings) <= 6  # at most three moments per player in 30 seconds
    assert all(
        f["replay_id"] == "real-id" and f["detector_version"] and "confidence" not in f
        for f in findings
    )
    for frame in data["frames"]:
        frame["state"] = "Countdown"
    assert analyse(data, "id") == ([], 0)
    data = data_for(scenario(), 10)
    for frame in data["frames"]:
        frame["players"]["b"] = None
    assert analyse(data, "id")[0] == []


def test_transient_overlap_is_not_a_finding():
    data = data_for(scenario(), 10)
    for frame in data["frames"]:
        if not 5 < frame["time"] < 5.3:
            frame["players"]["b"]["velocity"]["y"] = -1000
    assert analyse(data, "id")[0] == []
