from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity


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


def require_role(*roles):
    """Decorator que restringe o acesso a usuários com determinadas roles.

    Verifica a role diretamente no banco de dados, ignorando o claim do JWT,
    para evitar que tokens antigos ou adulterados concedam acesso indevido.

    Uso: @require_role("admin") ou @require_role("admin", "operador")
    Deve ser aplicado APÓS @jwt_required().
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            import src.db_config as _cfg
            from src.database.repository.users_repository import UsersRepository
            from src.database.repository.role_repository  import RoleRepository

            user_id = get_jwt_identity()
            user    = UsersRepository(_cfg.engine).find_by_id(int(user_id))
            if not user or not user.get("is_active"):
                return jsonify({"msg": "Usuário não encontrado ou inativo"}), 403

            role = RoleRepository(_cfg.engine).find_by_id(user["role_id"]) if user.get("role_id") else None
            if not role or role["name"] not in roles:
                return jsonify({"msg": "Acesso negado: permissão insuficiente"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator
