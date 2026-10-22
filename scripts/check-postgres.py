"""Rollback-only smoke check against an explicitly supplied disposable CI database."""

from app.config import Settings
from app.database import LoginSession, Replay, User, connect, now, uid


def main():
    settings = Settings()
    if not settings.database_url.startswith("postgresql"):
        raise ValueError("This check requires an explicit PostgreSQL test database")
    engine, sessions = connect(settings.database_url)
    with sessions() as db:
        user = User(
            email=f"ci-{uid()}@example.com",
            display_name="CI smoke",
            password_hash="not-a-login-credential",
        )
        db.add(user)
        db.flush()
        replay = Replay(user_id=user.id, filename="ci.replay", metadata_json={"score": [0, 0]})
        db.add(replay)
        db.add(LoginSession(user_id=user.id, token_hash=uid(), expires_at=now() + 60))
        db.flush()
        assert db.get(Replay, replay.id).metadata_json["score"] == [0, 0]
        db.rollback()
    engine.dispose()
    print("PostgreSQL persistence smoke check passed; transaction rolled back.")


if __name__ == "__main__":
    main()
