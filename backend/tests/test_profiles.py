from sqlalchemy import select

from app.database import RankRecord


def test_independent_ranks_history_and_validation(authenticated, application):
    client = authenticated
    assert client.get("/api/rocket-league/profile").json()["ranks"] == {}
    assert (
        client.put(
            "/api/rocket-league/profile", json={"display_name": "Busiest", "platform": "PC"}
        ).status_code
        == 200
    )
    for playlist, rank in [("1v1", "Gold II"), ("2v2", "Diamond III"), ("3v3", "Unranked")]:
        response = client.put(f"/api/rocket-league/ranks/{playlist}", json={"rank": rank})
        assert response.status_code == 200
        assert response.json()["source"] == "user-entered"
    client.put(
        "/api/rocket-league/ranks/2v2", json={"rank": "Champion I", "division": 4, "mmr": 1100}
    )
    data = client.get("/api/rocket-league/profile").json()
    assert data["ranks"]["1v1"]["rank"] == "Gold II"
    assert data["ranks"]["2v2"]["division"] == 4
    assert len(data["history"]) == 4
    for payload in [
        {"rank": "SSL"},
        {"rank": "Supersonic Legend", "division": 1},
        {"rank": "Gold I", "mmr": -1},
        {"rank": "Gold I", "division": 5},
    ]:
        assert client.put("/api/rocket-league/ranks/1v1", json=payload).status_code == 422
    assert client.put("/api/rocket-league/ranks/4v4", json={"rank": "Unranked"}).status_code == 422
    assert (
        client.put("/api/profile", json={"display_name": "New display"}).json()["display_name"]
        == "New display"
    )
    assert client.delete("/api/profile").status_code == 204
    with application.state.sessions() as db:
        assert list(db.scalars(select(RankRecord))) == []
