from flask import request, jsonify
from src.interfaces.icontroller     import IController
from src.services.users_service     import UsersService
from src.services.audit_log_service import AuditLogService


class UsersController(IController):

    def __init__(self):
        self._service = UsersService()
        self._audit = AuditLogService()

    def index(self):
        users = self._service.get_all()
        return jsonify([{"id": u["id"], "name": u["name"], "email": u["email"], "client_id": u["client_id"]} for u in users]), 200

    def show(self, id: int):
        user = self._service.get_by_id(id)
        if not user:
            return jsonify({"msg": "Usuário não encontrado"}), 404
        return jsonify(
            {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "client_id": user["client_id"],
                "role_id": user["role_id"],
            }
        ), 200

    def store(self):
        data = request.get_json()
        user_id = self._service.create(data)
        self._audit.log_create("users", user_id, data)
        return jsonify({"id": user_id}), 201

    def update(self, id: int):
        user = self._service.get_by_id(id)
        if not user:
            return jsonify({"msg": "Usuário não encontrado"}), 404
        data = request.get_json()
        before = dict(user)
        updated_user = self._service.update(id, data)
        self._audit.log_update("users", id, before, updated_user)
        return jsonify({"id": updated_user["id"]}), 200

    def destroy(self, id: int):
        user = self._service.get_by_id(id)
        if not user:
            return jsonify({"msg": "Usuário não encontrado"}), 404
        before = dict(user)
        self._service.delete(id)
        self._audit.log_delete("users", id, before)
        return jsonify({"msg": "Usuário removido"}), 200

