"""Versioned transport adapter for subtr-actor-py 1.5.1. Native RL units, Z up."""

import hashlib
import json
import math
from typing import Any

PARSER_VERSION = "subtr-actor-py/1.5.1"


def player_key(remote_id: Any) -> str:
    return hashlib.sha256(json.dumps(remote_id, sort_keys=True).encode()).hexdigest()[:24]


def actor(frame: Any) -> dict | None:
    if not isinstance(frame, dict) or "Data" not in frame:
        return None
    data = frame["Data"]
    body = data.get("rigid_body")
    if not body:
        return None
    p = body["location"]
    q = body["rotation"]
    if not all(math.isfinite(float(v)) for v in [*p.values(), *q.values()]):
        raise ValueError("Non-finite replay coordinates")
    return {
        "position": p,
        "rotation": q,
        "velocity": body.get("linear_velocity"),
        "boost": min(100, max(0, data["boost_amount"] * 100 / 255))
        if data.get("boost_amount") is not None
        else None,
    }


def normalize(raw: dict, names: list[str], game_type: str) -> dict:
    if game_type != "TAGame.Replay_Soccar_TA":
        raise ValueError("Only Soccar replays are supported")
    meta = raw["meta"]
    headers = dict(meta["all_headers"])
    frame_data = raw["frame_data"]
    timestamps = frame_data["metadata_frames"]
    if not 2 <= len(timestamps) <= 108_000:
        raise ValueError("Unsupported frame count")
    origin = float(timestamps[0]["time"])
    duration = float(timestamps[-1]["time"]) - origin
    if not 0 < duration <= 1800:
        raise ValueError("Unsupported replay duration")
    players = []
    for team, key in enumerate(("team_zero", "team_one")):
        for player in meta[key]:
            stats = player.get("stats") or {}
            players.append(
                {
                    "id": player_key(player["remote_id"]),
                    "name": player["name"],
                    "team": team,
                    "stats": {
                        k.lower(): stats.get(k)
                        for k in ("Goals", "Assists", "Saves", "Shots", "Score")
                    },
                }
            )
    if not 1 <= len(players) <= 8 or headers.get("TeamSize", 0) > 4:
        raise ValueError("Unsupported team size")
    tracks = {player_key(k): v["frames"] for k, v in frame_data["players"]}
    ball_track = frame_data["ball_data"]["frames"]
    if len(ball_track) != len(timestamps) or any(
        len(v) != len(timestamps) for v in tracks.values()
    ):
        raise ValueError("Inconsistent replay tracks")
    frames = []
    previous = -1.0
    for i, metadata in enumerate(timestamps):
        time = float(metadata["time"]) - origin
        if time < previous or not math.isfinite(time):
            raise ValueError("Non-monotonic replay timestamps")
        previous = time
        state_index = metadata.get("replicated_game_state_name")
        state = (
            names[state_index]
            if isinstance(state_index, int) and 0 <= state_index < len(names)
            else "Unknown"
        )
        frames.append(
            {
                "time": time,
                "source_time": metadata["time"],
                "seconds_remaining": metadata.get("seconds_remaining"),
                "state": state,
                "ball": actor(ball_track[i]),
                "players": {
                    p["id"]: actor(tracks[p["id"]][i]) if p["id"] in tracks else None
                    for p in players
                },
            }
        )
    if not any(f["ball"] for f in frames):
        raise ValueError("Replay has no ball network data")
    goals = [
        {
            "time": max(0, g["time"] - origin),
            "team": 0 if g["scoring_team_is_team_0"] else 1,
            "score": [g["team_zero_score"], g["team_one_score"]],
        }
        for g in raw.get("goal_events", [])
    ]
    return {
        "schema_version": 1,
        "parser_version": PARSER_VERSION,
        "metadata": {
            "title": headers.get("ReplayName") or "Rocket League replay",
            "map": headers.get("MapName"),
            "date": headers.get("Date"),
            "score": [headers.get("Team0Score"), headers.get("Team1Score")],
            "duration": duration,
            "source_time_offset": origin,
            "frame_count": len(frames),
            "players": players,
            "goals": goals,
            "game_type": meta.get("game_type"),
        },
        "frames": frames,
    }
