from flask import Blueprint
from flask_jwt_extended import jwt_required
from src.controllers.observations_controller import ObservationsController
from src.middlewares.validator import require_fields

observations_bp = Blueprint("observations", __name__)
_ctrl = ObservationsController()


@observations_bp.get("/")
@jwt_required()
def index():
    return _ctrl.index()


@observations_bp.get("/<int:id>")
@jwt_required()
def show(id):
    return _ctrl.show(id)


@observations_bp.post("/")
@jwt_required()
@require_fields("device_id", "register")
def store():
    return _ctrl.store()
