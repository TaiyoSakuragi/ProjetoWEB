import json
from unittest.mock import patch

_BASE = "src.services.devices_service.DevicesService"

_DEVICE  = {"id": 1, "name": "Sensor-01", "external_id": "EXT001", "timezone": "America/Sao_Paulo", "is_active": True}
_DEVICES = [_DEVICE]


class TestGetDevices:
    def test_returns_list(self, client, auth):
        with patch(f"{_BASE}.get_all", return_value=_DEVICES):
            resp = client.get("/api/devices/", headers=auth)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data[0]["id"] == 1
        assert data[0]["name"] == "Sensor-01"

    def test_requires_auth(self, client):
        resp = client.get("/api/devices/")
        assert resp.status_code == 401


class TestGetDevice:
    def test_returns_device(self, client, auth):
        with patch(f"{_BASE}.get_by_id", return_value=_DEVICE):
            resp = client.get("/api/devices/1", headers=auth)
        assert resp.status_code == 200
        assert resp.get_json()["id"] == 1

    def test_not_found_returns_404(self, client, auth):
        with patch(f"{_BASE}.get_by_id", return_value=None):
            resp = client.get("/api/devices/99", headers=auth)
        assert resp.status_code == 404

    def test_requires_auth(self, client):
        resp = client.get("/api/devices/1")
        assert resp.status_code == 401


class TestCreateDevice:

    def test_creates_and_returns_id(self, client, auth):
        with patch(f"{_BASE}.create", return_value=5):
            resp = client.post(
                "/api/devices/",
                data=json.dumps({"name": "Sensor-02"}),
                headers=auth,
            )
        assert resp.status_code == 201
        assert resp.get_json()["id"] == 5

    def test_missing_name_returns_422(self, client, auth):
        resp = client.post(
            "/api/devices/",
            data=json.dumps({"external_id": "EXT999"}),   # falta name
            headers=auth,
        )
        assert resp.status_code == 422

    def test_requires_auth(self, client):
        resp = client.post("/api/devices/", content_type="application/json")
        assert resp.status_code == 401


class TestUpdateDevice:

    def test_updates_and_returns_id(self, client, auth):
        with patch(f"{_BASE}.update", return_value=_DEVICE):
            resp = client.put(
                "/api/devices/1",
                data=json.dumps({"name": "Sensor-01-v2"}),
                headers=auth,
            )
        assert resp.status_code == 200
        assert resp.get_json()["id"] == 1

    def test_requires_auth(self, client):
        resp = client.put("/api/devices/1", content_type="application/json")
        assert resp.status_code == 401


class TestDeleteDevice:

    def test_deactivates_device(self, client, auth):
        with patch(f"{_BASE}.delete", return_value=None):
            resp = client.delete("/api/devices/1", headers=auth)
        assert resp.status_code == 200
        assert resp.get_json()["msg"] == "Dispositivo desativado"

    def test_requires_auth(self, client):
        resp = client.delete("/api/devices/1")
        assert resp.status_code == 401
