from flask import Blueprint
from flask_jwt_extended import jwt_required
from src.controllers.roles_controller import RolesController
from src.middlewares.validator import require_fields, require_role

roles_bp = Blueprint("roles", __name__)
_ctrl = RolesController()


@roles_bp.get("/")
@jwt_required()
@require_role("admin")
def index():
    return _ctrl.index()


@roles_bp.get("/<int:id>")
@jwt_required()
@require_role("admin")
def show(id):
    return _ctrl.show(id)


@roles_bp.post("/")
@jwt_required()
@require_role("admin")
@require_fields("name")
def store():
    return _ctrl.store()


@roles_bp.put("/<int:id>")
@jwt_required()
@require_role("admin")
@require_fields("name")
def update(id):
    return _ctrl.update(id)


@roles_bp.delete("/<int:id>")
@jwt_required()
@require_role("admin")
def destroy(id):
    return _ctrl.destroy(id)
