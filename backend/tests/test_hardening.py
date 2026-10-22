import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.config import ROOT, Settings
from app.database import connect


def test_migrations_upgrade_check_downgrade(tmp_path):
    engine, _ = connect(f"sqlite:///{(tmp_path / 'migrations.db').as_posix()}")
    config = Config(str(ROOT / "backend" / "alembic.ini"))
    config.set_main_option("script_location", str(ROOT / "backend" / "migrations"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
        command.check(config)
        assert {"users", "sessions", "replays", "feedback", "review_labels"}.issubset(
            inspect(connection).get_table_names()
        )
        command.downgrade(config, "base")
        assert "users" not in inspect(connection).get_table_names()
    engine.dispose()


def test_production_requires_explicit_security_configuration():
    with pytest.raises(ValueError):
        Settings(environment="production")
    config = Settings(
        environment="production",
        secure_cookies=True,
        database_url="postgresql+psycopg://test@localhost/test",
        origins=["https://rankdlab.example"],
        hosts=["rankdlab.example"],
    )
    assert config.secure_cookies


def test_streaming_body_limit_and_cors(client):
    # No Content-Length: the receive wrapper must enforce the actual bytes.
    response = client.post(
        "/api/auth/login",
        content=iter([b" " * 40_000, b" " * 40_000]),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 413
    response = client.options(
        "/api/profile",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "PUT",
            "Access-Control-Request-Headers": "X-Requested-With",
        },
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_health_has_request_identifier(client):
    response = client.get("/api/health")
    assert len(response.headers["x-request-id"]) == 32
    assert response.headers["x-content-type-options"] == "nosniff"
