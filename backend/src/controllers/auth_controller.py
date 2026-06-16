from flask import request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from src.services.auth_service  import AuthService


class AuthController:
    def __init__(self):
        self._service = AuthService()

    def login(self):
        data = request.get_json()
        user = self._service.authenticate(data.get("email"), data.get("password"))
        if not user:
            return jsonify({"msg": "Credenciais inválidas"}), 401
        identity      = str(user["id"])
        access_token  = create_access_token(identity=identity)
        refresh_token = create_refresh_token(identity=identity)
        return jsonify({"access_token": access_token, "refresh_token": refresh_token}), 200

    @jwt_required(refresh=True)
    def refresh(self):
        identity      = get_jwt_identity()
        access_token  = create_access_token(identity=identity)
        return jsonify({"access_token": access_token}), 200

