"""Conservative temporal candidates; rank-independent and pending expert evaluation."""

from app.tactical import TacticalState, TemporalWindow, distance


def reject(stats, reason):
    if stats is not None:
        stats[reason] += 1
    return None


class SequenceDetector:
    version = "sequence-1"
    sustain = 0.7
    lookback = 1.0
    category = "sequence_candidate"
    mode = "1v1"

    def evaluate(self, frame, player, teammates, opponents, diagnostics=None):
        raise RuntimeError("Sequence detectors require continuous temporal evidence")

    def context(self, state: TacticalState, history: TemporalWindow, player_id: str, stats):
        before = history.before(self.lookback)
        subject = state.players[player_id]
        if state.playlist != self.mode or before is None:
            return reject(stats, "wrong_mode_or_insufficient_continuous_history")
        actor = subject.recorded
        prior = before["players"].get(player_id)
        if not actor or not prior or not actor.get("velocity") or not prior.get("velocity"):
            return reject(stats, "missing_player_velocity")
        if any(
            not f["players"][player_id].get("velocity")
            for f in history.frames
            if f["time"] >= before["time"]
        ):
            return reject(stats, "velocity_gap_in_window")
        ball = state.ball
        if not ball or not ball.get("velocity"):
            return reject(stats, "missing_ball_velocity")
        if (
            actor["position"]["z"] > 100
            or prior["position"]["z"] > 100
            or (ball["position"]["z"] > 300 or abs(ball["position"]["x"]) > 1800)
        ):
            return reject(stats, "aerial_wall_or_wide_ball_context")
        own = -1 if subject.team == 0 else 1
        opponents = [p for p in state.players.values() if p.team != subject.team]
        if not opponents or any(not p.recorded for p in state.players.values()):
            return reject(stats, "incomplete_roster")
        pressure = min(
            distance(p.recorded["position"], ball["position"]) for p in opponents if p.recorded
        )
        depth = own * ball["position"]["y"]
        if not 500 < depth < 3000 or own * ball["velocity"]["y"] < 600 or pressure > 1000:
            return reject(stats, "no_central_defensive_threat_under_pressure")
        return before, subject, actor, prior, own, pressure

    def result(self, state, before, player_id, evidence, title, observation, alternative):
        return {
            "title": title,
            "severity": "moderate",
            "explanation": observation,
            "alternative": alternative,
            "evidence": evidence,
            "context_window": {"start": before["time"], "end": state.time},
            "involved_player_ids": list(state.players),
            "uncertainty": "Depth-based roles and observed movement do not establish intent, "
            "touch quality, blame or a physically successful recovery.",
        }


class LastCoverAdvance(SequenceDetector):
    category = "duel_cover_advance"
    role = "sole_defender"
    lookback = 2.0

    def evaluate_window(self, state, history, player_id, stats=None):
        context = self.context(state, history, player_id, stats)
        if not context:
            return None
        before, subject, actor, prior, own, pressure = context
        bp = state.ball["position"]
        old_ball = before["ball"]["position"]
        teammates = [
            p for p in state.players.values() if p.team == subject.team and p.id != player_id
        ]
        if any(
            own * before["players"][p.id]["position"]["y"] + 600 >= own * prior["position"]["y"]
            for p in teammates
        ):
            return reject(stats, "not_previously_clear_last_cover")
        if subject.role != self.role:
            return reject(stats, "uncertain_or_changed_cover_role")
        advance = own * (prior["position"]["y"] - actor["position"]["y"])
        if (
            own * (prior["position"]["y"] - old_ball["y"]) < 1000
            or advance < 600
            or subject.features["goalward_speed_uu_s"] > -650
            or own * actor["position"]["y"] > own * bp["y"] + 500
        ):
            return reject(stats, "no_sustained_advance_out_of_cover")
        if any(p.features["goal_side"] for p in teammates):
            return reject(stats, "teammate_provides_goal_side_cover")
        return self.result(
            state,
            before,
            player_id,
            {
                "advance_uu": advance,
                "goalward_speed_uu_s": subject.features["goalward_speed_uu_s"],
                "opponent_ball_distance_uu": pressure,
                "inferred_role": subject.role,
            },
            "Advancing out of the last covering position",
            "You advanced from clear goal-side coverage toward a low ball moving into your "
            "half under opponent pressure. At the end of this sequence little depth remained. "
            "This may expose a counterattack; the replay geometry cannot establish intent.",
            "Consider delaying the approach and preserving a central goal-side lane until "
            "the opponent's next touch is clearer. A challenge may still be justified in context.",
        )


class RecoveryDrift(SequenceDetector):
    category = "duel_recovery_drift"

    def evaluate_window(self, state, history, player_id, stats=None):
        context = self.context(state, history, player_id, stats)
        if not context:
            return None
        before, subject, actor, prior, own, pressure = context
        teammates = [
            p for p in state.players.values() if p.team == subject.team and p.id != player_id
        ]
        goal = {"x": 0, "y": own * 5120, "z": 0}
        drift = distance(actor["position"], goal) - distance(prior["position"], goal)
        lateral = abs(actor["position"]["x"]) - abs(prior["position"]["x"])
        if (
            subject.features["defensive_gap_uu"] < 600
            or drift < 400
            or lateral < 600
            or subject.features["goalward_speed_uu_s"] > 0
        ):
            return reject(stats, "recovery_not_widening_and_losing_goal_distance")
        if any(p.features["goal_side"] for p in teammates):
            return reject(stats, "teammate_covers_recovery")
        return self.result(
            state,
            before,
            player_id,
            {
                "goal_distance_increase_uu": drift,
                "lateral_drift_uu": lateral,
                "defensive_gap_uu": subject.features["defensive_gap_uu"],
                "opponent_ball_distance_uu": pressure,
            },
            "Recovery is drifting away from the threatened goal",
            "While a low goalward ball was behind you under opponent pressure, your recorded "
            "route widened and increased your distance from goal for at least one second. "
            "This is a recovery risk cue, not proof that a save was possible.",
            "Review whether turning toward the central goal-side lane sooner was available. "
            "Turning radius, boost and the next touch can limit the options.",
        )
