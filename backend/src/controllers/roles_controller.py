from flask                          import request, jsonify
from src.interfaces.icontroller     import IController
from src.services.role_service      import RoleService
from src.database.repository.firebase_log import FirebaseLogRepository


class RolesController(IController):

    def __init__(self):
        self._service = RoleService()
        self._firebase = FirebaseLogRepository()

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
        return jsonify({"id": role_id}), 201

    def update(self, id: int):
        role = self._service.get_by_id(id)
        if not role:
            return jsonify({"msg": "Role não encontrada"}), 404
        data = request.get_json()
        updated_role = self._service.update(id, data)
        self._firebase.save({
            "action": "UPDATE",
            "entity": "role",
            "entity_id": id,
            "data": data,
            "path": request.path
        })
        return jsonify(updated_role), 200

    def destroy(self, id: int):
        role = self._service.get_by_id(id)
        if not role:
            return jsonify({"msg": "Role não encontrada"}), 404
        self._service.delete(id)
        self._firebase.save({
            "action": "DELETE",
            "entity": "role",
            "entity_id": id,
            "path": request.path
        })
        return jsonify({"msg": "Role removida"}), 200
