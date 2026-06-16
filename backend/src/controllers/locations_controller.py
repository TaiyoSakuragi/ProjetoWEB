from flask import request, jsonify
from src.services.locations_service import LocationsService
from src.database.repository.firebase_log import FirebaseLogRepository


class LocationsController:
    def __init__(self):
        self._service = LocationsService()
        self._firebase = FirebaseLogRepository()

    def show(self, device_id: int):
        location = self._service.get_by_device(device_id)
        if not location:
            return jsonify({"msg": "Localização não encontrada"}), 404
        return jsonify(location), 200

    def store(self, device_id: int):
        data = request.get_json()
        location_id = self._service.create(device_id, data)
        self._firebase.save({
            "action": "CREATE",
            "entity": "location",
            "entity_id": location_id,
            "data": data,
            "path": request.path
        })
        return jsonify({"device_id": location_id}), 201

    def update(self, device_id: int):
        location = self._service.get_by_device(device_id)
        if not location:
            return jsonify({"msg": "Localização não encontrada"}), 404
        data = request.get_json()
        updated_location = self._service.update(device_id, data)
        self._firebase.save({
            "action": "UPDATE",
            "entity": "location",
            "entity_id": device_id,
            "data": data,
            "path": request.path
        })
        return jsonify(updated_location), 200

    def destroy(self, device_id: int):
        location = self._service.get_by_device(device_id)
        if not location:
            return jsonify({"msg": "Localização não encontrada"}), 404
        self._service.delete(device_id)
        self._firebase.save({
            "action": "DELETE",
            "entity": "location",
            "entity_id": device_id,
            "path": request.path
        })
        return jsonify({"msg": "Localização removida"}), 200