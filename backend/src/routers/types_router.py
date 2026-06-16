from flask import Blueprint
from flask_jwt_extended import jwt_required
from src.controllers.types_controller import TypesController
from src.middlewares.validator import require_fields, require_role

types_bp = Blueprint("types", __name__)
_ctrl = TypesController()


@types_bp.get("/")
@jwt_required()
@require_role("admin")
def index():
    return _ctrl.index()


@types_bp.get("/<int:id>")
@jwt_required()
@require_role("admin")
def show(id):
    return _ctrl.show(id)


@types_bp.post("/")
@jwt_required()
@require_role("admin")
@require_fields("name")
def store():
    return _ctrl.store()


@types_bp.put("/<int:id>")
@jwt_required()
@require_role("admin")
@require_fields("name")
def update(id):
    return _ctrl.update(id)


@types_bp.delete("/<int:id>")
@jwt_required()
@require_role("admin")
def destroy(id):
    return _ctrl.destroy(id)