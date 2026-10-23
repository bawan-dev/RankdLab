from test_analysis import actor

from app.alternatives import propose


def test_alternative_requires_supported_ground_threat():
    frame = {"ball": actor(0, -1500, 92, vy=-1000), "players": {"a": actor(0, 0)}}
    player = {"id": "a", "team": 0}
    target, basis = propose(frame, player, "duel_recovery_drift")
    assert target and target["y"] == -2400 and "schematic" in basis
    assert propose(frame, player, "potential_double_commit")[0] is None
    frame["players"]["a"]["position"]["z"] = 500
    assert propose(frame, player, "duel_goal_exposure")[0] is None
