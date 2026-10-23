"""Add visual telemetry to an existing frame cache without changing recorded movement."""

import copy

ACTION_FIELDS = ("boost_active", "jump_active", "double_jump_active", "dodge_active")
BODY_FIELDS = ("car_body_id", "car_hitbox_family")


def add_visual_telemetry(original: dict, parsed: dict) -> dict:
    """Fail closed if source replay identity, samples or physics no longer match."""
    old_meta, new_meta = original["metadata"], parsed["metadata"]

    def identity(player):
        return player["id"], player["name"], player["team"]

    if (
        original["parser_version"] != parsed["parser_version"]
        or list(map(identity, old_meta["players"])) != list(map(identity, new_meta["players"]))
        or old_meta["duration"] != new_meta["duration"]
        or len(original["frames"]) != len(parsed["frames"])
    ):
        raise ValueError("Replay identity or frame coverage changed; visual upgrade refused")
    result = copy.deepcopy(original)
    for old, new in zip(result["frames"], parsed["frames"], strict=True):
        for key in ("time", "source_time", "seconds_remaining", "state"):
            if old.get(key) != new.get(key):
                raise ValueError("Replay timing changed; visual upgrade refused")
        if old["players"].keys() != new["players"].keys():
            raise ValueError("Replay player tracks changed; visual upgrade refused")
        for before, after in [
            (old["ball"], new["ball"]),
            *[(old["players"][pid], new["players"][pid]) for pid in old["players"]],
        ]:
            for key in ("position", "rotation", "velocity", "boost"):
                if (before is None) != (after is None) or (
                    before is not None and before.get(key) != after.get(key)
                ):
                    raise ValueError("Replay physics changed; visual upgrade refused")
            if before is not None:
                before.update({key: after.get(key) for key in ACTION_FIELDS})
    for old, new in zip(result["metadata"]["players"], new_meta["players"], strict=True):
        old.update({key: new.get(key) for key in BODY_FIELDS})
    result["adapter_version"] = parsed["adapter_version"]
    return result
