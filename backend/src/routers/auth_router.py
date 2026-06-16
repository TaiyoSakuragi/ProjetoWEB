from flask import Blueprint
from src.controllers.auth_controller import AuthController

auth_bp = Blueprint("auth", __name__)
_ctrl = AuthController()


@auth_bp.post("/login")
def login():
    return _ctrl.login()


@auth_bp.post("/refresh")
def refresh():
    return _ctrl.refresh()
