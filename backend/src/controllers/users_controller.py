from flask import request, jsonify
from src.interfaces.icontroller     import IController
from src.services.users_service     import UsersService
from src.database.repository.firebase_log import FirebaseLogRepository


class UsersController(IController):

    def __init__(self):
        self._service = UsersService()
        self._firebase = FirebaseLogRepository()

    def index(self):
        users = self._service.get_all()
        return jsonify([{"id": u["id"], "name": u["name"], "email": u["email"]} for u in users]), 200

    def show(self, id: int):
        user = self._service.get_by_id(id)
        if not user:
            return jsonify({"msg": "Usuário não encontrado"}), 404
        return jsonify({"id": user["id"], "name": user["name"], "email": user["email"]}), 200

    def store(self):
        data = request.get_json()
        user_id = self._service.create(data)
        return jsonify({"id": user_id}), 201

    def update(self, id: int):
        user = self._service.get_by_id(id)
        if not user:
            return jsonify({"msg": "Usuário não encontrado"}), 404
        data = request.get_json()
        updated_user = self._service.update(id, data)
        self._firebase.save({
            "action": "UPDATE",
            "entity": "user",
            "entity_id": id,
            "data": data,
            "path": request.path
        })
        return jsonify({"id": updated_user["id"]}), 200

    def destroy(self, id: int):
        user = self._service.get_by_id(id)
        if not user:
            return jsonify({"msg": "Usuário não encontrado"}), 404
        self._service.delete(id)
        self._firebase.save({
            "action": "DELETE",
            "entity": "user",
            "entity_id": id,
            "path": request.path
        })
        return jsonify({"msg": "Usuário removido"}), 200

