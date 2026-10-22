"""Download an upstream genuine replay for local/CI compatibility tests only."""

import hashlib
from pathlib import Path
from urllib.request import urlopen

COMMIT = "ea9f34d5f9d6a20fff5fd73768c04975c3f5b7e4"
URL = f"https://raw.githubusercontent.com/rlrml/subtr-actor/{COMMIT}/assets/recent-ranked-doubles-2026-03-10.replay"
SHA256 = "215a4e006a25d263836742b4adc0762514f96103ba4fa00e582803e8ecfda915"


def main():
    target = Path(__file__).resolve().parents[1] / ".research" / "genuine-doubles.replay"
    target.parent.mkdir(exist_ok=True)
    if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() == SHA256:
        print(f"Verified existing genuine fixture: {target}")
        return
    with urlopen(URL, timeout=30) as response:
        data = response.read(3 * 1024**2)
    if hashlib.sha256(data).hexdigest() != SHA256:
        raise ValueError("Replay fixture checksum mismatch")
    target.write_bytes(data)
    print(f"Downloaded verified genuine fixture: {target}")


if __name__ == "__main__":
    main()
