import json
import logging
import os
from pathlib import Path

import pytest
from test_analysis import data_for, scenario

from app.analysis import DETECTORS, PLAYLIST_DETECTORS, analyse
from app.middleware import JsonFormatter
from app.worker import run_parser


def test_diagnostics_do_not_change_findings_and_account_for_full_replay():
    data = data_for(scenario(), 30)
    expected = analyse(data, "audit")
    diagnostics = {}
    assert analyse(data, "audit", diagnostics) == expected
    assert diagnostics["frames"]["visited"] == len(data["frames"])
    assert diagnostics["last_visited_time"] == data["frames"][-1]["time"]
    for player in data["metadata"]["players"][:2]:
        stats = diagnostics["players"][player["id"]]
        assert set(stats) == {d.category for d in DETECTORS}
        assert all(s["evaluations"] > 0 for s in stats.values())
        assert sum(s["emitted"] for s in stats.values()) > 0


def test_duel_runs_only_its_own_detector():
    data = data_for(scenario())
    data["metadata"]["players"] = [data["metadata"]["players"][0], data["metadata"]["players"][2]]
    diagnostics = {}
    assert analyse(data, "duel", diagnostics)[0] == []
    assert diagnostics["detectors"] == [d.category for d in PLAYLIST_DETECTORS["1v1"]]
    assert all(
        set(stats) == set(diagnostics["detectors"]) for stats in diagnostics["players"].values()
    )


def test_structured_log_retains_diagnostics():
    record = logging.LogRecord("test", logging.INFO, "test", 1, "analysis_summary", (), None)
    record.diagnostics = {"total_frames": 123}
    assert json.loads(JsonFormatter().format(record))["diagnostics"]["total_frames"] == 123


def test_optional_private_replay_has_real_rule_finding(tmp_path):
    path = os.environ.get("RANKDLAB_COACHING_REPLAY")
    if not path:
        pytest.skip("Private regression requires RANKDLAB_COACHING_REPLAY")
    data = run_parser(Path(path), tmp_path / "frames.json", 90)
    findings, _ = analyse(data, "private-regression")
    assert any(
        f["source"] == "rule" and f["category"] == "potential_exposed_goal" for f in findings
    )
