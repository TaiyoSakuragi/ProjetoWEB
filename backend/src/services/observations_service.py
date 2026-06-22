import pandas as pd
from flask import abort
import numpy as np
import json
from werkzeug.exceptions import HTTPException
from sqlalchemy.exc import IntegrityError

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

    def _resolve_device_for_ingest(self, data: dict) -> dict:
        user, role = get_current_principal()
        device = None

        def _normalize_external_id(value):
            if value in (None, ""):
                return None

            raw = str(value).strip()
            if raw.isdigit():
                return int(raw)

            # Accept common human formatting like "1.001" or "1,001" for integer IDs.
            compact = raw.replace(".", "").replace(",", "")
            if compact.isdigit() and any(sep in raw for sep in (".", ",")):
                return int(compact)

            abort(422, description="external_id inválido")

        if data.get("id") not in (None, ""):
            try:
                device_id = int(data.get("id"))
            except (TypeError, ValueError):
                abort(422, description="id inválido")
            device = self._device_repo.find_by_id(device_id)
        elif data.get("external_id") not in (None, ""):
            external_id = _normalize_external_id(data.get("external_id"))
            device = self._device_repo.find_by_external_id(external_id)
        elif data.get("device_id") not in (None, ""):
            try:
                device_id = int(data.get("device_id"))
            except (TypeError, ValueError):
                abort(422, description="device_id inválido")
            device = self._device_repo.find_by_id(device_id)
        else:
            abort(422, description="Campos obrigatórios ausentes: id ou external_id")

        if not device:
            abort(404, description="Device não encontrado")

        if role["name"] != "admin" and device.get("client_id") != user.get("client_id"):
            abort(403, description="Acesso negado: cliente diferente")

        return device

    def _handle_insert_integrity_error(self, exc: IntegrityError):
        pgcode = getattr(getattr(exc, "orig", None), "pgcode", None)
        message = str(getattr(exc, "orig", exc)).lower()

        if pgcode == "23505" or "duplicate key value" in message or "violates unique constraint" in message:
            abort(409, description="Observação já existe para este device_id e register")

        abort(422, description="Falha de integridade ao inserir observação")

    def _prepare_ingest_payload(self, data: dict) -> tuple[dict, dict]:
        payload = dict(data)
        device = self._resolve_device_for_ingest(payload)
        payload["device_id"] = device["id"]
        payload.pop("id", None)
        payload.pop("external_id", None)
        payload.pop("device", None)
        return payload, device

    def create_batch_from_ingest(self, rows: list[dict]) -> list[dict]:
        prepared_payloads = []
        created_items = []
        seen_keys = set()

        for idx, row in enumerate(rows, start=1):
            payload, device = self._prepare_ingest_payload(row)

            key = (payload.get("device_id"), str(payload.get("register")))
            if key in seen_keys:
                abort(409, description=f"Observação duplicada no payload (linha {idx})")
            seen_keys.add(key)

            if self._repo.exists_observation(payload["device_id"], payload["register"]):
                abort(409, description=f"Observação já existe para este device_id e register (linha {idx})")

            prepared_payloads.append(payload)
            created_items.append({"device_id": device["id"], "external_id": device.get("external_id")})

        try:
            self._repo.insert_many(prepared_payloads)
        except IntegrityError as e:
            self._handle_insert_integrity_error(e)

        return created_items

    def create_from_ingest(self, data: dict):
        payload, device = self._prepare_ingest_payload(data)
        try:
            self._repo.insert(**payload)
        except IntegrityError as e:
            self._handle_insert_integrity_error(e)
        return {"device_id": device["id"], "external_id": device.get("external_id")}

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

            try:
                self._repo.insert(**payload)
            except IntegrityError as e:
                self._handle_insert_integrity_error(e)
            return {"message": "Observação inserida com sucesso"}
        except HTTPException:
            raise
        except Exception as e:
            abort(500, description=str(e))

    def update(self, id: int, data: dict):
        pass

    def delete(self, id: int):
        pass
