from flask import request, jsonify
from src.interfaces.icontroller import IController
from src.services.providers_service import ProvidersService
from src.database.repository.firebase_log import FirebaseLogRepository


class ProvidersController(IController):
    def __init__(self):
        self._service = ProvidersService()
        self._firebase = FirebaseLogRepository()

    def index(self):
        return jsonify(self._service.get_all()), 200

    def show(self, id: int):
        item = self._service.get_by_id(id)
        if not item:
            return jsonify({"msg": "Provedor não encontrado"}), 404
        return jsonify(item), 200

    def store(self):
        data = request.get_json()
        provider_id = self._service.create(data)
        return jsonify({"id": provider_id}), 201

    def update(self, id: int):
        item = self._service.get_by_id(id)
        if not item:
            return jsonify({"msg": "Provedor não encontrado"}), 404
        data = request.get_json()
        updated_item = self._service.update(id, data)
        self._firebase.save({
            "action": "UPDATE",
            "entity": "provider",
            "entity_id": id,
            "data": data,
            "path": request.path
        })
        return jsonify(updated_item), 200

    def destroy(self, id: int):
        item = self._service.get_by_id(id)
        if not item:
            return jsonify({"msg": "Provedor não encontrado"}), 404
        self._service.delete(id)
        self._firebase.save({
            "action": "DELETE",
            "entity": "provider",
            "entity_id": id,
            "path": request.path
        })
        return jsonify({"msg": "Provedor removido"}), 200