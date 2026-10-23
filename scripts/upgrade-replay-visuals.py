"""Explicit local frame-cache upgrade; preserves DB reports, notes and review progress."""

import argparse
import json
import os
import shutil
import tempfile
import time
from pathlib import Path

from app.replay_visuals import add_visual_telemetry
from app.worker import run_parser


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, required=True)
    args = parser.parse_args()
    for source in sorted((args.data_dir / "replays").glob("*/source.replay")):
        target = source.with_name("frames.json")
        if not target.exists():
            continue
        original = json.loads(target.read_text(encoding="utf-8"))
        if original.get("adapter_version") == "native-actions-3":
            print(f"Already current: {target.parent.name}")
            continue
        with tempfile.TemporaryDirectory(prefix="visual-upgrade-", dir=target.parent) as temporary:
            staged = Path(temporary) / "frames.json"
            parsed = run_parser(source, staged, 90)
            upgraded = add_visual_telemetry(original, parsed)
            staged.write_text(
                json.dumps(upgraded, allow_nan=False, separators=(",", ":")), encoding="utf-8"
            )
            backup = target.with_name(f"frames.pre-actions-3.{time.time_ns()}.json")
            shutil.copy2(target, backup)
            os.replace(staged, target)
        print(f"Upgraded {target.parent.name}; previous cache saved as {backup.name}")


if __name__ == "__main__":
    main()
