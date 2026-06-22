import src.db_config as _cfg
from flask import abort
from src.interfaces.iservice             import IService
from src.database.repository.device     import DeviceRepository
from src.database.repository.provider_repository import ProviderRepository
from src.database.repository.type_repository import TypeRepository
from src.services.access_control import get_current_principal


class DevicesService(IService):

    def __init__(self):
        self._repo = DeviceRepository(_cfg.engine)
        self._provider_repo = ProviderRepository(_cfg.engine)
        self._type_repo = TypeRepository(_cfg.engine)

    def _require_fields(self, data: dict, fields: list[str]):
        missing = [field for field in fields if data.get(field) in (None, "")]
        if missing:
            abort(422, description=f"Campos obrigatórios ausentes: {', '.join(missing)}")

    def _validate_references(self, data: dict):
        type_id = data.get("type_id")
        provider_id = data.get("provider_id")

        try:
            type_id = int(type_id)
            provider_id = int(provider_id)
        except (TypeError, ValueError):
            abort(422, description="type_id/provider_id devem ser inteiros válidos")

        if self._type_repo.find_by_id(type_id) is None:
            abort(422, description="type_id inválido: tipo não encontrado")
        if self._provider_repo.find_by_id(provider_id) is None:
            abort(422, description="provider_id inválido: provedor não encontrado")

    def get_all(self):
        user, role = get_current_principal()
        if role["name"] == "admin":
            return self._repo.find_all()
        return self._repo.find_all(client_id=user["client_id"])

    def get_by_id(self, id: int):
        user, role = get_current_principal()
        target = self._repo.find_by_id(id)
        if not target:
            abort(404)
        if role["name"] != "admin" and target.get("client_id") != user.get("client_id"):
            abort(403, description="Acesso negado: cliente diferente")
        return target

    def create(self, data: dict):
        user, role = get_current_principal()
        payload = dict(data)
        self._require_fields(
            payload,
            ["external_id", "name", "type_id", "provider_id", "is_active", "timezone", "availability_interval"],
        )
        self._validate_references(payload)
        payload["client_id"] = user.get("client_id")
        if payload.get("client_id") is None:
            abort(400, description="Usuário sem client_id associado")
        return self._repo.save(payload)

    def update(self, id: int, data: dict):
        user, role = get_current_principal()
        target = self._repo.find_by_id(id)
        if not target:
            abort(404)
        if role["name"] != "admin" and target.get("client_id") != user.get("client_id"):
            abort(403, description="Acesso negado: cliente diferente")

        payload = dict(data)
        if role["name"] != "admin":
            payload["client_id"] = user.get("client_id")

        if "type_id" in payload or "provider_id" in payload:
            self._validate_references({
                "type_id": payload.get("type_id", target.get("type_id")),
                "provider_id": payload.get("provider_id", target.get("provider_id")),
            })

        return self._repo.update(id, payload, client_id=target.get("client_id") if role["name"] != "admin" else None)

    def delete(self, id: int):
        user, role = get_current_principal()
        target = self._repo.find_by_id(id)
        if not target:
            abort(404)
        if role["name"] != "admin" and target.get("client_id") != user.get("client_id"):
            abort(403, description="Acesso negado: cliente diferente")

        self._repo.deactivate(id, client_id=target.get("client_id") if role["name"] != "admin" else None)

