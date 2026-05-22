from flask import request, jsonify
from flask_jwt_extended         import create_access_token
from src.services.auth_service  import AuthService


class AuthController:

    def __init__(self):
        self._service = AuthService()

    def login(self):
        data = request.get_json()
        user = self._service.authenticate(data.get("email"), data.get("password"))
        if not user:
            return jsonify({"msg": "Credenciais inválidas"}), 401
        token = create_access_token(identity=str(user["id"]))
        return jsonify({"access_token": token}), 200

