from flask import Blueprint
from flask_jwt_extended import jwt_required
from src.controllers.clients_controller import ClientsController
from src.middlewares.validator import require_fields, require_role

clients_bp = Blueprint("clients", __name__)
_ctrl = ClientsController()


@clients_bp.get("/")
@jwt_required()
@require_role("admin")
def index():
    return _ctrl.index()


@clients_bp.get("/<int:id>")
@jwt_required()
@require_role("admin")
def show(id):
    return _ctrl.show(id)


@clients_bp.post("/")
@jwt_required()
@require_role("admin")
@require_fields("company_name")
def store():
    return _ctrl.store()


@clients_bp.put("/<int:id>")
@jwt_required()
@require_role("admin")
@require_fields("company_name")
def update(id):
    return _ctrl.update(id)


@clients_bp.delete("/<int:id>")
@jwt_required()
@require_role("admin")
def destroy(id):
    return _ctrl.destroy(id)