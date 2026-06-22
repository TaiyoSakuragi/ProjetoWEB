from __future__ import annotations

import traceback
from datetime import datetime, timezone

import src.db_config as _cfg
from flask import has_request_context, request
from flask_jwt_extended import get_jwt_identity

from src.database.repository.firebase_log import FirebaseLogRepository
from src.database.repository.users_repository import UsersRepository


class AuditLogService:
    def __init__(self):
        self._repo = FirebaseLogRepository()
        self._users = UsersRepository(_cfg.engine)

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _request_data(self) -> dict:
        if not has_request_context():
            return {}

        forwarded_for = request.headers.get("X-Forwarded-For", "")
        ip = forwarded_for.split(",")[0].strip() if forwarded_for else request.remote_addr

        return {
            "endpoint": request.path,
            "metodo": request.method,
            "ip": ip,
            "user_agent": request.headers.get("User-Agent", ""),
        }

    def _resolve_usuario(self, fallback: str | None = None) -> str:
        if fallback:
            return fallback

        identity = None
        try:
            identity = get_jwt_identity()
        except Exception:
            identity = None

        if identity:
            try:
                user = self._users.find_by_id(int(identity))
            except (TypeError, ValueError):
                user = None
            if user:
                return user.get("email") or user.get("name") or str(identity)
            return str(identity)

        if has_request_context():
            payload = request.get_json(silent=True) or {}
            return payload.get("usuario") or payload.get("email") or payload.get("name") or "anonimo"

        return "anonimo"

    def _save(self, log: dict):
        payload = {"data_hora": self._now(), **self._request_data(), **self._sanitize(log)}
        self._repo.save(payload)

    def _sanitize(self, value):
        sensitive_keys = {
            "password",
            "password_hash",
            "access_token",
            "refresh_token",
            "token",
            "authorization",
        }

        if isinstance(value, dict):
            sanitized = {}
            for key, item in value.items():
                lowered = str(key).lower()
                if lowered in sensitive_keys or lowered.endswith("_token") or "password" in lowered:
                    sanitized[key] = "***"
                else:
                    sanitized[key] = self._sanitize(item)
            return sanitized

        if isinstance(value, list):
            return [self._sanitize(item) for item in value]

        return value

    def log_access(self, response, tempo_resposta_ms: float):
        status_code = getattr(response, "status_code", None)
        self._save(
            {
                "evento": "acesso_rota",
                "usuario": self._resolve_usuario(),
                "status_code": status_code,
                "tempo_resposta": tempo_resposta_ms,
                "sucesso": status_code is not None and 200 <= status_code < 400,
            }
        )

    def log_login(self, usuario: str, sucesso: bool, detalhes: dict | None = None):
        self._save(
            {
                "evento": "login",
                "usuario": self._resolve_usuario(usuario),
                "sucesso": sucesso,
                "detalhes": detalhes or {},
            }
        )

    def log_logout(self, usuario: str | None = None):
        self._save(
            {
                "evento": "logout",
                "usuario": self._resolve_usuario(usuario),
                "sucesso": True,
            }
        )

    def log_create(self, tabela: str, registro_id, dados_inseridos: dict, usuario: str | None = None):
        self._save(
            {
                "evento": "inclusao",
                "usuario": self._resolve_usuario(usuario),
                "tabela": tabela,
                "registro_id": registro_id,
                "dados_inseridos": dados_inseridos,
            }
        )

    def log_update(
        self,
        tabela: str,
        registro_id,
        antes: dict,
        depois: dict,
        usuario: str | None = None,
    ):
        self._save(
            {
                "evento": "alteracao",
                "usuario": self._resolve_usuario(usuario),
                "tabela": tabela,
                "registro_id": registro_id,
                "antes": antes,
                "depois": depois,
            }
        )

    def log_delete(self, tabela: str, registro_id, dados_excluidos: dict, usuario: str | None = None):
        self._save(
            {
                "evento": "exclusao",
                "usuario": self._resolve_usuario(usuario),
                "tabela": tabela,
                "registro_id": registro_id,
                "dados_excluidos": dados_excluidos,
            }
        )

    def log_error(self, erro, stack_trace: str | None = None, usuario: str | None = None):
        self._save(
            {
                "evento": "erro",
                "usuario": self._resolve_usuario(usuario),
                "erro": str(erro),
                "stack_trace": stack_trace,
            }
        )

    def stack_trace(self) -> str:
        return traceback.format_exc()
