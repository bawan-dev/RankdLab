"""A local-only legacy-to-Milestone-3 migration check using invented fixtures.

This test never reads or modifies the user's existing RankdLab database.
"""

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from app.config import ROOT


def test_milestone3_upgrade_preserves_legacy_accounts_and_reports(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'migration-test.db'}")
    alembic = Config(str(ROOT / "backend" / "alembic.ini"))
    alembic.set_main_option("script_location", str(ROOT / "backend" / "migrations"))

    # Bring up the pre-profile schema, then insert a synthetic legacy user/replay.
    with engine.begin() as connection:
        alembic.attributes["connection"] = connection
        command.upgrade(alembic, "d468c480c1a7")
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO users (id, email, display_name, password_hash, created_at, "
                "coaching_goal) VALUES ('legacy-user', 'fixture@example.invalid', 'Fixture', "
                "'not-a-real-hash', 1, '')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO replays (id, user_id, filename, status, created_at, "
                "metadata_json, findings, session_time, reviewed_ids, engine_version) "
                "VALUES ('legacy-replay', 'legacy-user', 'fixture.replay', 'ready', 2, "
                "'{}', '[]', 0, '[]', 'geometry-0.1.0')"
            )
        )

    with engine.begin() as connection:
        alembic.attributes["connection"] = connection
        command.upgrade(alembic, "head")
    with engine.connect() as connection:
        tables = set(inspect(connection).get_table_names())
        assert {"users", "replays", "rocket_profiles", "rank_history"} <= tables
        assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "m3_profiles"
        assert (
            connection.scalar(text("SELECT display_name FROM users WHERE id='legacy-user'"))
            == "Fixture"
        )
        assert (
            connection.scalar(text("SELECT filename FROM replays WHERE id='legacy-replay'"))
            == "fixture.replay"
        )
        assert (
            connection.scalar(text("SELECT coaching_context FROM replays WHERE id='legacy-replay'"))
            == "{}"
        )
        columns = {column["name"] for column in inspect(connection).get_columns("replays")}
        assert {"coaching_context", "requested_playlist"} <= columns

    # A second upgrade is safe; startup can run it repeatedly.
    with engine.begin() as connection:
        alembic.attributes["connection"] = connection
        command.upgrade(alembic, "head")
    with engine.connect() as connection:
        assert connection.scalar(text("SELECT COUNT(*) FROM users")) == 1
        assert connection.scalar(text("SELECT COUNT(*) FROM replays")) == 1
    engine.dispose()
