"""Presentation context is separate from detector physics and measured evidence."""

from collections import Counter

from sqlalchemy import select

from app.database import Feedback, RankRecord, Replay, TacticalReview, now
from app.playlists import replay_format
from app.profiles import rank_dict

VERSION = "coaching-context-2"


def snapshot(db, user_id: str, playlist: str | None, replay_id: str) -> dict:
    record = db.scalar(
        select(RankRecord)
        .where(RankRecord.user_id == user_id, RankRecord.playlist == playlist)
        .order_by(RankRecord.created_at.desc())
        .limit(1)
    )
    rank = rank_dict(record) if record else None
    name = rank["rank"] if rank else "Unranked"
    level = (
        "expert"
        if name == "Supersonic Legend"
        else "advanced"
        if name.startswith(("Champion", "Grand Champion"))
        else "foundational"
        if name.startswith(("Bronze", "Silver", "Gold"))
        else "standard"
    )
    history: dict[str, Counter] = {}
    history_matches: dict[str, Counter] = {}
    matches = 0
    for replay in db.scalars(
        select(Replay).where(
            Replay.user_id == user_id,
            Replay.id != replay_id,
            Replay.status == "ready",
            Replay.selected_player.is_not(None),
        )
    ):
        if replay_format(replay) != playlist:
            continue
        matches += 1
        if replay.selected_player:
            disputed = {
                f.finding_id
                for f in db.scalars(
                    select(Feedback).where(
                        Feedback.replay_id == replay.id, Feedback.inaccurate.is_(True)
                    )
                )
            }
            decisions = {}
            for review in db.scalars(
                select(TacticalReview)
                .where(TacticalReview.replay_id == replay.id)
                .order_by(TacticalReview.created_at)
            ):
                if review.data.get("finding_id"):
                    decisions[review.data["finding_id"]] = review.data["label"]
            disputed.update(k for k, v in decisions.items() if v != "confirmed_issue")
            history_matches.setdefault(replay.selected_player, Counter()).update(
                {
                    f["category"]
                    for f in replay.findings
                    if f["source"] == "rule"
                    and f["player_id"] == replay.selected_player
                    and f["id"] not in disputed
                }
            )
            history.setdefault(replay.selected_player, Counter()).update(
                f["category"]
                for f in replay.findings
                if f["source"] == "rule"
                and f["player_id"] == replay.selected_player
                and f["id"] not in disputed
            )
    return {
        "version": VERSION,
        "captured_at": now(),
        "playlist": playlist,
        "rank": rank,
        "presentation_level": level,
        "history_by_player": history,
        "history_matches_by_player": history_matches,
        "rank_provided": rank is not None,
        "rank_source": "user-entered" if rank else None,
        "prior_matches": matches,
    }


GUIDANCE = {
    "potential_double_commit": (
        "Let one player approach the ball while the other stays behind to cover a lost challenge.",
        "Review the challenge order and the depth of your support. Compare the measured closing "
        "speeds with the available recovery lane; intent and communication are not observed.",
    ),
    "defensive_bunching": (
        "Cover a different lane from your teammate so one opponent cannot bypass both of you.",
        "Review whether the close spacing duplicated coverage under opponent pressure. "
        "Check the next challenge and the third player's position before choosing a wider lane.",
    ),
    "potential_exposed_goal": (
        "Goal-side means between the ball and your own goal. Review how to recover that position.",
        "Review the last-defender depth and the ball's goalward speed. Compare your recorded "
        "recovery momentum with the opponent's next touch before judging the challenge.",
    ),
    "duel_goal_exposure": (
        "Duel has no teammate behind you. Review how the ball got between you and your goal.",
        "Review the preceding challenge and your recovery while the ball crossed behind you. "
        "The straight-line goal projection is a geometric cue, not a simulated shot outcome.",
    ),
}


for category in (
    "duel_cover_advance",
    "duel_recovery_drift",
    "doubles_second_man_advance",
    "doubles_uncovered_recovery",
    "standard_third_man_advance",
    "standard_central_coverage_gap",
):
    GUIDANCE[category] = (
        "Keep a route back toward your goal. Review this sequence slowly and look for the ball, "
        "the opponent and any teammate covering behind you.",
        "Compare the prior coverage role with your recorded displacement and the opponent's "
        "pressure. Review whether delaying or narrowing the route preserved defensive coverage.",
    )


def training_plan(findings: list[dict], context: dict, player_id: str, excluded: set[str]) -> dict:
    eligible = [f for f in findings if f["source"] == "rule" and f["id"] not in excluded]
    counts = Counter(f["category"] for f in eligible)
    previous = context.get("history_by_player", {}).get(player_id, {})
    matches = context.get("history_matches_by_player", {}).get(player_id, {})
    repeated = [k for k in counts if matches.get(k, 0) >= 1 and counts[k] + previous.get(k, 0) >= 2]
    repeated.sort(key=lambda k: (matches[k], counts[k] + previous.get(k, 0)), reverse=True)
    limit = {"foundational": 1, "standard": 2, "advanced": 3, "expert": 3}.get(
        context.get("presentation_level", "standard"), 2
    )
    return {
        "status": "candidate_patterns" if repeated else "insufficient_repeated_evidence",
        "message": "Repeated flags are review hypotheses, not verified weaknesses."
        if repeated
        else "More matches or manual review are needed before naming a recurring weakness.",
        "objectives": [
            {
                "category": k,
                "observations": counts[k] + previous.get(k, 0),
                "matches": matches[k] + 1,
                "practice": "Review three examples at reduced speed. Identify "
                "the covering player and goal-side lane before the moment, then compare the "
                "recorded outcome. Write one cue to try next session.",
                "basis": "Automatic candidates across distinct matches; not expert validation.",
            }
            for k in repeated[:limit]
        ],
    }


def present(findings: list[dict], context: dict) -> list[dict]:
    result = []
    for finding in findings:
        if finding["source"] != "rule" or not context:
            result.append(finding)
            continue
        basic, advanced = GUIDANCE.get(
            finding["category"], (finding["alternative"], finding["alternative"])
        )
        level = context.get("presentation_level", "standard")
        prior = (
            context.get("history_by_player", {})
            .get(finding["player_id"], {})
            .get(finding["category"], 0)
        )
        result.append(
            {
                **finding,
                "coaching": {
                    "guidance": basic
                    if level == "foundational"
                    else (
                        "Consistency focus: "
                        + basic
                        + " Check the teammate/opponent context before acting."
                        if level == "standard"
                        else advanced
                        + (
                            " Compare tactical tradeoffs; the evidence cannot resolve "
                            "turning limits, communication or counterfactual outcomes."
                            if level == "expert"
                            else ""
                        )
                    ),
                    "presentation_level": level,
                    "rank": context.get("rank"),
                    "prior_category_findings": prior,
                    "playlist": context.get("playlist"),
                    "context_version": context.get("version"),
                    "note": "Self-reported rank changes explanation detail, not detection.",
                },
            }
        )
    return result
