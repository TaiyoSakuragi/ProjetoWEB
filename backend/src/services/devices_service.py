import src.db_config as _cfg
from flask import abort
from src.interfaces.iservice             import IService
from src.database.repository.device     import DeviceRepository
from src.services.access_control import get_current_principal


class DevicesService(IService):

    def __init__(self):
        self._repo = DeviceRepository(_cfg.engine)

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
        if role["name"] != "admin":
            if payload.get("client_id") not in (None, user.get("client_id")):
                abort(403, description="Acesso negado: cliente diferente")
            payload["client_id"] = user.get("client_id")
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

        return self._repo.update(id, payload, client_id=target.get("client_id") if role["name"] != "admin" else None)

    def delete(self, id: int):
        user, role = get_current_principal()
        target = self._repo.find_by_id(id)
        if not target:
            abort(404)
        if role["name"] != "admin" and target.get("client_id") != user.get("client_id"):
            abort(403, description="Acesso negado: cliente diferente")

        self._repo.deactivate(id, client_id=target.get("client_id") if role["name"] != "admin" else None)

