from flask import request, jsonify
from src.interfaces.icontroller     import IController
from src.services.devices_service   import DevicesService


class DevicesController(IController):

    def __init__(self):
        self._service = DevicesService()

    def index(self):
        devices = self._service.get_all()
        return jsonify(
            [{"id": d["id"], "name": d["name"], "external_id": d.get("external_id")} for d in devices]
        ), 200

    def show(self, id: int):
        device = self._service.get_by_id(id)
        if not device:
            return jsonify({"msg": "Dispositivo não encontrado"}), 404
        return jsonify({
            "id":                   device["id"],
            "name":                 device["name"],
            "external_id":          device.get("external_id"),
            "timezone":             device.get("timezone"),
            "is_active":            device.get("is_active"),
        }), 200

    def store(self):
        data = request.get_json()
        device_id = self._service.create(data)
        return jsonify({"id": device_id}), 201

    def update(self, id: int):
        data = request.get_json()
        device = self._service.update(id, data)
        return jsonify({"id": device["id"]}), 200

    def destroy(self, id: int):
        self._service.delete(id)
        return jsonify({"msg": "Dispositivo desativado"}), 200

