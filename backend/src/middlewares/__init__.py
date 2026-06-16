from src.middlewares.auth import register_jwt_handlers
from src.middlewares.logger import register_logger
from src.middlewares.validator import require_fields
from src.middlewares.error_handler import register_error_handlers

__all__ = [
    "register_jwt_handlers",
    "register_logger",
    "require_fields",
    "register_error_handlers",
]
