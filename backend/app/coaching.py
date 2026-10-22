"""Presentation context is separate from detector physics and measured evidence."""

from collections import Counter

from sqlalchemy import select

from app.database import RankRecord, Replay, now
from app.playlists import replay_format
from app.profiles import rank_dict

VERSION = "coaching-context-1"


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
        "advanced"
        if name.startswith(("Champion", "Grand Champion", "Supersonic"))
        else "foundational"
        if name.startswith(("Bronze", "Silver", "Gold"))
        else "standard"
    )
    history: dict[str, Counter] = {}
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
            history.setdefault(replay.selected_player, Counter()).update(
                f["category"]
                for f in replay.findings
                if f["source"] == "rule" and f["player_id"] == replay.selected_player
            )
    return {
        "version": VERSION,
        "captured_at": now(),
        "playlist": playlist,
        "rank": rank,
        "presentation_level": level,
        "history_by_player": history,
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
                    "guidance": basic if level == "foundational" else advanced,
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
