import json
import logging
import shutil
from collections import Counter
from contextlib import asynccontextmanager
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.responses import FileResponse, JSONResponse

from app.analysis import RELIABILITY, VERSION, analyse, priorities, retreat_target
from app.coaching import present, snapshot
from app.config import ROOT, Settings
from app.database import (
    Base,
    Feedback,
    LoginSession,
    RankRecord,
    Replay,
    ReviewLabel,
    RocketProfile,
    User,
    connect,
    now,
    uid,
)
from app.features import VERSION as FEATURE_VERSION
from app.features import extract_features
from app.middleware import RequestGuard
from app.playlists import classify, needs_confirmation, replay_format
from app.profiles import Playlist, RankInput, RocketProfileInput, rank_dict
from app.security import COOKIE, DUMMY_HASH, RateLimiter, new_token, passwords, token_hash
from app.worker import ReplayWorker


class Credentials(BaseModel):
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=12, max_length=128)


class Registration(Credentials):
    display_name: str = Field(min_length=1, max_length=60, pattern=r".*\S.*")


class ProfileUpdate(BaseModel):
    coaching_goal: str | None = Field(default=None, max_length=500)
    display_name: str | None = Field(default=None, min_length=1, max_length=60, pattern=r".*\S.*")


class SessionUpdate(BaseModel):
    player_id: str
    time: float = Field(default=0, ge=0, allow_inf_nan=False)
    reviewed_ids: list[str] = Field(default_factory=list, max_length=500)


class FeedbackInput(BaseModel):
    inaccurate: bool = True
    note: str = Field(default="", max_length=1000)


class ManualMoment(BaseModel):
    player_id: str
    time: float = Field(ge=0, allow_inf_nan=False)
    title: str = Field(min_length=1, max_length=100)
    explanation: str = Field(min_length=1, max_length=1500)
    alternative: str = Field(min_length=1, max_length=1000)


class LabelInput(BaseModel):
    player_id: str
    time: float = Field(ge=0, allow_inf_nan=False)
    category: Literal["potential_double_commit", "defensive_bunching", "potential_exposed_goal"]
    label: Literal[0, 1]


def user_dict(user: User):
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "coaching_goal": user.coaching_goal,
    }


def replay_dict(replay: Replay):
    return {
        "id": replay.id,
        "filename": replay.filename,
        "status": replay.status,
        "error": replay.error,
        "created_at": replay.created_at,
        "metadata": {
            **replay.metadata_json,
            "classification": replay.metadata_json.get(
                "classification", classify(replay.metadata_json)
            ),
        },
        "findings": present(replay.findings, replay.coaching_context),
        "selected_player": replay.selected_player,
        "session_time": replay.session_time,
        "reviewed_ids": replay.reviewed_ids,
        "engine_version": replay.engine_version,
        "coaching_context": replay.coaching_context,
        "requested_playlist": replay.requested_playlist,
        "mode_confirmation_required": replay.status == "ready" and needs_confirmation(replay),
    }


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings or Settings()
    config.data_dir = config.data_dir.resolve()
    config.data_dir.mkdir(parents=True, exist_ok=True)
    engine, sessions = connect(config.database_url)
    limiter = RateLimiter()

    @asynccontextmanager
    async def lifespan(application):
        if config.environment == "test":
            Base.metadata.create_all(engine)
        elif config.environment == "development":
            from alembic import command
            from alembic.config import Config

            alembic = Config(str(ROOT / "backend" / "alembic.ini"))
            alembic.set_main_option("script_location", str(ROOT / "backend" / "migrations"))
            with engine.begin() as connection:
                alembic.attributes["connection"] = connection
                command.upgrade(alembic, "head")
        else:
            from alembic.config import Config
            from alembic.script import ScriptDirectory

            alembic = Config(str(ROOT / "backend" / "alembic.ini"))
            alembic.set_main_option("script_location", str(ROOT / "backend" / "migrations"))
            expected = ScriptDirectory.from_config(alembic).get_current_head()
            with engine.connect() as connection:
                actual = connection.execute(
                    text("SELECT version_num FROM alembic_version")
                ).scalar()
            if actual != expected:
                raise RuntimeError("Database migration required before starting the API")
        worker = ReplayWorker(sessions, config)
        application.state.worker = worker
        if config.start_worker:
            worker.start()
        yield
        if config.start_worker:
            worker.stop()
        engine.dispose()

    application = FastAPI(title="RankdLab", version="0.1.0", lifespan=lifespan)
    application.state.sessions = sessions
    application.state.settings = config
    application.add_middleware(TrustedHostMiddleware, allowed_hosts=config.hosts)
    application.add_middleware(GZipMiddleware, minimum_size=1000)
    application.add_middleware(
        RequestGuard, origins=config.origins, max_bytes=(config.max_upload_mb + 1) * 1024**2
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=config.origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Content-Type", "X-Requested-With"],
    )

    @application.exception_handler(Exception)
    async def safe_error(request: Request, error: Exception):
        logging.getLogger("rankdlab.api").exception("unhandled_request_error", exc_info=error)
        return JSONResponse({"detail": "An unexpected error occurred. Please try again."}, 500)

    def database():
        with sessions() as db:
            yield db

    Db = Annotated[Session, Depends(database)]

    def current_user(request: Request, db: Session = Depends(database)) -> User:
        token = request.cookies.get(COOKIE, "")
        session = db.get(LoginSession, token_hash(token)) if token else None
        if not session or session.expires_at <= now():
            raise HTTPException(401, "Please sign in")
        user = db.get(User, session.user_id)
        if not user:
            raise HTTPException(401, "Please sign in")
        return user

    Owner = Annotated[User, Depends(current_user)]

    def owned(replay_id: str, user: User, db: Session) -> Replay:
        replay = db.get(Replay, replay_id)
        if not replay or replay.user_id != user.id:
            raise HTTPException(404, "Replay not found")
        return replay

    def issue_session(user: User, db: Session, response: Response):
        db.execute(delete(LoginSession).where(LoginSession.expires_at < now()))
        token = new_token()
        db.add(
            LoginSession(
                token_hash=token_hash(token), user_id=user.id, expires_at=now() + 7 * 86400
            )
        )
        db.commit()
        response.set_cookie(
            COOKIE,
            token,
            max_age=7 * 86400,
            httponly=True,
            secure=config.secure_cookies,
            samesite="strict",
            path="/api",
        )

    @application.get("/api/health")
    def health(db: Db):
        db.execute(text("SELECT 1"))
        if config.start_worker and not application.state.worker.thread.is_alive():
            raise HTTPException(503, "Replay worker is unavailable")
        return {"status": "ok", "version": "0.1.0"}

    @application.post("/api/auth/register", status_code=201)
    def register(payload: Registration, request: Request, response: Response, db: Db):
        limiter.check(f"auth:{request.client.host if request.client else 'unknown'}", 20, 900)
        user = User(
            email=str(payload.email).lower(),
            display_name=payload.display_name.strip(),
            password_hash=passwords.hash(payload.password),
        )
        db.add(user)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(409, "Unable to register with these details") from None
        issue_session(user, db, response)
        return user_dict(user)

    @application.post("/api/auth/login")
    def login(payload: Credentials, request: Request, response: Response, db: Db):
        limiter.check(f"auth:{request.client.host if request.client else 'unknown'}", 20, 900)
        user = db.scalar(select(User).where(User.email == str(payload.email).lower()))
        valid = passwords.verify(payload.password, user.password_hash if user else DUMMY_HASH)
        if not user or not valid:
            raise HTTPException(401, "Email or password is incorrect")
        old = request.cookies.get(COOKIE)
        if old:
            db.execute(delete(LoginSession).where(LoginSession.token_hash == token_hash(old)))
        issue_session(user, db, response)
        return user_dict(user)

    @application.get("/api/auth/me")
    def me(user: Owner):
        return user_dict(user)

    @application.post("/api/auth/logout", status_code=204)
    def logout(request: Request, response: Response, db: Db):
        db.execute(
            delete(LoginSession).where(
                LoginSession.token_hash == token_hash(request.cookies.get(COOKIE, ""))
            )
        )
        db.commit()
        response.delete_cookie(COOKIE, path="/api")

    @application.put("/api/profile")
    def profile(payload: ProfileUpdate, user: Owner, db: Db):
        if payload.coaching_goal is not None:
            user.coaching_goal = payload.coaching_goal.strip()
        if payload.display_name is not None:
            user.display_name = payload.display_name.strip()
        db.commit()
        return user_dict(user)

    @application.get("/api/rocket-league/profile")
    def rocket_profile(user: Owner, db: Db):
        profile = db.get(RocketProfile, user.id)
        records = list(
            db.scalars(
                select(RankRecord)
                .where(RankRecord.user_id == user.id)
                .order_by(RankRecord.created_at.desc(), RankRecord.id.desc())
            )
        )
        ranks: dict = {}
        for record in records:
            ranks.setdefault(record.playlist, rank_dict(record))
        return {
            "display_name": profile.display_name if profile else "",
            "platform": profile.platform if profile else "",
            "onboarding_complete": profile.onboarding_complete if profile else False,
            "ranks": ranks,
            "history": [rank_dict(r) for r in records],
        }

    @application.put("/api/rocket-league/profile")
    def update_rocket_profile(payload: RocketProfileInput, user: Owner, db: Db):
        profile = db.get(RocketProfile, user.id) or RocketProfile(user_id=user.id)
        profile.display_name = payload.display_name.strip()
        profile.platform = payload.platform
        profile.onboarding_complete = payload.onboarding_complete
        db.add(profile)
        db.commit()
        return rocket_profile(user, db)

    @application.put("/api/rocket-league/ranks/{playlist}")
    def update_rank(playlist: Playlist, payload: RankInput, user: Owner, db: Db):
        record = RankRecord(user_id=user.id, playlist=playlist, **payload.model_dump())
        db.add(record)
        db.commit()
        return rank_dict(record)

    @application.get("/api/replays")
    def replays(user: Owner, db: Db):
        return [
            replay_dict(r)
            for r in db.scalars(
                select(Replay).where(Replay.user_id == user.id).order_by(Replay.created_at.desc())
            )
        ]

    @application.post("/api/replays", status_code=202)
    async def upload(
        user: Owner, db: Db, file: UploadFile = File(...), playlist: Playlist | None = None
    ):
        limiter.check(f"upload:{user.id}", 10, 3600)
        filename = file.filename or ""
        if (
            not filename.lower().endswith(".replay")
            or len(filename) > 180
            or any(c in filename for c in ("/", "\\", "\x00", ":"))
            or any(ord(c) < 32 for c in filename)
        ):
            raise HTTPException(422, "Choose a valid .replay filename (up to 180 characters)")
        if file.content_type not in ("application/octet-stream", "application/x-replay", ""):
            raise HTTPException(415, "Unsupported file type. Upload a binary .replay file")
        count = (
            db.scalar(select(func.count()).select_from(Replay).where(Replay.user_id == user.id))
            or 0
        )
        pending = (
            db.scalar(
                select(func.count())
                .select_from(Replay)
                .where(Replay.status.in_(["queued", "processing"]))
            )
            or 0
        )
        if count >= 50 or pending >= 20:
            raise HTTPException(
                429,
                "Replay storage or processing capacity reached. Delete old replays or try later.",
            )
        replay_id = uid()
        directory = config.data_dir / "replays" / replay_id
        directory.mkdir(parents=True)
        size = 0
        try:
            with (directory / "source.replay").open("wb") as target:
                while chunk := await file.read(1024 * 1024):
                    size += len(chunk)
                    if size > config.max_upload_mb * 1024**2:
                        raise HTTPException(413, f"Replay exceeds {config.max_upload_mb} MB limit")
                    target.write(chunk)
            if size < 64:
                raise HTTPException(422, "Replay is empty or too short to be valid")
            replay = Replay(
                id=replay_id, user_id=user.id, filename=filename, requested_playlist=playlist
            )
            db.add(replay)
            db.commit()
            return replay_dict(replay)
        except Exception:
            shutil.rmtree(directory, ignore_errors=True)
            raise
        finally:
            await file.close()

    @application.get("/api/replays/{replay_id}")
    def replay_detail(replay_id: str, user: Owner, db: Db):
        replay = owned(replay_id, user, db)
        result = replay_dict(replay)
        result["feedback"] = [
            {"finding_id": f.finding_id, "inaccurate": f.inaccurate, "note": f.note}
            for f in db.scalars(select(Feedback).where(Feedback.replay_id == replay.id))
        ]
        return result

    @application.get("/api/replays/{replay_id}/frames")
    def frames(replay_id: str, user: Owner, db: Db):
        replay = owned(replay_id, user, db)
        if replay.status != "ready":
            raise HTTPException(409, "Replay is not ready")
        return FileResponse(
            config.data_dir / "replays" / replay.id / "frames.json", media_type="application/json"
        )

    @application.put("/api/replays/{replay_id}/mode")
    def confirm_mode(replay_id: str, playlist: Playlist, user: Owner, db: Db):
        replay = owned(replay_id, user, db)
        if replay.status != "ready":
            raise HTTPException(409, "Wait for replay processing")
        detected = replay_format(replay)
        if detected and detected != playlist:
            raise HTTPException(422, f"Replay roster supports {detected}, not {playlist}")
        if not detected:
            metadata = {
                **replay.metadata_json,
                "classification": {
                    **classify(replay.metadata_json),
                    "format": playlist,
                    "source": "user-confirmed",
                    "ranked": None,
                    "message": "Coaching format confirmed by account owner; ranked status unknown.",
                },
            }
            replay.metadata_json = metadata
            data = json.loads(
                (config.data_dir / "replays" / replay.id / "frames.json").read_text(
                    encoding="utf-8"
                )
            )
            data["metadata"] = metadata
            diagnostics: dict = {}
            findings, seconds = analyse(data, replay.id, diagnostics)
            replay.findings = [f for f in replay.findings if f["source"] == "manual"] + findings
            replay.metadata_json = {**metadata, "active_seconds": seconds}
            replay.engine_version = VERSION
            replay.coaching_context = snapshot(db, user.id, playlist, replay.id)
            (config.data_dir / "replays" / replay.id / "analysis-diagnostics.json").write_text(
                json.dumps(diagnostics, indent=2), encoding="utf-8"
            )
        replay.requested_playlist = playlist
        db.commit()
        return replay_dict(replay)

    @application.put("/api/replays/{replay_id}/session")
    def save_session(replay_id: str, payload: SessionUpdate, user: Owner, db: Db):
        replay = owned(replay_id, user, db)
        if needs_confirmation(replay):
            raise HTTPException(409, "Confirm the replay coaching format first")
        if payload.player_id not in [p["id"] for p in replay.metadata_json.get("players", [])]:
            raise HTTPException(422, "Choose a player from this replay")
        if payload.time > replay.metadata_json.get("duration", 0):
            raise HTTPException(422, "Session time is outside this replay")
        allowed_ids = {f["id"] for f in replay.findings}
        if not set(payload.reviewed_ids).issubset(allowed_ids):
            raise HTTPException(422, "Unknown coaching moment")
        replay.selected_player = payload.player_id
        replay.session_time = payload.time
        replay.reviewed_ids = payload.reviewed_ids
        db.commit()
        return replay_dict(replay)

    @application.post("/api/replays/{replay_id}/moments", status_code=201)
    def manual_moment(replay_id: str, payload: ManualMoment, user: Owner, db: Db):
        replay = owned(replay_id, user, db)
        if replay.status != "ready":
            raise HTTPException(409, "Replay is not ready")
        player = next(
            (p for p in replay.metadata_json["players"] if p["id"] == payload.player_id), None
        )
        if not player or payload.time > replay.metadata_json["duration"]:
            raise HTTPException(422, "Choose a valid replay player and timestamp")
        if len(replay.findings) >= 500:
            raise HTTPException(422, "This replay has reached the review moment limit")
        data = json.loads(
            (config.data_dir / "replays" / replay.id / "frames.json").read_text(encoding="utf-8")
        )
        frame = min(data["frames"], key=lambda frame: abs(frame["time"] - payload.time))
        subject = frame["players"][player["id"]]
        if not subject:
            raise HTTPException(422, "Player has no recorded position at this timestamp")
        finding = {
            "id": uid(),
            "replay_id": replay.id,
            "player_id": player["id"],
            "time": payload.time,
            "title": payload.title,
            "explanation": payload.explanation,
            "alternative": payload.alternative,
            "source": "manual",
            "category": "review_note",
            "severity": "unrated",
            "reliability": "Manually authored by the account owner",
            "detector_version": "manual-1",
            "evidence": {
                "source": "Account owner review note",
                "source_time": frame["source_time"],
            },
            "target": retreat_target(subject["position"], player["team"]),
        }
        replay.findings = sorted([*replay.findings, finding], key=lambda f: f["time"])
        db.commit()
        return replay_dict(replay)

    @application.put("/api/replays/{replay_id}/findings/{finding_id}/feedback")
    def feedback(replay_id: str, finding_id: str, payload: FeedbackInput, user: Owner, db: Db):
        replay = owned(replay_id, user, db)
        if not any(f["id"] == finding_id for f in replay.findings):
            raise HTTPException(404, "Finding not found")
        item = db.scalar(
            select(Feedback).where(
                Feedback.replay_id == replay.id, Feedback.finding_id == finding_id
            )
        )
        if item is None:
            item = Feedback(replay_id=replay.id, finding_id=finding_id)
            db.add(item)
        item.inaccurate, item.note = payload.inaccurate, payload.note
        db.commit()
        return {"finding_id": item.finding_id, "inaccurate": item.inaccurate, "note": item.note}

    @application.get("/api/replays/{replay_id}/report")
    def report(replay_id: str, user: Owner, db: Db):
        replay = owned(replay_id, user, db)
        if replay.status != "ready" or not replay.selected_player:
            raise HTTPException(409, "Open the ready replay and select your player first")
        player = next(
            p for p in replay.metadata_json["players"] if p["id"] == replay.selected_player
        )
        findings = present(
            [f for f in replay.findings if f["player_id"] == replay.selected_player],
            replay.coaching_context,
        )
        common, recommendations = priorities(findings)
        team_supported = any(
            p["id"] != player["id"] and p["team"] == player["team"]
            for p in replay.metadata_json["players"]
        )
        coverage_message = (
            "Only three experimental team-positioning rules are checked. Zero flags does not "
            "mean mistake-free play; mechanics, boost routes and many tactical decisions "
            "are not assessed."
            if team_supported
            else "Automatic duel coaching is not supported: all current rules require a teammate. "
            "Zero flags here indicates a coverage gap, not an assessment of your decisions."
        )
        if replay.engine_version == VERSION:
            mode = replay_format(replay)
            coverage_message = (
                "Experimental duel exposure geometry only. Challenges, possession, boost decisions "
                "and mechanics are not assessed. Zero flags does not mean mistake-free play."
                if mode == "1v1"
                else "Three experimental team rules. Rotation intent, challenge sequencing, "
                "boost and mechanics are not assessed. Zero flags does not mean mistake-free play."
            )
        elif not team_supported:
            recommendations = [coverage_message]
        limit = {"foundational": 1, "standard": 2, "advanced": 3}.get(
            replay.coaching_context.get("presentation_level", "standard"), 3
        )
        recommendations = recommendations[:limit]
        return {
            "schema_version": 2,
            "coaching_context": replay.coaching_context,
            "replay_id": replay.id,
            "filename": replay.filename,
            "metadata": replay.metadata_json,
            "selected_player": player,
            "findings": findings,
            "most_common_category": common,
            "priorities": recommendations,
            "active_seconds": replay.metadata_json.get("active_seconds", 0),
            "engine_version": replay.engine_version,
            "reliability": RELIABILITY,
            "coverage": {"team_rules_supported": team_supported, "message": coverage_message},
            "feedback": [
                {"finding_id": f.finding_id, "inaccurate": f.inaccurate, "note": f.note}
                for f in db.scalars(select(Feedback).where(Feedback.replay_id == replay.id))
            ],
        }

    @application.get("/api/analytics")
    def analytics(user: Owner, db: Db, playlist: Playlist | None = None):
        matches = list(
            db.scalars(
                select(Replay)
                .where(
                    Replay.user_id == user.id,
                    Replay.status == "ready",
                    Replay.selected_player.is_not(None),
                )
                .order_by(Replay.created_at.desc())
            )
        )
        if playlist:
            matches = [r for r in matches if replay_format(r) == playlist]
        counts: Counter = Counter()
        seconds = 0.0
        for replay in matches:
            seconds += replay.metadata_json.get("active_seconds", 0)
            counts.update(
                f["category"]
                for f in replay.findings
                if f["player_id"] == replay.selected_player and f["source"] == "rule"
            )

        def rate(items):
            duration = sum(r.metadata_json.get("active_seconds", 0) for r in items)
            count = sum(
                sum(
                    f["source"] == "rule" and f["player_id"] == r.selected_player
                    for f in r.findings
                )
                for r in items
            )
            return count / duration * 300 if duration else None

        return {
            "sessions": [
                {
                    "id": r.id,
                    "date": r.created_at,
                    "playlist": replay_format(r),
                    "filename": r.filename,
                    "rate": rate([r]),
                    "active_seconds": r.metadata_json.get("active_seconds", 0),
                    "reviewed": len(
                        {f["id"] for f in r.findings if f["player_id"] == r.selected_player}
                        & set(r.reviewed_ids)
                    ),
                    "findings": sum(
                        f["source"] == "rule" and f["player_id"] == r.selected_player
                        for f in r.findings
                    ),
                    "engine_version": r.engine_version,
                    "coaching_context": r.coaching_context,
                }
                for r in matches
            ],
            "feedback": [
                {
                    "replay_id": f.replay_id,
                    "finding_id": f.finding_id,
                    "note": f.note,
                    "inaccurate": f.inaccurate,
                }
                for f in db.scalars(
                    select(Feedback).where(Feedback.replay_id.in_([r.id for r in matches]))
                )
                if any(
                    e["id"] == f.finding_id and e["player_id"] == r.selected_player
                    for r in matches
                    if r.id == f.replay_id
                    for e in r.findings
                )
            ],
            "matches": len(matches),
            "minutes": seconds / 60,
            "findings": sum(counts.values()),
            "categories": [
                {"category": k, "count": v, "per_5_minutes": v / seconds * 300 if seconds else 0}
                for k, v in counts.most_common()
            ],
            "recent_rate": rate(matches[:5]),
            "previous_rate": rate(matches[5:10]),
            "engine_versions": sorted({r.engine_version for r in matches}),
        }

    @application.post("/api/replays/{replay_id}/labels", status_code=201)
    def label_example(replay_id: str, payload: LabelInput, user: Owner, db: Db):
        replay = owned(replay_id, user, db)
        if replay.status != "ready":
            raise HTTPException(409, "Replay is not ready")
        if payload.time > replay.metadata_json["duration"]:
            raise HTTPException(422, "Timestamp is outside the replay")
        data = json.loads(
            (config.data_dir / "replays" / replay.id / "frames.json").read_text(encoding="utf-8")
        )
        frame = min(data["frames"], key=lambda f: abs(f["time"] - payload.time))
        try:
            features = extract_features(frame, replay.metadata_json["players"], payload.player_id)
        except ValueError as error:
            raise HTTPException(422, str(error)) from None
        existing = db.scalar(
            select(ReviewLabel).where(
                ReviewLabel.replay_id == replay.id,
                ReviewLabel.player_id == payload.player_id,
                ReviewLabel.category == payload.category,
                ReviewLabel.timestamp == frame["time"],
                ReviewLabel.reviewer == user.id,
            )
        )
        label = existing or ReviewLabel(
            replay_id=replay.id,
            player_id=payload.player_id,
            timestamp=frame["time"],
            category=payload.category,
            reviewer=user.id,
            features=features,
            feature_version=FEATURE_VERSION,
        )
        label.label = payload.label
        db.add(label)
        db.commit()
        return {
            "id": label.id,
            "time": label.timestamp,
            "category": label.category,
            "label": label.label,
            "feature_version": label.feature_version,
            "label_source": "account_owner_not_expert_verified",
        }

    @application.get("/api/labels/export")
    def export_labels(user: Owner, db: Db):
        records = []
        labels = db.scalars(select(ReviewLabel).join(Replay).where(Replay.user_id == user.id))
        for label in labels:
            replay = db.get(Replay, label.replay_id)
            if replay is None:
                continue
            # Match the stored detector decision in the immediate review window.
            prediction = int(
                any(
                    f["source"] == "rule"
                    and f["player_id"] == label.player_id
                    and f["category"] == label.category
                    and abs(f["time"] - label.timestamp) <= 1
                    for f in replay.findings
                )
            )
            records.append(
                {
                    "id": label.id,
                    "replay_id": label.replay_id,
                    "player_id": label.player_id,
                    "time": label.timestamp,
                    "category": label.category,
                    "label": label.label,
                    "label_source": "account_owner_not_expert_verified",
                    "feature_version": label.feature_version,
                    "features": label.features,
                    "rule_prediction": prediction,
                    "engine_version": replay.engine_version,
                }
            )
        return Response(
            "\n".join(json.dumps(r) for r in records),
            media_type="application/x-ndjson",
            headers={"Content-Disposition": 'attachment; filename="rankdlab-labels.jsonl"'},
        )

    def remove_files(replay_id: str):
        directory = config.data_dir / "replays" / replay_id
        if directory.resolve().parent != (config.data_dir / "replays").resolve():
            raise RuntimeError("Invalid storage path")
        try:
            shutil.rmtree(directory)
        except FileNotFoundError:
            pass

    @application.delete("/api/replays/{replay_id}", status_code=204)
    def delete_replay(replay_id: str, user: Owner, db: Db):
        replay = owned(replay_id, user, db)
        changed = db.execute(
            update(Replay)
            .where(Replay.id == replay.id, Replay.status != "processing")
            .values(status="deleting")
            .returning(Replay.id)
        ).scalar_one_or_none()
        if changed is None:
            db.rollback()
            raise HTTPException(409, "Wait for processing to finish before deleting")
        db.commit()
        try:
            remove_files(replay.id)
        except OSError:
            replay.status = "failed"
            replay.error = "File removal failed. Retry deletion; your replay record is retained."
            db.commit()
            logging.getLogger("rankdlab.api").exception("replay_deletion_failed")
            raise HTTPException(503, replay.error) from None
        db.delete(replay)
        db.commit()

    @application.delete("/api/profile", status_code=204)
    def delete_profile(user: Owner, db: Db, response: Response):
        db.execute(
            update(Replay)
            .where(Replay.user_id == user.id, Replay.status == "queued")
            .values(status="deleting")
        )
        items = list(db.scalars(select(Replay).where(Replay.user_id == user.id)))
        if any(r.status == "processing" for r in items):
            db.rollback()
            raise HTTPException(409, "Wait for processing to finish before deleting your account")
        for replay in items:
            replay.status = "deleting"
        db.commit()
        try:
            for replay in items:
                remove_files(replay.id)
        except OSError:
            for replay in items:
                replay.status = "failed"
                replay.error = "Account file removal was interrupted. Retry deleting your account."
            db.commit()
            logging.getLogger("rankdlab.api").exception("account_deletion_failed")
            raise HTTPException(
                503, "File removal failed. Your account remains available; retry deletion."
            ) from None
        db.delete(user)
        db.commit()
        response.delete_cookie(COOKIE, path="/api")

    return application
