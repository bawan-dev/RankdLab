"""Isolated entrypoint. Never import native replay code in the HTTP process."""

import json
import sys
from pathlib import Path


def main():
    if sys.platform != "win32":
        import resource  # type: ignore

        resource.setrlimit(resource.RLIMIT_AS, (2 * 1024**3, 2 * 1024**3))
        resource.setrlimit(resource.RLIMIT_CPU, (80, 80))
        resource.setrlimit(resource.RLIMIT_FSIZE, (160 * 1024**2, 160 * 1024**2))
    import subtr_actor

    from app.replay_adapter import normalize

    source, target = map(Path, sys.argv[1:3])
    parsed = subtr_actor.parse_replay(source.read_bytes())
    names, game_type = parsed["names"], parsed["game_type"]
    del parsed
    result = normalize(subtr_actor.get_replay_frames_data(str(source)), names, game_type)
    target.write_text(json.dumps(result, allow_nan=False, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    main()
