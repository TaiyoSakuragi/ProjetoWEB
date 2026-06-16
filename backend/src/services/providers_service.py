import src.db_config as _cfg
from flask import abort
from src.interfaces.iservice import IService
from src.database.repository.provider_repository import ProviderRepository
from src.services.access_control import is_admin


class ProvidersService(IService):
    def __init__(self):
        self._repo = ProviderRepository(_cfg.engine)

    def get_all(self):
        if not is_admin():
            abort(403, description="Acesso negado: permissão insuficiente")
        return self._repo.find_all()

    def get_by_id(self, id: int):
        if not is_admin():
            abort(403, description="Acesso negado: permissão insuficiente")
        return self._repo.find_by_id(id)

    def create(self, data: dict):
        if not is_admin():
            abort(403, description="Acesso negado: permissão insuficiente")
        return self._repo.save(data)

    def update(self, id: int, data: dict):
        if not is_admin():
            abort(403, description="Acesso negado: permissão insuficiente")
        self._repo.update(id, data)
        return self._repo.find_by_id(id)

    def delete(self, id: int):
        if not is_admin():
            abort(403, description="Acesso negado: permissão insuficiente")
        self._repo.deactivate(id)