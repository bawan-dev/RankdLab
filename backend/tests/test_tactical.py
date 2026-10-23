from copy import deepcopy

from test_analysis import actor, data_for, scenario

from app.tactical import TemporalWindow, interpret


def test_features_missing_and_team_symmetry():
    data = data_for(scenario())
    frame = data["frames"][0]
    state = interpret(frame, data["metadata"], "a")
    a = state.players["a"]
    assert a.features["closing_speed_uu_s"] > 800
    assert a.features["grounded"] is None and a.features["possession"] is None
    mirror = deepcopy(data)
    for p in mirror["metadata"]["players"]:
        p["team"] = 1 - p["team"]
    for value in [mirror["frames"][0]["ball"], *mirror["frames"][0]["players"].values()]:
        for key in ("position", "velocity"):
            value[key]["x"] *= -1
            value[key]["y"] *= -1
    mirrored = interpret(mirror["frames"][0], mirror["metadata"]).players["a"]
    assert a.features == mirrored.features
    frame["players"]["a"] = None
    assert interpret(frame, data["metadata"]).players["a"].features == {"missing_actor": True}


def test_roles_change_with_depth_and_ties_are_unknown():
    data = data_for(scenario())
    frame = data["frames"][0]
    frame["players"]["a"] = actor(0, -2500)
    assert interpret(frame, data["metadata"]).players["a"].role == "second_man"
    frame["players"]["a"] = actor(0, 500)
    assert interpret(frame, data["metadata"]).players["a"].role == "first_man"
    frame["players"]["a"] = actor(0, -750)
    assert interpret(frame, data["metadata"]).players["a"].role is None


def test_temporal_interruptions_and_duplicate_samples():
    data = data_for(scenario())
    window = TemporalWindow()
    for f in data["frames"][:60]:
        window.push(f, data["metadata"]["players"])
    assert window.before(1) is not None
    assert not window.push(data["frames"][59], data["metadata"]["players"])
    f = deepcopy(data["frames"][60])
    f["players"]["a"] = None
    assert not window.push(f, data["metadata"]["players"])
    assert window.before(0.1) is None
    for f in data["frames"][61:90]:
        window.push(f, data["metadata"]["players"])
    f = deepcopy(data["frames"][90])
    f["players"]["a"] = actor(4000, 4000)
    window.push(f, data["metadata"]["players"])
    assert window.reason == "gap_teleport_or_clock_reset"
    assert window.before(0.1) is None


def test_clock_and_event_uncertainty_are_not_filled_with_defaults():
    data = data_for(scenario())
    frame = data["frames"][0]
    frame["seconds_remaining"] = 30
    state = interpret(
        frame,
        {
            **data["metadata"],
            "events": {"touches": [{"time": 0, "player_id": None, "source": "parser-derived"}]},
        },
    )
    assert state.overtime is None
    assert state.recent_events["touches"][0]["player_id"] is None
    assert state.players["a"].features["possession"] is None
