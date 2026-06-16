from src.routers.auth_router import auth_bp
from src.routers.users_router import users_bp
from src.routers.devices_router import devices_bp
from src.routers.observations_router import observations_bp

__all__ = ["auth_bp", "users_bp", "devices_bp", "observations_bp"]
