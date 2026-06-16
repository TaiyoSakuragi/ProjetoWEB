from flask import Blueprint
from flask_jwt_extended import jwt_required
from src.controllers.devices_controller import DevicesController
from src.middlewares.validator import require_fields

devices_bp = Blueprint("devices", __name__)
_ctrl = DevicesController()


@devices_bp.get("/")
@jwt_required()
def index():
    return _ctrl.index()


@devices_bp.get("/<int:id>")
@jwt_required()
def show(id):
    return _ctrl.show(id)


@devices_bp.post("/")
@jwt_required()
@require_fields("name")
def store():
    return _ctrl.store()


@devices_bp.put("/<int:id>")
@jwt_required()
def update(id):
    return _ctrl.update(id)


@devices_bp.delete("/<int:id>")
@jwt_required()
def destroy(id):
    return _ctrl.destroy(id)
