from conftest import HEADERS, register
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.database import LoginSession, User, now
from app.security import COOKIE


def test_password_sessions_and_logout(client, application):
    user = register(client)
    assert client.get("/api/auth/me").json()["id"] == user["id"]
    with application.state.sessions() as db:
        stored = db.get(User, user["id"])
        assert stored.password_hash.startswith("$argon2id$")
        session = db.scalar(select(LoginSession))
        assert session.token_hash != client.cookies.get(COOKIE)
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401
    assert (
        client.post(
            "/api/auth/login",
            json={"email": "reviewer@example.com", "password": "test-only-password-123"},
        ).status_code
        == 200
    )
    cookie = client.cookies.get(COOKIE)
    assert cookie
    response = client.post(
        "/api/auth/login", json={"email": "reviewer@example.com", "password": "incorrect-password"}
    )
    assert response.status_code == 401


def test_cookie_security_and_csrf(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "new@example.com",
            "password": "test-only-password-123",
            "display_name": "Reviewer",
        },
    )
    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=strict" in cookie
    assert (
        client.post("/api/auth/logout", headers={"Origin": "https://evil.example"}).status_code
        == 403
    )
    client.headers.pop("X-Requested-With")
    assert client.post("/api/auth/logout").status_code == 403


def test_validation_duplicates_and_profile(client):
    register(client)
    assert (
        client.post(
            "/api/auth/register",
            json={
                "email": "REVIEWER@example.com",
                "password": "test-only-password-123",
                "display_name": "Other",
            },
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/api/auth/register", json={"email": "bad", "password": "short", "display_name": " "}
        ).status_code
        == 422
    )
    response = client.put(
        "/api/profile", json={"coaching_goal": "Leave room for the second player"}
    )
    assert response.json()["coaching_goal"] == "Leave room for the second player"
    assert client.delete("/api/profile").status_code == 204
    assert client.get("/api/auth/me").status_code == 401


def test_expired_session_and_rate_limit(client, application):
    register(client)
    with application.state.sessions() as db:
        item = db.scalar(select(LoginSession))
        item.expires_at = now() - 1
        db.commit()
    assert client.get("/api/auth/me").status_code == 401
    responses = [
        client.post(
            "/api/auth/login", json={"email": "none@example.com", "password": "incorrect-password"}
        )
        for _ in range(21)
    ]
    assert responses[-1].status_code == 429
    assert "retry-after" in responses[-1].headers


def test_user_data_isolation(client, application):
    register(client)
    replay = client.post(
        "/api/replays",
        files={"file": ("match.replay", b"invalid" * 100, "application/octet-stream")},
    ).json()
    with TestClient(application, headers=HEADERS) as other:
        register(other, "other@example.com")
        assert other.get("/api/replays").json() == []
        for suffix in ("", "/frames", "/report"):
            assert other.get(f"/api/replays/{replay['id']}{suffix}").status_code == 404
        assert other.delete(f"/api/replays/{replay['id']}").status_code == 404
