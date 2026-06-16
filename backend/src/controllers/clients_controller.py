from flask import request, jsonify
from src.interfaces.icontroller import IController
from src.services.clients_service import ClientsService
from src.database.repository.firebase_log import FirebaseLogRepository


class ClientsController(IController):
    def __init__(self):
        self._service = ClientsService()
        self._firebase = FirebaseLogRepository()

    def index(self):
        return jsonify(self._service.get_all()), 200

    def show(self, id: int):
        client = self._service.get_by_id(id)
        if not client:
            return jsonify({"msg": "Cliente não encontrado"}), 404
        return jsonify(client), 200

    def store(self):
        data = request.get_json()
        client_id = self._service.create(data)
        return jsonify({"id": client_id}), 201

    def update(self, id: int):
        client = self._service.get_by_id(id)
        if not client:
            return jsonify({"msg": "Cliente não encontrado"}), 404
        data = request.get_json()
        updated_client = self._service.update(id, data)
        self._firebase.save({
            "action": "UPDATE",
            "entity": "client",
            "entity_id": id,
            "data": data,
            "path": request.path
        })
        return jsonify(updated_client), 200

    def destroy(self, id: int):
        client = self._service.get_by_id(id)
        if not client:
            return jsonify({"msg": "Cliente não encontrado"}), 404
        self._service.delete(id)
        self._firebase.save({
            "action": "DELETE",
            "entity": "client",
            "entity_id": id,
            "path": request.path
        })
        return jsonify({"msg": "Cliente removido"}), 200