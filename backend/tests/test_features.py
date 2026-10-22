import json

import pytest

from app.features import FEATURE_NAMES, VERSION, extract_features, grouped_split
from app.ml import train


def test_features_have_units_and_reject_missing_context():
    def actor(x, y):
        return {
            "position": {"x": x, "y": y, "z": 20},
            "velocity": {"x": 300, "y": 400, "z": 0},
            "boost": 50,
        }

    players = [{"id": "a", "team": 0}, {"id": "b", "team": 0}, {"id": "c", "team": 1}]
    frame = {
        "state": "Active",
        "ball": actor(300, 400),
        "players": {"a": actor(0, 0), "b": actor(1000, 0), "c": actor(0, 2000)},
    }
    result = extract_features(frame, players, "a")
    assert set(result) == set(FEATURE_NAMES)
    assert result["speed_uu_s"] == 500
    assert result["ball_distance_uu"] == 500
    assert result["nearest_teammate_uu"] == 1000
    assert result["ball_own_depth_uu"] == -400
    frame["players"]["a"]["boost"] = None
    with pytest.raises(ValueError, match="missing"):
        extract_features(frame, players, "a")


def test_grouped_evaluation_holds_out_both_players_and_matches():
    records = [{"replay_id": f"m{i}", "player_id": f"p{i}"} for i in range(8)]
    records.extend([{"replay_id": "m0", "player_id": "p1"}, {"replay_id": "m1", "player_id": "p2"}])
    train_indices, test_indices = grouped_split(records)
    for key in ("replay_id", "player_id"):
        assert {records[i][key] for i in train_indices}.isdisjoint(
            {records[i][key] for i in test_indices}
        )
    assert set(train_indices) | set(test_indices) == set(range(len(records)))
    with pytest.raises(ValueError, match="independent"):
        grouped_split(records[:3])


def test_offline_baseline_smoke_only_not_a_coaching_dataset(tmp_path):
    # Artificial numeric values exercise sklearn plumbing. These are NOT genuine
    # Rocket League labels and no resulting metric is product validation.
    rows = [
        {
            "replay_id": f"synthetic-test-match-{i // 10}",
            "player_id": f"synthetic-test-player-{i // 10}",
            "label": i % 2,
            "category": "potential_double_commit",
            "feature_version": VERSION,
            "label_source": "synthetic_unit_test_only",
            "features": {name: float(i % 2 * 100 + i / 10) for name in FEATURE_NAMES},
            "rule_prediction": i % 2,
        }
        for i in range(80)
    ]
    output = tmp_path / "test-only-result.json"
    result = train(rows, output)
    assert result["production_approved"] is False
    assert result["held_out_examples"] > 0
    assert result["training_examples"] + result["held_out_examples"] == 80
    assert json.loads(output.read_text())["label_sources"] == ["synthetic_unit_test_only"]
    with pytest.raises(ValueError, match="40"):
        train([], output)
