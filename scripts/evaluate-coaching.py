"""Evaluate a local versioned JSONL export; no network, training or file mutation."""

import argparse
import json
from pathlib import Path

from app.evaluation import evaluate

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("dataset", type=Path)
args = parser.parse_args()
records = [
    json.loads(line)
    for line in args.dataset.read_text(encoding="utf-8").splitlines()
    if line
]
print(json.dumps(evaluate(records), indent=2))
