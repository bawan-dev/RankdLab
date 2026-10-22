import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.api import create_app
from app.config import ROOT, Settings

HEADERS = {"X-Requested-With": "RankdLab", "Origin": "http://127.0.0.1:5173"}


@pytest.fixture
def application(tmp_path):
    return create_app(
        Settings(
            environment="test",
            data_dir=tmp_path,
            database_url=f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
            hosts=["testserver"],
            start_worker=False,
        )
    )


@pytest.fixture
def client(application):
    with TestClient(application, headers=HEADERS) as client:
        yield client


def register(client, email="reviewer@example.com"):
    response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "test-only-password-123",
            "display_name": "Test reviewer",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def authenticated(client):
    register(client)
    return client


@pytest.fixture(scope="session")
def genuine_replay():
    candidate = Path(
        os.environ.get("RANKDLAB_TEST_REPLAY", ROOT / ".research" / "genuine-doubles.replay")
    )
    if not candidate.exists() or candidate.stat().st_size == 0:
        pytest.skip("Genuine replay unavailable. Run scripts/fetch-test-replay.py first.")
    return candidate
