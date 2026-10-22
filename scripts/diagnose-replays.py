"""Read-only replay audit. Originals and application records are never modified."""

import argparse
import json
from collections import Counter
from pathlib import Path

from app.analysis import analyse
from app.worker import run_parser


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    paths = [
        file
        for path in args.paths
        for file in (sorted(path.glob("*.replay")) if path.is_dir() else [path])
    ]
    summaries = []
    for source in paths:
        try:
            data = run_parser(source.resolve(), args.output / f"{source.stem}-frames.json", 90)
            diagnostics = {}
            findings, seconds = analyse(data, source.stem, diagnostics)
            summary = {
                "file": source.name,
                "frames": len(data["frames"]),
                "duration": data["metadata"]["duration"],
                "active_seconds": seconds,
                "players": data["metadata"]["players"],
                "counts": dict(Counter(f["category"] for f in findings)),
                "findings": findings,
                "diagnostics": diagnostics,
            }
            (args.output / f"{source.stem}-audit.json").write_text(
                json.dumps(summary, indent=2), encoding="utf-8"
            )
            summaries.append({k: summary[k] for k in ("file", "frames", "duration", "counts")})
            print(json.dumps(summaries[-1]), flush=True)
        except Exception as error:
            summaries.append({"file": source.name, "error": str(error)})
            print(json.dumps(summaries[-1]), flush=True)
    (args.output / "summary.json").write_text(json.dumps(summaries, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
