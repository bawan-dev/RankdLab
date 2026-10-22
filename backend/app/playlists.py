"""Roster format is not proof of a competitive matchmaking playlist."""

from collections import Counter


def classify(metadata: dict, headers: dict | None = None) -> dict:
    headers = headers or {}
    counts = Counter(p["team"] for p in metadata.get("players", []))
    size = counts.get(0, 0)
    balanced = size in (1, 2, 3) and counts.get(1, 0) == size and len(counts) == 2
    declared = headers.get("TeamSize", metadata.get("team_size"))
    consistent = declared is None or declared == size
    mode = f"{size}v{size}" if balanced and consistent else None
    return {
        "format": mode,
        "source": "roster_and_team_size" if declared else "roster",
        "team_counts": [counts.get(0, 0), counts.get(1, 0)],
        "match_type": headers.get("MatchType", metadata.get("match_type")),
        "playlist_metadata": headers.get("Playlist", metadata.get("playlist_metadata")),
        "ranked": None,
        "message": "Team format identified; ranked status is not established."
        if mode
        else "Uneven, incomplete or conflicting roster. Confirm a coaching format before analysis.",
    }


def replay_format(replay) -> str | None:
    return replay.metadata_json.get("classification", classify(replay.metadata_json)).get("format")


def needs_confirmation(replay) -> bool:
    mode = replay_format(replay)
    return mode is None or bool(replay.requested_playlist and replay.requested_playlist != mode)
