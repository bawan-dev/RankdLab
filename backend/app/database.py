import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, Float, ForeignKey, Integer, String, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


def now() -> float:
    return datetime.now(UTC).timestamp()


def uid() -> str:
    return uuid.uuid4().hex


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(60))
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[float] = mapped_column(Float, default=now)
    coaching_goal: Mapped[str] = mapped_column(String(500), default="")


class LoginSession(Base):
    __tablename__ = "sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[float] = mapped_column(Float, index=True)


class Replay(Base):
    __tablename__ = "replays"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(180))
    status: Mapped[str] = mapped_column(String(20), default="queued", index=True)
    error: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[float] = mapped_column(Float, default=now)
    claimed_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    findings: Mapped[list] = mapped_column(JSON, default=list)
    selected_player: Mapped[str | None] = mapped_column(String(32), nullable=True)
    session_time: Mapped[float] = mapped_column(Float, default=0)
    reviewed_ids: Mapped[list] = mapped_column(JSON, default=list)
    engine_version: Mapped[str] = mapped_column(String(40), default="geometry-0.1.0")


class Feedback(Base):
    __tablename__ = "feedback"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    replay_id: Mapped[str] = mapped_column(ForeignKey("replays.id", ondelete="CASCADE"), index=True)
    finding_id: Mapped[str] = mapped_column(String(40), index=True)
    inaccurate: Mapped[bool] = mapped_column(Boolean, default=True)
    note: Mapped[str] = mapped_column(String(1000), default="")
    created_at: Mapped[float] = mapped_column(Float, default=now)


class ReviewLabel(Base):
    __tablename__ = "review_labels"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uid)
    replay_id: Mapped[str] = mapped_column(ForeignKey("replays.id", ondelete="CASCADE"), index=True)
    player_id: Mapped[str] = mapped_column(String(32))
    timestamp: Mapped[float] = mapped_column(Float)
    category: Mapped[str] = mapped_column(String(80))
    label: Mapped[int] = mapped_column(Integer)
    reviewer: Mapped[str] = mapped_column(String(32))
    features: Mapped[dict] = mapped_column(JSON)
    feature_version: Mapped[str] = mapped_column(String(40), default="spatial-0.1.0")
    created_at: Mapped[float] = mapped_column(Float, default=now)


def connect(url: str):
    engine = create_engine(
        url,
        connect_args={"check_same_thread": False} if url.startswith("sqlite") else {},
        pool_pre_ping=True,
    )
    if url.startswith("sqlite"):

        @event.listens_for(engine, "connect")
        def sqlite_setup(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
            connection.execute("PRAGMA busy_timeout=5000")
            connection.execute("PRAGMA journal_mode=WAL")

    return engine, sessionmaker(engine, expire_on_commit=False)
