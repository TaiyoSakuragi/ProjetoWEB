from flask import request, jsonify
from src.services.locations_service import LocationsService
from src.services.audit_log_service import AuditLogService


class LocationsController:
    def __init__(self):
        self._service = LocationsService()
        self._audit = AuditLogService()

    def show(self, device_id: int):
        location = self._service.get_by_device(device_id)
        if not location:
            return jsonify({"msg": "Localização não encontrada"}), 404
        return jsonify(location), 200

    def store(self, device_id: int):
        data = request.get_json()
        location_id = self._service.create(device_id, data)
        payload = dict(data)
        payload["device_id"] = device_id
        self._audit.log_create("locations", location_id, payload)
        return jsonify({"device_id": location_id}), 201

    def update(self, device_id: int):
        location = self._service.get_by_device(device_id)
        if not location:
            return jsonify({"msg": "Localização não encontrada"}), 404
        data = request.get_json()
        before = dict(location)
        updated_location = self._service.update(device_id, data)
        self._audit.log_update("locations", device_id, before, updated_location)
        return jsonify(updated_location), 200

    def destroy(self, device_id: int):
        location = self._service.get_by_device(device_id)
        if not location:
            return jsonify({"msg": "Localização não encontrada"}), 404
        before = dict(location)
        self._service.delete(device_id)
        self._audit.log_delete("locations", device_id, before)
        return jsonify({"msg": "Localização removida"}), 200