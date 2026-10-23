"""Suggested areas, never a claimed physically achievable counterfactual path."""


def propose(frame: dict, player: dict, category: str) -> tuple[dict | None, str]:
    ball = frame.get("ball")
    actor = frame["players"].get(player["id"])
    own = -1 if player["team"] == 0 else 1
    supported = {
        "potential_exposed_goal",
        "duel_goal_exposure",
        "duel_cover_advance",
        "duel_recovery_drift",
        "doubles_second_man_advance",
        "doubles_uncovered_recovery",
        "standard_third_man_advance",
        "standard_central_coverage_gap",
    }
    if (
        category not in supported
        or not ball
        or not actor
        or not ball.get("velocity")
        or own * ball["velocity"]["y"] < 600
        or actor["position"]["z"] > 100
        or ball["position"]["z"] > 300
    ):
        return None, "No supported positioning area: review the observation without a route."
    return {
        "x": max(-800, min(800, ball["position"]["x"] * 0.5)),
        "y": own * min(4500, max(1200, own * ball["position"]["y"] + 900)),
        "z": 20,
    }, (
        "A central goal-side area relative to the recorded low goalward ball. The arrow is a "
        "schematic direction, not a simulated route, arrival time or guaranteed save."
    )
