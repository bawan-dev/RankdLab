from copy import deepcopy

import pytest
from test_analysis import actor

from app.analysis import analyse


def sequence(kind="advance", mode=1, hz=30):
    roster = [{"id": f"{t}-{i}", "team": t} for t in (0, 1) for i in range(mode)]
    frames = []
    for index in range(hz * 8):
        time = index / hz
        elapsed = max(0, time - 4)
        if kind == "advance":
            subject = actor(0, -3500 + 1500 * elapsed, vy=1500)
        else:
            subject = actor(800 * elapsed, 300 * elapsed, vx=800, vy=300)
        players = {p["id"]: actor(3000, 3000) for p in roster}
        players["0-0"] = subject
        players["1-0"] = actor(0, -1000)
        for i in range(1, mode):
            players[f"0-{i}"] = actor(500 * i, 2500 + i * 500)
        frames.append(
            {
                "time": time,
                "state": "Active",
                "seconds_remaining": 300 - time,
                "ball": actor(0, -1500, 92, vy=-1000),
                "players": players,
            }
        )
    return {
        "metadata": {"players": roster, "classification": {"format": f"{mode}v{mode}"}},
        "frames": frames,
    }


@pytest.mark.parametrize(
    "kind,category", [("advance", "duel_cover_advance"), ("drift", "duel_recovery_drift")]
)
def test_duel_sequences_positive_negative_ambiguous_and_symmetry(kind, category):
    data = sequence(kind)
    found = [f for f in analyse(data, "sequence")[0] if f["category"] == category]
    assert found and found[0]["detector_version"] == "sequence-1"
    assert found[0]["context_window"]["end"] - found[0]["context_window"]["start"] >= 1
    for case in ("no_pressure", "away_ball", "missing_velocity", "airborne"):
        negative = deepcopy(data)
        for f in negative["frames"]:
            if case == "no_pressure":
                f["players"]["1-0"] = actor(4000, 4000)
            if case == "away_ball":
                f["ball"]["velocity"]["y"] = 1000
            if case == "missing_velocity":
                f["players"]["0-0"]["velocity"] = None
            if case == "airborne":
                f["players"]["0-0"]["position"]["z"] = 800
        assert not any(f["category"] == category for f in analyse(negative, case)[0])
    mirror = deepcopy(data)
    for p in mirror["metadata"]["players"]:
        p["team"] = 1 - p["team"]
    for f in mirror["frames"]:
        for a in [f["ball"], *f["players"].values()]:
            for field in ("position", "velocity"):
                a[field]["x"] *= -1
                a[field]["y"] *= -1
    assert [f["time"] for f in analyse(mirror, "mirror")[0] if f["category"] == category] == [
        f["time"] for f in found
    ]


def test_sampling_history_handles_unsampled_missing_frame():
    data = sequence()
    baseline = analyse(data, "baseline")[0]
    assert baseline
    # One missing frame every .5 seconds invalidates continuous one-second evidence.
    for index, f in enumerate(data["frames"]):
        if index % 15 == 1:
            f["players"]["0-0"] = None
    assert not any(f["category"] == "duel_cover_advance" for f in analyse(data, "gaps")[0])


@pytest.mark.parametrize(
    "kind,category",
    [("advance", "doubles_second_man_advance"), ("drift", "doubles_uncovered_recovery")],
)
def test_doubles_sequences_and_recovered_teammate_suppression(kind, category):
    data = sequence(kind, 2)
    assert any(f["category"] == category for f in analyse(data, "doubles")[0])
    for frame in data["frames"]:
        frame["players"]["0-1"] = actor(1000, -4000)
    assert not any(f["category"] == category for f in analyse(data, "covered")[0])
