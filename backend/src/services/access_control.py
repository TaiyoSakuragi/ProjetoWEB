import src.db_config as _cfg
from flask import abort
from flask_jwt_extended import get_jwt_identity

from src.database.repository.role_repository import RoleRepository
from src.database.repository.users_repository import UsersRepository


def get_current_principal() -> tuple[dict, dict]:
    user_id = get_jwt_identity()
    user = UsersRepository(_cfg.engine).find_by_id(int(user_id))
    if not user or not user.get("is_active"):
        abort(403, description="Usuário não encontrado ou inativo")

    role = RoleRepository(_cfg.engine).find_by_id(user["role_id"]) if user.get("role_id") else None
    if not role:
        abort(403, description="Acesso negado: permissão insuficiente")

    return user, role


def is_admin() -> bool:
    _, role = get_current_principal()
    return role["name"] == "admin"


def ensure_same_client(target_client_id: int | None):
    user, role = get_current_principal()
    if role["name"] == "admin":
        return user, role

    if target_client_id is None or user.get("client_id") != target_client_id:
        abort(403, description="Acesso negado: cliente diferente")

    return user, role


def current_client_id() -> int:
    user, _ = get_current_principal()
    return user.get("client_id")