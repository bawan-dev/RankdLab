"""Versioned interpretation of native Z-up replay evidence. No physics simulator."""

import math
from collections import deque
from dataclasses import asdict, dataclass, field

VERSION = "tactical-1"


def distance(a: dict, b: dict) -> float:
    return math.dist([a[k] for k in ("x", "y", "z")], [b[k] for k in ("x", "y", "z")])


def magnitude(v: dict | None) -> float | None:
    return math.sqrt(sum(v[k] ** 2 for k in ("x", "y", "z"))) if v else None


@dataclass
class PlayerState:
    id: str
    team: int
    recorded: dict | None
    features: dict
    role: str | None = None
    role_basis: str = "relative depth/distance only; intent and reachability unknown"


@dataclass
class TacticalState:
    time: float
    playlist: str | None
    selected_player: str | None
    active: bool
    clock: float | None
    overtime: bool | None
    score: list
    team_sizes: list[int]
    ball: dict | None
    players: dict[str, PlayerState]
    uncertainty: list[str]
    feature_version: str = VERSION
    recent_events: dict = field(default_factory=dict)

    def export(self) -> dict:
        return asdict(self)


def interpret(frame: dict, metadata: dict, selected_player: str | None = None) -> TacticalState:
    ball = frame.get("ball")
    bp = ball["position"] if ball else None
    players: dict[str, PlayerState] = {}
    roster = metadata["players"]
    for player in roster:
        pid, team = player["id"], player["team"]
        actor = frame["players"].get(pid)
        own = -1 if team == 0 else 1
        goal = {"x": 0, "y": own * 5120, "z": 0}
        f: dict = {"missing_actor": actor is None}
        if actor:
            p, v = actor["position"], actor.get("velocity")
            delta = {k: bp[k] - p[k] for k in ("x", "y", "z")} if bp else None
            d = distance(p, bp) if bp else None
            closing = (
                sum(v[k] * delta[k] for k in delta) / max(1, d)
                if v and delta and d is not None
                else None
            )
            speed = magnitude(v)
            bv = ball.get("velocity") if ball else None
            teammates = [
                frame["players"].get(t["id"])
                for t in roster
                if t["team"] == team and t["id"] != pid
            ]
            f.update(
                ball_distance_uu=d,
                goal_distance_uu=distance(p, goal),
                attacking_goal_distance_uu=distance(p, {**goal, "y": -own * 5120}),
                ball_goal_distance_uu=distance(bp, goal) if bp else None,
                own_depth_uu=own * p["y"],
                goal_side=own * p["y"] >= own * bp["y"] if bp else None,
                defensive_gap_uu=own * (bp["y"] - p["y"]) if bp else None,
                speed_uu_s=speed,
                closing_speed_uu_s=closing,
                approach_cosine=closing / speed if closing is not None and speed else None,
                relative_speed_uu_s=magnitude({k: v[k] - bv[k] for k in v}) if v and bv else None,
                goalward_speed_uu_s=own * v["y"] if v else None,
                ball_goalward_speed_uu_s=own * bv["y"] if bv else None,
                low_chassis=p["z"] < 100,
                grounded=None,
                demolished=None,
                recovering_toward_goal=own * v["y"] > 300 if v else None,
                teammate_separation_uu=min(distance(p, t["position"]) for t in teammates if t)
                if teammates and all(teammates)
                else None,
                # Optimistic lower bound to CURRENT ball point at maximum car speed.
                # It omits acceleration/turn/jump/ball motion; never used as arrival order.
                stationary_ball_travel_lower_bound_s=d / 2300 if d is not None else None,
                possession=None,
                boost_opportunity=None,
            )
        players[pid] = PlayerState(pid, team, actor, f)
    for team in (0, 1):
        members = [p for p in players.values() if p.team == team]
        if not members or not all(p.recorded for p in members) or not bp:
            continue
        order = sorted(members, key=lambda p: p.features["own_depth_uu"])
        if len(members) == 1:
            order[0].role = "sole_defender"
        elif all(
            order[i + 1].features["own_depth_uu"] - order[i].features["own_depth_uu"] > 300
            for i in range(len(order) - 1)
        ):
            for index, p in enumerate(order):
                p.role = ("first_man", "second_man", "third_man")[index]
    clock = frame.get("seconds_remaining")
    score = list(metadata.get("initial_score", [None, None]))
    for goal in metadata.get("goals", []):
        if goal["time"] > frame["time"]:
            break
        score = goal["score"]
    return TacticalState(
        frame["time"],
        metadata.get("classification", {}).get("format"),
        selected_player,
        frame["state"] == "Active",
        clock,
        frame.get("overtime", True if clock is not None and clock < 0 else None),
        score,
        [sum(p["team"] == t for p in roster) for t in (0, 1)],
        ball,
        players,
        [
            "Ground contact, current demolition state, possession and inputs are unavailable.",
            "Height is a chassis-height proxy, not grounded-state proof.",
            "Roles are provisional depth order, not prescribed tactical responsibilities.",
        ],
        recent_events={
            kind: [e for e in items if frame["time"] - 2 <= e["time"] <= frame["time"]]
            if items is not None
            else None
            for kind, items in metadata.get("events", {}).items()
        },
    )


class TemporalWindow:
    """Bounded raw evidence; checks EVERY frame, including unsampled interruptions."""

    def __init__(self, seconds: float = 5):
        self.seconds = seconds
        self.frames: deque[dict] = deque()
        self.reason: str | None = None

    def push(self, frame: dict, roster: list[dict]) -> bool:
        self.reason = None
        previous = self.frames[-1] if self.frames else None
        if (
            frame["state"] != "Active"
            or not frame.get("ball")
            or any(not frame["players"].get(p["id"]) for p in roster)
        ):
            self.frames.clear()
            self.reason = "inactive_or_missing_actor"
            return False
        if previous:
            dt = frame["time"] - previous["time"]
            if dt == 0:
                self.reason = "duplicate_timestamp"
                return False
            clock, old_clock = frame.get("seconds_remaining"), previous.get("seconds_remaining")
            actors = [(frame["ball"], previous["ball"])] + [
                (frame["players"][p["id"]], previous["players"][p["id"]]) for p in roster
            ]
            if (
                dt < 0
                or dt >= 0.25
                or any(distance(a["position"], b["position"]) > 1800 for a, b in actors)
                or (clock is not None and old_clock is not None and clock - old_clock > 5)
            ):
                self.frames.clear()
                self.reason = "gap_teleport_or_clock_reset"
        self.frames.append(frame)
        while self.frames and frame["time"] - self.frames[0]["time"] > self.seconds:
            self.frames.popleft()
        return True

    def before(self, seconds: float) -> dict | None:
        if not self.frames:
            return None
        target = self.frames[-1]["time"] - seconds
        return next((f for f in reversed(self.frames) if f["time"] <= target), None)
