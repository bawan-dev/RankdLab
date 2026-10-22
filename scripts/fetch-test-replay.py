"""Download an upstream genuine replay for local/CI compatibility tests only."""

import argparse
import hashlib
from pathlib import Path
from urllib.request import urlopen

COMMIT = "ea9f34d5f9d6a20fff5fd73768c04975c3f5b7e4"
FIXTURES = [
    (
        "genuine-doubles.replay",
        "recent-ranked-doubles-2026-03-10.replay",
        "215a4e006a25d263836742b4adc0762514f96103ba4fa00e582803e8ecfda915",
    ),
    (
        "season24-standard.replay",
        "replay-format-2026-09-18-v868-34-net12-season24-standard.replay",
        "77db223c48626fe05b4a2e22269eb4720e6e383f31f6c27dd7e8d841a14d7b38",
    ),
    (
        "genuine-duel.replay",
        "post-eac-ranked-duel-2026-04-28-a.replay",
        "e23fec480fbe19ab3d5ada41aac554f1d444506fdf204b92a329fff70e152b83",
    ),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--all",
        action="store_true",
        help="Include standard and duel compatibility fixtures",
    )
    args = parser.parse_args()
    for filename, source, expected in FIXTURES if args.all else FIXTURES[:1]:
        target = Path(__file__).resolve().parents[1] / ".research" / filename
        target.parent.mkdir(exist_ok=True)
        if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() == expected:
            print(f"Verified existing genuine fixture: {target}")
            continue
        url = f"https://raw.githubusercontent.com/rlrml/subtr-actor/{COMMIT}/assets/{source}"
        with urlopen(url, timeout=30) as response:
            data = response.read(3 * 1024**2)
        if hashlib.sha256(data).hexdigest() != expected:
            raise ValueError("Replay fixture checksum mismatch")
        target.write_bytes(data)
        print(f"Downloaded verified genuine fixture: {target}")


if __name__ == "__main__":
    main()
