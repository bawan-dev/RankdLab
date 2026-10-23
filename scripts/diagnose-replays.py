"""Read-only replay audit. Originals and application records are never modified."""

import argparse
import json
import time
import tracemalloc
from collections import Counter
from pathlib import Path

from app.analysis import analyse
from app.worker import run_parser


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--profile-memory",
        action="store_true",
        help="Measure Python allocations; slows timings",
    )
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
            if args.profile_memory:
                tracemalloc.start()
            parse_start = time.perf_counter()
            data = run_parser(source.resolve(), args.output / f"{source.stem}-frames.json", 90)
            parse_seconds = time.perf_counter() - parse_start
            analysis_start = time.perf_counter()
            diagnostics = {}
            findings, seconds = analyse(data, source.stem, diagnostics)
            analysis_seconds = time.perf_counter() - analysis_start
            memory = tracemalloc.get_traced_memory()[1] / 1024**2 if args.profile_memory else None
            if args.profile_memory:
                tracemalloc.stop()
            summary = {
                "playlist": data["metadata"].get("classification", {}).get("format"),
                "parse_seconds": parse_seconds,
                "analysis_seconds": analysis_seconds,
                "python_peak_mib": memory,
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
            summaries.append(
                {
                    k: summary[k]
                    for k in (
                        "file",
                        "playlist",
                        "frames",
                        "duration",
                        "counts",
                        "parse_seconds",
                        "analysis_seconds",
                        "python_peak_mib",
                    )
                }
            )
            print(json.dumps(summaries[-1]), flush=True)
        except Exception as error:
            if args.profile_memory:
                tracemalloc.stop()
            summaries.append({"file": source.name, "error": str(error)})
            print(json.dumps(summaries[-1]), flush=True)
    (args.output / "summary.json").write_text(json.dumps(summaries, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
