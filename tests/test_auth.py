import json
from unittest.mock import patch

_USER = {"id": 1, "email": "alice@example.com", "password_hash": "hashed"}


class TestLogin:

    def test_success_returns_token(self, client):
        with patch("src.services.auth_service.AuthService.authenticate", return_value=_USER):
            resp = client.post(
                "/api/auth/login",
                data=json.dumps({"email": "alice@example.com", "password": "pw"}),
                content_type="application/json",
            )
        assert resp.status_code == 200
        assert "access_token" in resp.get_json()

    def test_invalid_credentials_returns_401(self, client):
        with patch("src.services.auth_service.AuthService.authenticate", return_value=None):
            resp = client.post(
                "/api/auth/login",
                data=json.dumps({"email": "a@b.com", "password": "wrong"}),
                content_type="application/json",
            )
        assert resp.status_code == 401
        assert resp.get_json()["msg"] == "Credenciais inválidas"

    def test_missing_body_does_not_crash(self, client):
        with patch("src.services.auth_service.AuthService.authenticate", return_value=None):
            resp = client.post("/api/auth/login", content_type="application/json")
        # body vazio → Flask não consegue parsear o JSON → 400 Bad Request
        assert resp.status_code == 400
