from flask                          import request, jsonify
from src.interfaces.icontroller     import IController
from src.services.role_service      import RoleService
from src.services.audit_log_service import AuditLogService


class RolesController(IController):

    def __init__(self):
        self._service = RoleService()
        self._audit = AuditLogService()

    def index(self):
        roles = self._service.get_all()
        return jsonify(roles), 200

    def show(self, id: int):
        role = self._service.get_by_id(id)
        if not role:
            return jsonify({"msg": "Role não encontrada"}), 404
        return jsonify(role), 200

    def store(self):
        data = request.get_json()
        role_id = self._service.create(data)
        self._audit.log_create("roles", role_id, data)
        return jsonify({"id": role_id}), 201

    def update(self, id: int):
        role = self._service.get_by_id(id)
        if not role:
            return jsonify({"msg": "Role não encontrada"}), 404
        data = request.get_json()
        before = dict(role)
        updated_role = self._service.update(id, data)
        self._audit.log_update("roles", id, before, updated_role)
        return jsonify(updated_role), 200

    def destroy(self, id: int):
        role = self._service.get_by_id(id)
        if not role:
            return jsonify({"msg": "Role não encontrada"}), 404
        before = dict(role)
        self._service.delete(id)
        self._audit.log_delete("roles", id, before)
        return jsonify({"msg": "Role removida"}), 200
