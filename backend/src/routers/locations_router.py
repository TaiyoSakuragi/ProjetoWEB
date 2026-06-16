from flask import Blueprint
from flask_jwt_extended import jwt_required
from src.controllers.locations_controller import LocationsController
from src.middlewares.validator import require_fields

locations_bp = Blueprint("locations", __name__)
_ctrl = LocationsController()


@locations_bp.get("/")
@jwt_required()
def show(device_id):
    return _ctrl.show(device_id)


@locations_bp.post("/")
@jwt_required()
@require_fields("latitude", "longitude")
def store(device_id):
    return _ctrl.store(device_id)


@locations_bp.put("/")
@jwt_required()
@require_fields("latitude", "longitude")
def update(device_id):
    return _ctrl.update(device_id)


@locations_bp.delete("/")
@jwt_required()
def destroy(device_id):
    return _ctrl.destroy(device_id)