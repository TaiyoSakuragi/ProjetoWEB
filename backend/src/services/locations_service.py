import src.db_config as _cfg
from flask import abort
from src.interfaces.iservice import IService
from src.database.repository.location_repository import LocationRepository
from src.database.repository.device import DeviceRepository
from src.services.access_control import ensure_same_client, current_client_id


class LocationsService(IService):
    def __init__(self):
        self._repo = LocationRepository(_cfg.engine)
        self._device_repo = DeviceRepository(_cfg.engine)

    def get_all(self):
        return []

    def get_by_id(self, id: int):
        return self.get_by_device(id)

    def get_by_device(self, device_id: int):
        device = self._device_repo.find_by_id(device_id)
        if not device:
            abort(404)
        ensure_same_client(device.get("client_id"))
        return self._repo.find_by_device_id(device_id)

    def create(self, device_id: int, data: dict):
        device = self._device_repo.find_by_id(device_id)
        if not device:
            abort(404)
        ensure_same_client(device.get("client_id"))
        payload = dict(data)
        payload["device_id"] = device_id

        existing_location = self._repo.find_by_device_id(device_id)
        if existing_location:
            self._repo.update(device_id, payload)
            return device_id

        return self._repo.save(payload)

    def update(self, device_id: int, data: dict):
        device = self._device_repo.find_by_id(device_id)
        if not device:
            abort(404)
        ensure_same_client(device.get("client_id"))
        self._repo.update(device_id, data)
        return self._repo.find_by_device_id(device_id)

    def delete(self, device_id: int):
        device = self._device_repo.find_by_id(device_id)
        if not device:
            abort(404)
        ensure_same_client(device.get("client_id"))
        self._repo.deactivate(device_id)