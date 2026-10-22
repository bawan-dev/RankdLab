import json

import pytest

from app.config import ROOT
from app.worker import run_parser


@pytest.mark.parametrize(
    ("filename", "count", "players", "score"),
    [
        ("season24-standard.replay", 7501, 6, [4, 2]),
        ("genuine-duel.replay", 2523, 2, [None, 4]),
    ],
)
def test_additional_genuine_formats(tmp_path, filename, count, players, score):
    source = ROOT / ".research" / filename
    if not source.exists():
        pytest.skip("Run scripts/fetch-test-replay.py --all for additional genuine formats")
    data = run_parser(source, tmp_path / "frames.json", 90)
    assert data["metadata"]["frame_count"] == count
    assert len(data["metadata"]["players"]) == players
    assert data["metadata"]["score"] == score
    assert data["frames"][0]["time"] == 0
    assert data["frames"][-1]["time"] > 30
    assert len({json.dumps(f["ball"]["position"]) for f in data["frames"] if f["ball"]}) > 100
