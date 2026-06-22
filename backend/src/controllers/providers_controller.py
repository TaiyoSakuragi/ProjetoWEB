from flask import request, jsonify
from src.interfaces.icontroller import IController
from src.services.providers_service import ProvidersService
from src.services.audit_log_service import AuditLogService


class ProvidersController(IController):
    def __init__(self):
        self._service = ProvidersService()
        self._audit = AuditLogService()

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
        self._audit.log_create("providers", provider_id, data)
        return jsonify({"id": provider_id}), 201

    def update(self, id: int):
        item = self._service.get_by_id(id)
        if not item:
            return jsonify({"msg": "Provedor não encontrado"}), 404
        data = request.get_json()
        before = dict(item)
        updated_item = self._service.update(id, data)
        self._audit.log_update("providers", id, before, updated_item)
        return jsonify(updated_item), 200

    def destroy(self, id: int):
        item = self._service.get_by_id(id)
        if not item:
            return jsonify({"msg": "Provedor não encontrado"}), 404
        before = dict(item)
        self._service.delete(id)
        self._audit.log_delete("providers", id, before)
        return jsonify({"msg": "Provedor removido"}), 200