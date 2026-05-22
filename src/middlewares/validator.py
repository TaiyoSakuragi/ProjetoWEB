from functools import wraps
from flask import request, jsonify


def require_fields(*fields):
    """Decorator que valida a presença de campos obrigatórios no body JSON."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            data = request.get_json(silent=True) or {}
            missing = [f for f in fields if f not in data]
            if missing:
                return jsonify({"msg": f"Campos obrigatórios ausentes: {', '.join(missing)}"}), 422
            return fn(*args, **kwargs)
        return wrapper
    return decorator
