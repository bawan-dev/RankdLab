"""Stable numerical features extracted from recorded situations, not labels."""

import math

from app.analysis import closing_speed, distance

VERSION = "spatial-0.1.0"
FEATURE_NAMES = [
    "ball_distance_uu",
    "goal_distance_uu",
    "height_uu",
    "speed_uu_s",
    "boost_percent",
    "closing_speed_uu_s",
    "nearest_teammate_uu",
    "nearest_opponent_uu",
    "ball_own_depth_uu",
    "player_own_depth_uu",
]


def extract_features(frame: dict, players: list[dict], player_id: str) -> dict[str, float]:
    player = next((p for p in players if p["id"] == player_id), None)
    subject = frame["players"].get(player_id)
    if not player or not subject or not frame["ball"] or frame["state"] != "Active":
        raise ValueError("Features require an active frame with player and ball data")
    if subject["boost"] is None or subject.get("velocity") is None:
        raise ValueError("Boost or velocity is missing from this sample")
    teammates = [
        frame["players"].get(p["id"])
        for p in players
        if p["team"] == player["team"] and p["id"] != player_id
    ]
    opponents = [frame["players"].get(p["id"]) for p in players if p["team"] != player["team"]]
    if not teammates or not opponents or any(a is None for a in [*teammates, *opponents]):
        raise ValueError("Features currently require fully recorded team gameplay")
    sp, bp = subject["position"], frame["ball"]["position"]
    own = -1 if player["team"] == 0 else 1
    features = {
        "ball_distance_uu": distance(sp, bp),
        "goal_distance_uu": distance(sp, {"x": 0, "y": own * 5120, "z": 0}),
        "height_uu": float(sp["z"]),
        "speed_uu_s": math.sqrt(sum(v * v for v in subject["velocity"].values())),
        "boost_percent": float(subject["boost"]),
        "closing_speed_uu_s": closing_speed(subject, frame["ball"]),
        "nearest_teammate_uu": min(distance(sp, p["position"]) for p in teammates if p),
        "nearest_opponent_uu": min(distance(sp, p["position"]) for p in opponents if p),
        "ball_own_depth_uu": own * bp["y"],
        "player_own_depth_uu": own * sp["y"],
    }
    if not all(math.isfinite(value) for value in features.values()):
        raise ValueError("Feature values must be finite")
    return features


def grouped_split(records: list[dict], test_fraction: float = 0.25) -> tuple[list[int], list[int]]:
    """Keep connected match/player groups together, preventing leakage on BOTH axes."""
    import numpy as np
    from sklearn.model_selection import GroupShuffleSplit

    parent: dict[str, str] = {}

    def root(key: str) -> str:
        parent.setdefault(key, key)
        if parent[key] != key:
            parent[key] = root(parent[key])
        return parent[key]

    for record in records:
        left, right = root(f"match:{record['replay_id']}"), root(f"player:{record['player_id']}")
        parent[left] = right
    groups = [root(f"match:{record['replay_id']}") for record in records]
    if len(set(groups)) < 4:
        raise ValueError("At least four independent match/player groups are required")
    split = GroupShuffleSplit(n_splits=1, test_size=test_fraction, random_state=42)
    train, test = next(split.split(np.zeros(len(records)), groups=groups))
    return train.tolist(), test.tolist()
