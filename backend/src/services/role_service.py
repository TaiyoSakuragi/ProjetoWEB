import src.db_config as _cfg
from src.interfaces.iservice                    import IService
from src.database.repository.role_repository   import RoleRepository


class RoleService(IService):
    def __init__(self):
        self._repo = RoleRepository(_cfg.engine)

    def get_all(self):
        return self._repo.find_all()

    def get_by_id(self, id: int):
        return self._repo.find_by_id(id)

    def create(self, data: dict):
        return self._repo.save(data)

    def update(self, id: int, data: dict):
        self._repo.update(id, data)
        return self._repo.find_by_id(id)

    def delete(self, id: int):
        self._repo.deactivate(id)
