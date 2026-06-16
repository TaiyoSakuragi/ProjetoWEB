from flask import Blueprint
from flask_jwt_extended import jwt_required
from src.controllers.users_controller import UsersController
from src.middlewares.validator import require_fields

users_bp = Blueprint("users", __name__)
_ctrl = UsersController()


@users_bp.get("/")
@jwt_required()
def index():
    return _ctrl.index()


@users_bp.get("/<int:id>")
@jwt_required()
def show(id):
    return _ctrl.show(id)


@users_bp.post("/")
@jwt_required()
@require_fields("name", "email", "password")
def store():
    return _ctrl.store()


@users_bp.put("/<int:id>")
@jwt_required()
def update(id):
    return _ctrl.update(id)


@users_bp.delete("/<int:id>")
@jwt_required()
def destroy(id):
    return _ctrl.destroy(id)
