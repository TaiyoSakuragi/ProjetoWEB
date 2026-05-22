import pandas as pd
import src.db_config as _cfg
from src.interfaces.iservice             import IService
from src.database.repository.weather    import WeatherRepository


class ObservationsService(IService):

    def __init__(self):
        self._repo = WeatherRepository(_cfg.engine)

    def get_all(self):
        return []

    def get_by_id(self, id: int):
        return None

    def get_by_device(self, device_id: int, start: str, end: str):
        return self._repo.get_history(device_id, start, end).to_dict(orient="records")

    def create(self, data: dict):
        self._repo.save_observations(pd.DataFrame([data]))

    def update(self, id: int, data: dict):
        raise NotImplementedError("Observações são registros imutáveis.")

    def delete(self, id: int):
        raise NotImplementedError("Observações são registros imutáveis.")

