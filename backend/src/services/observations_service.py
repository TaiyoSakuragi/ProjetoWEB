import pandas as pd
from flask import abort
import numpy as np
import json

import src.db_config as _cfg

from src.interfaces.iservice                import IService
from src.database.repository.weather        import WeatherRepository
from src.database.repository.device         import DeviceRepository
from src.services.access_control            import get_current_principal


class ObservationsService(IService):

    def __init__(self):
        self._repo = WeatherRepository(_cfg.engine)
        self._device_repo = DeviceRepository(_cfg.engine)

    def _serialize_observations(self, df):
        if df.empty:
            return []
        
        records = df.replace({np.nan: None}).to_dict(orient="records")
        
        for record in records:
            if 'register' in record and record['register'] is not None:
                if isinstance(record['register'], str):
                    record['register'] = record['register'][:19]
                else:
                    record['register'] = pd.Timestamp(record['register']).strftime('%Y-%m-%d %H:%M:%S')
                    
        return records

    def get_all(self):
        user, role = get_current_principal()
        client_id = None if role["name"] == "admin" else user.get("client_id")
        df = self._repo.get_all_history(client_id=client_id)
        return self._serialize_observations(df)

    def get_by_id(self, id: int):
        return None

    def get_by_device(self, device_id: int, start: str, end: str):
        user, role = get_current_principal()
        device = self._device_repo.find_by_id(device_id)
        if not device:
            abort(404)
        if role["name"] != "admin" and device.get("client_id") != user.get("client_id"):
            abort(403, description="Acesso negado: cliente diferente")
        client_id = None if role["name"] == "admin" else user.get("client_id")
        df = self._repo.get_history(device_id, start, end, client_id=client_id)
        return self._serialize_observations(df)

    def create(self, data: dict):
        user, role = get_current_principal()
        payload = dict(data)
        if "device_id" not in payload or "register" not in payload:
            abort(422, description="Campos obrigatórios ausentes: device_id, register")

        try:
            device = self._device_repo.find_by_id(payload["device_id"])
            if not device:
                abort(404, description="Device não encontrado")

            if role["name"] != "admin" and device.get("client_id") != user.get("client_id"):
                abort(403, description="Acesso negado: cliente diferente")

            self._repo.insert(**payload)
            return {"message": "Observação inserida com sucesso"}
        except Exception as e:
            abort(500, description=str(e))

    def update(self, id: int, data: dict):
        pass

    def delete(self, id: int):
        pass
