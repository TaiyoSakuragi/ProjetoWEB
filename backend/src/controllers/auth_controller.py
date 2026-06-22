from flask import request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from src.services.auth_service  import AuthService
from src.services.audit_log_service import AuditLogService


class AuthController:
    def __init__(self):
        self._service = AuthService()
        self._audit = AuditLogService()

    def login(self):
        data = request.get_json()
        user = self._service.authenticate(data.get("email"), data.get("password"))
        if not user:
            self._audit.log_login(data.get("email") or data.get("usuario") or "anonimo", False, {"motivo": "credenciais_invalidas"})
            return jsonify({"msg": "Credenciais inválidas"}), 401
        identity      = str(user["id"])
        access_token  = create_access_token(identity=identity)
        refresh_token = create_refresh_token(identity=identity)
        self._audit.log_login(user.get("email") or user.get("name") or identity, True)
        return jsonify({"access_token": access_token, "refresh_token": refresh_token}), 200

    @jwt_required(refresh=True)
    def refresh(self):
        identity      = get_jwt_identity()
        access_token  = create_access_token(identity=identity)
        return jsonify({"access_token": access_token}), 200

    @jwt_required()
    def logout(self):
        identity = get_jwt_identity()
        self._audit.log_logout(identity)
        return jsonify({"msg": "Logout realizado com sucesso"}), 200

