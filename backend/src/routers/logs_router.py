from flask import Blueprint
from flask_jwt_extended import jwt_required
from src.controllers.logs_controller import LogsController

logs_bp = Blueprint("logs", __name__)
_ctrl = LogsController()


@logs_bp.get("/")
@jwt_required()
def index():
    return _ctrl.index()


@logs_bp.get("/export")
@jwt_required()
def export_xml():
    return _ctrl.export_xml()
