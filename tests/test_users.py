import json
from unittest.mock import patch

_BASE = "src.services.users_service.UsersService"

_USER  = {"id": 1, "name": "Alice", "email": "alice@example.com"}
_USERS = [_USER]


class TestGetUsers:

    def test_returns_list(self, client, auth):
        with patch(f"{_BASE}.get_all", return_value=_USERS):
            resp = client.get("/api/users/", headers=auth)
        assert resp.status_code == 200
        assert resp.get_json() == [{"id": 1, "name": "Alice", "email": "alice@example.com"}]

    def test_requires_auth(self, client):
        resp = client.get("/api/users/")
        assert resp.status_code == 401


class TestGetUser:

    def test_returns_user(self, client, auth):
        with patch(f"{_BASE}.get_by_id", return_value=_USER):
            resp = client.get("/api/users/1", headers=auth)
        assert resp.status_code == 200
        assert resp.get_json()["id"] == 1

    def test_not_found_returns_404(self, client, auth):
        with patch(f"{_BASE}.get_by_id", return_value=None):
            resp = client.get("/api/users/99", headers=auth)
        assert resp.status_code == 404

    def test_requires_auth(self, client):
        resp = client.get("/api/users/1")
        assert resp.status_code == 401


class TestCreateUser:

    def test_creates_and_returns_id(self, client, auth):
        with patch(f"{_BASE}.create", return_value=2):
            resp = client.post(
                "/api/users/",
                data=json.dumps({"name": "Bob", "email": "bob@example.com", "password": "pw"}),
                headers=auth,
            )
        assert resp.status_code == 201
        assert resp.get_json()["id"] == 2

    def test_missing_fields_returns_422(self, client, auth):
        resp = client.post(
            "/api/users/",
            data=json.dumps({"name": "Bob"}),   # falta email e password
            headers=auth,
        )
        assert resp.status_code == 422

    def test_requires_auth(self, client):
        resp = client.post("/api/users/", content_type="application/json")
        assert resp.status_code == 401


class TestUpdateUser:

    def test_updates_and_returns_id(self, client, auth):
        with patch(f"{_BASE}.update", return_value=_USER):
            resp = client.put(
                "/api/users/1",
                data=json.dumps({"name": "Alice v2"}),
                headers=auth,
            )
        assert resp.status_code == 200
        assert resp.get_json()["id"] == 1

    def test_requires_auth(self, client):
        resp = client.put("/api/users/1", content_type="application/json")
        assert resp.status_code == 401


class TestDeleteUser:

    def test_deactivates_user(self, client, auth):
        with patch(f"{_BASE}.delete", return_value=None):
            resp = client.delete("/api/users/1", headers=auth)
        assert resp.status_code == 200
        assert resp.get_json()["msg"] == "Usuário removido"

    def test_requires_auth(self, client):
        resp = client.delete("/api/users/1")
        assert resp.status_code == 401
