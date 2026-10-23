from copy import deepcopy

import pytest

from app.coaching import present, training_plan


@pytest.mark.parametrize("mode", ["1v1", "2v2", "3v3"])
def test_explanation_levels_preserve_facts_and_unknown_rank_works(mode):
    finding = {
        "id": "f",
        "player_id": "a",
        "source": "rule",
        "category": "duel_recovery_drift",
        "alternative": "Review recovery",
        "evidence": {"distance": 123},
        "time": 10,
    }
    original = deepcopy(finding)
    explanations = []
    for level in ("foundational", "standard", "advanced", "expert"):
        result = present([finding], {"playlist": mode, "presentation_level": level})[0]
        explanations.append(result.pop("coaching")["guidance"])
        assert result == original
    assert len(set(explanations)) == 4
    assert present([finding], {"playlist": mode})[0]["coaching"]["rank"] is None


def test_training_plan_requires_distinct_matches_and_excludes_disputed_current_flags():
    finding = {"id": "f", "player_id": "a", "source": "rule", "category": "duel_recovery_drift"}
    assert training_plan([finding], {}, "a", set())["objectives"] == []
    assert training_plan([finding, finding], {}, "a", set())["objectives"] == []
    context = {
        "history_by_player": {"a": {"duel_recovery_drift": 1}},
        "history_matches_by_player": {"a": {"duel_recovery_drift": 1}},
    }
    plan = training_plan([finding], context, "a", set())
    assert plan["objectives"][0]["matches"] == 2
    assert training_plan([finding], context, "a", {"f"})["objectives"] == []
