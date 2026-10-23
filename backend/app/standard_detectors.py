"""Standard uses the third player's coverage, not a two-player team assumption."""

from app.sequence_detectors import LastCoverAdvance, SequenceDetector, reject


class ThirdManAdvance(LastCoverAdvance):
    mode = "3v3"
    role = "third_man"
    category = "standard_third_man_advance"


class CentralCoverageGap(SequenceDetector):
    mode = "3v3"
    category = "standard_central_coverage_gap"
    sustain = 1.2

    def evaluate_window(self, state, history, player_id, stats=None):
        context = self.context(state, history, player_id, stats)
        if not context:
            return None
        before, subject, actor, prior, own, pressure = context
        members = [p for p in state.players.values() if p.team == subject.team]
        if subject.role != "third_man" or len(members) != 3:
            return reject(stats, "not_clear_third_man")
        ball = state.ball
        if abs(ball["position"]["x"]) > 800 or any(
            not p.recorded
            or abs(p.recorded["position"]["x"]) < 1800
            or not p.features["low_chassis"]
            for p in members
        ):
            return reject(stats, "central_defender_or_aerial_coverage_uncertain")
        projection_s = (own * 5120 - ball["position"]["y"]) / ball["velocity"]["y"]
        if abs(ball["position"]["x"] + ball["velocity"]["x"] * projection_s) > 800:
            return reject(stats, "ball_projection_outside_central_goal")
        # Require all three to have remained wide in the prior second as well.
        if any(abs(before["players"][p.id]["position"]["x"]) < 1800 for p in members):
            return reject(stats, "central_lane_only_recently_vacated")
        return self.result(
            state,
            before,
            player_id,
            {
                "wide_team_players": 3,
                "minimum_lateral_distance_uu": min(
                    abs(p.recorded["position"]["x"]) for p in members if p.recorded
                ),
                "opponent_ball_distance_uu": pressure,
                "inferred_role": "third_man",
            },
            "Three wide positions leave the central lane open",
            "All three low-chassis team positions remained wide while a central ball moved "
            "goalward near an opponent. The deepest player is shown without assigning blame. "
            "A straight-line ball projection crosses the goal mouth; bounces are not predicted.",
            "Review whether the deepest player could protect a more central lane while the "
            "other two cover wide pressure. Momentum and aerial coverage may change this choice.",
        )
