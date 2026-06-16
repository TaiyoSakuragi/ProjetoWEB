from flask import jsonify
from flask_jwt_extended import JWTManager


def register_jwt_handlers(app, jwt: JWTManager):

    @jwt.unauthorized_loader
    def unauthorized(reason):
        return jsonify({"msg": "Token ausente ou inválido", "detail": reason}), 401

    @jwt.expired_token_loader
    def expired(jwt_header, jwt_data):
        return jsonify({"msg": "Token expirado"}), 401

    @jwt.invalid_token_loader
    def invalid(reason):
        return jsonify({"msg": "Token inválido", "detail": reason}), 422
