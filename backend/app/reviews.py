"""Owner reviews, separate from detector facts and subjective usefulness ratings."""

import hashlib
import json
from typing import Literal

from fastapi import Depends, HTTPException, Response
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import func, select

from app.analysis import PLAYLIST_DETECTORS
from app.database import Replay, TacticalReview, uid
from app.evaluation import VERSION, evaluate
from app.playlists import replay_format
from app.tactical import interpret

CATEGORIES = {d.category for detectors in PLAYLIST_DETECTORS.values() for d in detectors}


class SuggestedPoint(BaseModel):
    x: float = Field(ge=-4096, le=4096, allow_inf_nan=False)
    y: float = Field(ge=-5120, le=5120, allow_inf_nan=False)
    z: float = Field(default=20, ge=0, le=2000, allow_inf_nan=False)


class ReviewInput(BaseModel):
    player_id: str
    start: float = Field(ge=0, allow_inf_nan=False)
    end: float = Field(ge=0, allow_inf_nan=False)
    category: str
    label: Literal["confirmed_issue", "reasonable_decision", "uncertain"]
    explanation: str = Field(min_length=1, max_length=1500)
    finding_id: str | None = None
    target: SuggestedPoint | None = None

    @model_validator(mode="after")
    def valid_window(self):
        if self.end < self.start or self.end - self.start > 30:
            raise ValueError("Choose an ordered review window of up to 30 seconds")
        if self.category not in CATEGORIES:
            raise ValueError("Choose a supported coaching category")
        return self


def review_dict(review):
    return {"id": review.id, "created_at": review.created_at, **review.data}


def export_records(db, user_id):
    records = []
    for replay in db.scalars(
        select(Replay).where(Replay.user_id == user_id, Replay.status == "ready")
    ):
        reference = hashlib.sha256(replay.id.encode()).hexdigest()[:24]
        common = {
            "schema_version": VERSION,
            "replay_ref": reference,
            "playlist": replay_format(replay),
            "analysis_version": replay.engine_version,
        }
        records.append(
            {
                **common,
                "record_type": "match",
                "active_seconds": replay.metadata_json.get("active_seconds", 0),
            }
        )
        records.extend(
            {
                **common,
                "record_type": "finding",
                "id": f["id"],
                "player_ref": f["player_id"],
                "category": f["category"],
                "time": f["time"],
                "detector_version": f["detector_version"],
            }
            for f in replay.findings
            if f["source"] == "rule"
        )
        records.extend(
            {**common, "record_type": "review", **r.data, "player_ref": r.data["player_id"]}
            for r in db.scalars(
                select(TacticalReview)
                .where(TacticalReview.replay_id == replay.id)
                .order_by(TacticalReview.created_at)
            )
        )
    return records


def register_routes(app, current_user, database, owned, config):
    @app.post("/api/replays/{replay_id}/reviews", status_code=201)
    def save_review(
        replay_id: str, payload: ReviewInput, user=Depends(current_user), db=Depends(database)
    ):
        replay = owned(replay_id, user, db)
        if replay.status != "ready" or payload.end > replay.metadata_json.get("duration", 0):
            raise HTTPException(422, "Choose a ready replay and a recorded review window")
        if payload.player_id not in {p["id"] for p in replay.metadata_json["players"]}:
            raise HTTPException(422, "Choose a player from this replay")
        if (
            db.scalar(
                select(func.count())
                .select_from(TacticalReview)
                .where(TacticalReview.replay_id == replay.id)
            )
            or 0
        ) >= 500:
            raise HTTPException(422, "Review limit reached for this replay")
        finding = next((f for f in replay.findings if f["id"] == payload.finding_id), None)
        if payload.finding_id and (
            not finding
            or finding["player_id"] != payload.player_id
            or finding["category"] != payload.category
            or not payload.start <= finding["time"] <= payload.end
        ):
            raise HTTPException(
                422, "Finding must match the review player, category and time window"
            )
        data = json.loads(
            (config.data_dir / "replays" / replay.id / "frames.json").read_text(encoding="utf-8")
        )
        frame = min(data["frames"], key=lambda f: abs(f["time"] - payload.end))
        if abs(frame["time"] - payload.end) > 0.25 or not frame["players"].get(payload.player_id):
            raise HTTPException(422, "No recorded player sample near this review timestamp")
        state = interpret(frame, replay.metadata_json, payload.player_id)
        review = TacticalReview(
            replay_id=replay.id,
            data={
                **payload.model_dump(),
                "features": state.players[payload.player_id].features,
                "feature_version": state.feature_version,
                "sample_time": state.time,
                "reviewer_qualification": "account_owner_not_expert_verified",
                "review_status": "owner_review",
                "detector_version": finding["detector_version"] if finding else None,
            },
        )
        db.add(review)
        if not payload.finding_id:
            if len(replay.findings) >= 500:
                raise HTTPException(422, "Coaching moment limit reached")
            note = {
                "id": uid(),
                "replay_id": replay.id,
                "player_id": payload.player_id,
                "time": payload.end,
                "category": payload.category,
                "source": "manual",
                "title": "Owner review: " + payload.label.replace("_", " "),
                "explanation": payload.explanation,
                "alternative": "Review the recorded context.",
                "target": payload.target.model_dump() if payload.target else None,
                "alternative_basis": "Reviewer-proposed schematic area; no physical simulation.",
                "evidence": {"review_label": payload.label},
                "severity": "unrated",
                "detector_version": "owner-review-1",
                "reliability": "Account-owner judgement; not expert verified",
                "context_window": {"start": payload.start, "end": payload.end},
            }
            replay.findings = sorted([*replay.findings, note], key=lambda f: f["time"])
        db.commit()
        return review_dict(review)

    @app.get("/api/replays/{replay_id}/reviews")
    def reviews(replay_id: str, user=Depends(current_user), db=Depends(database)):
        replay = owned(replay_id, user, db)
        return [
            review_dict(r)
            for r in db.scalars(
                select(TacticalReview)
                .where(TacticalReview.replay_id == replay.id)
                .order_by(TacticalReview.created_at)
            )
        ]

    @app.get("/api/replays/{replay_id}/diagnostics")
    def diagnostics(replay_id: str, user=Depends(current_user), db=Depends(database)):
        replay = owned(replay_id, user, db)
        path = config.data_dir / "replays" / replay.id / "analysis-diagnostics.json"
        if not path.exists():
            raise HTTPException(404, "Diagnostics were not stored for this legacy replay")
        return json.loads(path.read_text(encoding="utf-8"))

    @app.get("/api/reviews/export")
    def export(user=Depends(current_user), db=Depends(database)):
        return Response(
            "\n".join(json.dumps(r) for r in export_records(db, user.id)),
            media_type="application/x-ndjson",
            headers={"Content-Disposition": 'attachment; filename="rankdlab-reviews.jsonl"'},
        )

    @app.get("/api/evaluation")
    def evaluation(user=Depends(current_user), db=Depends(database)):
        return evaluate(export_records(db, user.id))
