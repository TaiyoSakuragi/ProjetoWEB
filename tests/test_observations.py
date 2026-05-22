import json
from unittest.mock import patch

_BASE = "src.services.observations_service.ObservationsService"

_OBS  = {"id": 1, "device_id": 1, "register": "2026-01-01T00:00:00", "temperature": 25.0}
_LIST = [_OBS]


class TestGetObservations:

    def test_returns_list(self, client, auth):
        with patch(f"{_BASE}.get_all", return_value=_LIST):
            resp = client.get("/api/observations/", headers=auth)
        assert resp.status_code == 200
        assert isinstance(resp.get_json(), list)

    def test_requires_auth(self, client):
        resp = client.get("/api/observations/")
        assert resp.status_code == 401


class TestGetObservationsByDevice:
    """GET /api/observations/<device_id>  →  ObservationsController.show()
    usa device_id como parâmetro e aceita ?start=&end= na query string."""

    def test_returns_history(self, client, auth):
        with patch(f"{_BASE}.get_by_device", return_value=_LIST):
            resp = client.get(
                "/api/observations/1?start=2026-01-01&end=2026-01-31",
                headers=auth,
            )
        assert resp.status_code == 200
        assert resp.get_json()[0]["device_id"] == 1

    def test_uses_default_date_range(self, client, auth):
        with patch(f"{_BASE}.get_by_device", return_value=[]) as mock_svc:
            resp = client.get("/api/observations/1", headers=auth)
        assert resp.status_code == 200
        # confirma que o service foi chamado com os defaults de data
        mock_svc.assert_called_once_with(1, "2000-01-01", "2099-12-31")

    def test_requires_auth(self, client):
        resp = client.get("/api/observations/1")
        assert resp.status_code == 401


class TestCreateObservation:

    def test_registers_observation(self, client, auth):
        with patch(f"{_BASE}.create", return_value=None):
            resp = client.post(
                "/api/observations/",
                data=json.dumps({"device_id": 1, "register": "2026-01-01T12:00:00"}),
                headers=auth,
            )
        assert resp.status_code == 201
        assert resp.get_json()["msg"] == "Observação registrada"

    def test_missing_fields_returns_422(self, client, auth):
        resp = client.post(
            "/api/observations/",
            data=json.dumps({"device_id": 1}),   # falta register
            headers=auth,
        )
        assert resp.status_code == 422

    def test_requires_auth(self, client):
        resp = client.post("/api/observations/", content_type="application/json")
        assert resp.status_code == 401
