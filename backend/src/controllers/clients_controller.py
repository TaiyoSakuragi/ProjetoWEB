from flask import request, jsonify
from src.interfaces.icontroller import IController
from src.services.clients_service import ClientsService
from src.services.audit_log_service import AuditLogService


class ClientsController(IController):
    def __init__(self):
        self._service = ClientsService()
        self._audit = AuditLogService()

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
        self._audit.log_create("clients", client_id, data)
        return jsonify({"id": client_id}), 201

    def update(self, id: int):
        client = self._service.get_by_id(id)
        if not client:
            return jsonify({"msg": "Cliente não encontrado"}), 404
        data = request.get_json()
        before = dict(client)
        updated_client = self._service.update(id, data)
        self._audit.log_update("clients", id, before, updated_client)
        return jsonify(updated_client), 200

    def destroy(self, id: int):
        client = self._service.get_by_id(id)
        if not client:
            return jsonify({"msg": "Cliente não encontrado"}), 404
        before = dict(client)
        self._service.delete(id)
        self._audit.log_delete("clients", id, before)
        return jsonify({"msg": "Cliente removido"}), 200