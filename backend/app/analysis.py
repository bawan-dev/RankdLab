"""Experimental geometry rules. Evidence is measured; interpretations are not labels.

Thresholds are hypotheses pending coach evaluation, not calibrated probabilities.
Only sustained Active Soccar situations are considered, with cooldowns and explicit
exceptions for kickoffs, missing actors and emergency goal-line defence.
"""

import hashlib
import math
from collections import Counter
from typing import Protocol

VERSION = "geometry-0.1.0"
RELIABILITY = "Experimental, uncalibrated heuristic; not evaluated by qualified coaches"


def distance(a: dict, b: dict) -> float:
    return math.dist([a[k] for k in ("x", "y", "z")], [b[k] for k in ("x", "y", "z")])


def closing_speed(actor: dict, ball: dict) -> float:
    velocity = actor.get("velocity")
    if not velocity:
        return 0
    delta = {k: ball["position"][k] - actor["position"][k] for k in ("x", "y", "z")}
    length = math.sqrt(sum(v * v for v in delta.values()))
    return sum(velocity[k] * delta[k] for k in delta) / max(1, length)


def retreat_target(position: dict, team: int) -> dict:
    own = -1 if team == 0 else 1
    return {
        "x": max(-2800, min(2800, position["x"] * 0.6)),
        "y": max(-4400, min(4400, position["y"] + own * 1800)),
        "z": 20,
    }


class Detector(Protocol):
    category: str
    sustain: float

    def evaluate(
        self, frame: dict, player: dict, teammates: list[dict], opponents: list[dict]
    ) -> dict | None: ...


class DoubleCommit:
    category = "potential_double_commit"
    sustain = 0.65

    def evaluate(self, frame, player, teammates, opponents):
        ball = frame["ball"]
        subject = frame["players"][player["id"]]
        bp, sp = ball["position"], subject["position"]
        own = -1 if player["team"] == 0 else 1
        # Immediate goal-line saves, wall plays and aerial handoffs need context
        # this geometry-only rule cannot provide. Exclude them.
        if own * bp["y"] > 3300 or abs(bp["x"]) > 3300 or bp["z"] > 400 or sp["z"] > 250:
            return None
        if distance(sp, bp) > 1200 or closing_speed(subject, ball) < 650:
            return None
        for teammate in teammates:
            tp = teammate["position"]
            length = max(1, distance(sp, bp) * distance(tp, bp))
            dot = sum((sp[k] - bp[k]) * (tp[k] - bp[k]) for k in ("x", "y", "z")) / length
            if (
                tp["z"] < 250
                and distance(tp, bp) < 1200
                and closing_speed(teammate, ball) > 650
                and dot > 0.65
            ):
                covering = any(
                    other is not teammate
                    and own * other["position"]["y"] > max(own * sp["y"], own * tp["y"]) + 1000
                    for other in teammates
                )
                if covering:
                    continue
                return {
                    "title": "Two players, one challenge",
                    "severity": "moderate",
                    "explanation": (
                        "You and a teammate were both moving quickly toward the ball from "
                        "a similar side, with no deeper teammate visible. This may commit "
                        "two players to one challenge and reduce defensive coverage."
                    ),
                    "alternative": (
                        "Consider slowing your approach and keeping a deeper supporting "
                        "position while your teammate challenges. Reassess if their "
                        "challenge fails."
                    ),
                    "evidence": {
                        "player_ball_distance_uu": distance(sp, bp),
                        "teammate_ball_distance_uu": distance(tp, bp),
                        "player_closing_speed_uu_s": closing_speed(subject, ball),
                        "teammate_closing_speed_uu_s": closing_speed(teammate, ball),
                        "approach_direction_dot": dot,
                    },
                }
        return None


class DefensiveBunching:
    category = "defensive_bunching"
    sustain = 1.2

    def evaluate(self, frame, player, teammates, opponents):
        bp = frame["ball"]["position"]
        sp = frame["players"][player["id"]]["position"]
        own = -1 if player["team"] == 0 else 1
        if not 500 < own * bp["y"] < 3000 or distance(sp, bp) < 1800 or sp["z"] > 200:
            return None
        if not opponents or min(distance(o["position"], bp) for o in opponents) > 1000:
            return None
        near = [
            t
            for t in teammates
            if t["position"]["z"] < 200
            and distance(t["position"], sp) < 450
            and distance(t["position"], bp) > 1600
        ]
        if near:
            return {
                "title": "Defensive space is getting narrow",
                "severity": "low",
                "explanation": (
                    "You stayed close to a teammate away from the ball while an opponent "
                    "was near the ball in your half. This may leave both defenders "
                    "covering similar space."
                ),
                "alternative": (
                    "Consider spreading into a separate supporting lane while staying "
                    "goal-side. Check your teammate’s movement before changing position."
                ),
                "evidence": {
                    "teammate_separation_uu": min(distance(t["position"], sp) for t in near),
                    "player_ball_distance_uu": distance(sp, bp),
                    "nearest_opponent_ball_distance_uu": min(
                        distance(o["position"], bp) for o in opponents
                    ),
                },
            }
        return None


class ExposedGoal:
    category = "potential_exposed_goal"
    sustain = 0.9

    def evaluate(self, frame, player, teammates, opponents):
        ball = frame["ball"]
        bp = ball["position"]
        sp = frame["players"][player["id"]]["position"]
        own = -1 if player["team"] == 0 else 1
        velocity = ball.get("velocity")
        if (
            not velocity
            or own * velocity["y"] < 900
            or not 500 < own * bp["y"] < 3500
            or abs(bp["x"]) > 2200
        ):
            return None
        actors = [frame["players"][player["id"]], *teammates]
        if any(own * a["position"]["y"] >= own * bp["y"] - 600 for a in actors):
            return None
        # Assign this team-level situation only to the deepest visible player.
        if any(own * t["position"]["y"] > own * sp["y"] for t in teammates):
            return None
        if not opponents or min(distance(o["position"], bp) for o in opponents) > 1600:
            return None
        return {
            "title": "The ball is behind your defensive line",
            "severity": "high",
            "explanation": (
                "The ball was moving toward your goal with every visible teammate farther "
                "upfield. An opponent was near the ball. This geometry suggests limited "
                "immediate defensive coverage; it does not establish who caused the "
                "situation."
            ),
            "alternative": (
                "Consider recovering toward a goal-side position and protecting the "
                "central shooting lane. The best route depends on your momentum and the "
                "opponent’s next touch."
            ),
            "evidence": {
                "ball_goalward_velocity_uu_s": own * velocity["y"],
                "last_defender_gap_uu": own * (bp["y"] - sp["y"]),
                "nearest_opponent_ball_distance_uu": min(
                    distance(o["position"], bp) for o in opponents
                ),
            },
        }


DETECTORS: list[Detector] = [DoubleCommit(), DefensiveBunching(), ExposedGoal()]


def analyse(data: dict, replay_id: str) -> tuple[list[dict], float]:
    players = data["metadata"]["players"]
    findings = []
    starts: dict[tuple[str, str], float] = {}
    cooldowns: dict[tuple[str, str], float] = {}
    previous = None
    active_since = None
    active_seconds = 0.0
    last_sample = -1.0
    for frame in data["frames"]:
        time = frame["time"]
        if frame["state"] != "Active":
            starts.clear()
            active_since = None
            previous = None
            continue
        if previous is not None and 0 <= time - previous < 0.25:
            active_seconds += time - previous
        previous = time
        if active_since is None:
            active_since = time
        if time - active_since < 4 or time - last_sample < 0.18:
            continue
        last_sample = time
        if not frame["ball"] or any(not frame["players"].get(p["id"]) for p in players):
            starts.clear()
            continue
        for player in players:
            teammates = [
                frame["players"][p["id"]]
                for p in players
                if p["id"] != player["id"] and p["team"] == player["team"]
            ]
            opponents = [frame["players"][p["id"]] for p in players if p["team"] != player["team"]]
            if not teammates:
                continue
            for detector in DETECTORS:
                key = player["id"], detector.category
                result = detector.evaluate(frame, player, teammates, opponents)
                if not result:
                    starts.pop(key, None)
                    continue
                starts.setdefault(key, time)
                if time - starts[key] < detector.sustain or time - cooldowns.get(key, -100) < 12:
                    continue
                event_id = hashlib.sha256(
                    f"{replay_id}:{key}:{time:.4f}:{VERSION}".encode()
                ).hexdigest()[:32]
                result["evidence"]["sustained_seconds"] = time - starts[key]
                findings.append(
                    {
                        **result,
                        "id": event_id,
                        "replay_id": replay_id,
                        "player_id": player["id"],
                        "time": time,
                        "category": detector.category,
                        "source": "rule",
                        "reliability": RELIABILITY,
                        "detector_version": VERSION,
                        "target": retreat_target(
                            frame["players"][player["id"]]["position"], player["team"]
                        ),
                    }
                )
                cooldowns[key] = time
    return sorted(findings, key=lambda f: f["time"]), active_seconds


def priorities(findings: list[dict]) -> tuple[str | None, list[str]]:
    counts = Counter(f["category"] for f in findings if f["source"] == "rule")
    suggestions = {
        "potential_double_commit": (
            "Review who challenges first and who keeps a deeper supporting position."
        ),
        "defensive_bunching": (
            "Review how you and your teammate divide defensive lanes under pressure."
        ),
        "potential_exposed_goal": (
            "Review recovery routes when the ball passes your defensive line."
        ),
    }
    return (
        counts.most_common(1)[0][0] if counts else None,
        [suggestions[k] for k, _ in counts.most_common(3)]
        or [
            (
                "Review your match in context. Current rules found no qualifying "
                "situations; detector coverage is limited."
            )
        ],
    )
