import src.db_config as _cfg
from src.interfaces.iservice             import IService
from src.database.repository.device     import DeviceRepository


class DevicesService(IService):

    def __init__(self):
        self._repo = DeviceRepository(_cfg.engine)

    def get_all(self):
        return self._repo.find_all()

    def get_by_id(self, id: int):
        return self._repo.find_by_id(id)

    def create(self, data: dict):
        return self._repo.save(data)

    def update(self, id: int, data: dict):
        return self._repo.update(id, data)

    def delete(self, id: int):
        self._repo.deactivate(id)

