import copy

import pytest

from app.replay_adapter import actor
from app.replay_visuals import add_visual_telemetry


def test_adapter_preserves_recorded_actions_and_unknowns():
    body = {"location": {"x": 1, "y": 2, "z": 3}, "rotation": {"x": 0, "y": 0, "z": 0, "w": 1}}
    sample = actor(
        {
            "Data": {
                "rigid_body": body,
                "boost_active": True,
                "jump_active": False,
                "double_jump_active": True,
            }
        }
    )
    assert sample["boost_active"] is True
    assert sample["jump_active"] is False
    assert sample["double_jump_active"] is True
    assert sample["dodge_active"] is None
    assert actor("Empty") is None


def visual_fixture():
    old = {
        "parser_version": "pinned",
        "metadata": {
            "players": [{"id": "a", "name": "Player", "team": 0}],
            "duration": 1,
            "active_seconds": 0.8,
        },
        "events": {"touches": []},
        "frames": [
            {
                "time": 0,
                "source_time": 4,
                "state": "Active",
                "seconds_remaining": 300,
                "ball": None,
                "players": {
                    "a": {"position": {"x": 0}, "rotation": {}, "velocity": None, "boost": 30}
                },
            }
        ],
    }
    new = copy.deepcopy(old)
    new["adapter_version"] = "native-actions-3"
    new["metadata"]["players"][0]["car_body_id"] = 4284
    new["frames"][0]["players"]["a"]["boost_active"] = True
    return old, new


def test_visual_upgrade_preserves_original_fields_and_input():
    old, new = visual_fixture()
    original = copy.deepcopy(old)
    upgraded = add_visual_telemetry(old, new)
    assert old == original
    assert upgraded["metadata"]["active_seconds"] == 0.8
    assert upgraded["events"] == old["events"]
    assert upgraded["metadata"]["players"][0]["car_body_id"] == 4284
    assert upgraded["frames"][0]["players"]["a"]["boost_active"] is True


@pytest.mark.parametrize("change", ["physics", "timing", "identity", "missing"])
def test_visual_upgrade_refuses_mismatched_source(change):
    old, new = visual_fixture()
    if change == "physics":
        new["frames"][0]["players"]["a"]["position"]["x"] = 9
    elif change == "timing":
        new["frames"][0]["time"] = 0.1
    elif change == "identity":
        new["metadata"]["players"][0]["id"] = "other"
    else:
        new["frames"][0]["players"]["a"] = None
    with pytest.raises(ValueError, match="visual upgrade refused"):
        add_visual_telemetry(old, new)
