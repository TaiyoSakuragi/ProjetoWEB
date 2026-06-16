from flask import Blueprint
from flask_jwt_extended import jwt_required
from src.controllers.providers_controller import ProvidersController
from src.middlewares.validator import require_fields, require_role

providers_bp = Blueprint("providers", __name__)
_ctrl = ProvidersController()


@providers_bp.get("/")
@jwt_required()
@require_role("admin")
def index():
    return _ctrl.index()


@providers_bp.get("/<int:id>")
@jwt_required()
@require_role("admin")
def show(id):
    return _ctrl.show(id)


@providers_bp.post("/")
@jwt_required()
@require_role("admin")
@require_fields("name")
def store():
    return _ctrl.store()


@providers_bp.put("/<int:id>")
@jwt_required()
@require_role("admin")
@require_fields("name")
def update(id):
    return _ctrl.update(id)


@providers_bp.delete("/<int:id>")
@jwt_required()
@require_role("admin")
def destroy(id):
    return _ctrl.destroy(id)