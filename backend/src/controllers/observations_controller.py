import csv
import io

from flask import request, jsonify
from werkzeug.exceptions import HTTPException
from src.interfaces.icontroller         import IController
from src.services.observations_service  import ObservationsService
from src.services.audit_log_service import AuditLogService


class ObservationsController(IController):
    REQUIRED_FIELDS = ("register",)
    IDENTIFIER_FIELDS = ("id", "external_id")

    def __init__(self):
        self._service = ObservationsService()
        self._audit = AuditLogService()

    def index(self):
        return jsonify(self._service.get_all()), 200

    def show(self, id: int):
        # id = device_id; usa query params start/end para filtrar o período
        start = request.args.get("start", "2000-01-01")
        end   = request.args.get("end",   "2099-12-31")
        return jsonify(self._service.get_by_device(id, start, end)), 200

    def store(self):
        data = request.get_json()
        self._service.create(data)
        self._audit.log_create("observations", data.get("device_id"), data)
        return jsonify({"msg": "Observação registrada"}), 201

    def _to_int(self, value):
        if value in (None, ""):
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return value

    def _to_bool(self, value):
        if isinstance(value, bool):
            return value
        if value is None:
            return None
        text = str(value).strip().lower()
        if text in {"1", "true", "t", "yes", "y", "sim"}:
            return True
        if text in {"0", "false", "f", "no", "n", "nao", "não"}:
            return False
        return value

    def _to_float(self, value):
        if value in (None, ""):
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return value

    def _parse_ingest_payload(self) -> list[dict]:
        if request.is_json:
            payload = request.get_json(silent=True)
            if isinstance(payload, list):
                return payload
            if isinstance(payload, dict):
                if isinstance(payload.get("observations"), list):
                    return payload.get("observations")
                return [payload]
            return []

        uploaded = request.files.get("file")
        if uploaded:
            content = uploaded.read().decode("utf-8-sig")
        else:
            content = request.get_data(as_text=True)

        if not content.strip():
            return []

        reader = csv.DictReader(io.StringIO(content))
        header = set(reader.fieldnames or [])

        missing_required_header = [field for field in self.REQUIRED_FIELDS if field not in header]
        has_identifier_header = any(field in header for field in self.IDENTIFIER_FIELDS)

        if missing_required_header:
            return []
        if not has_identifier_header:
            return []

        return list(reader)

    def _sanitize_ingest_row(self, row: dict) -> dict:
        data = {
            "id": self._to_int(row.get("id")),
            "external_id": row.get("external_id"),
            "device_id": self._to_int(row.get("device_id")),
            "register": row.get("register"),
            "rain_accumulated": self._to_float(row.get("rain_accumulated")),
            "wind_speed": self._to_float(row.get("wind_speed")),
            "wind_direction": self._to_float(row.get("wind_direction")),
            "air_humidity": self._to_float(row.get("air_humidity")),
            "air_temperature": self._to_float(row.get("air_temperature")),
            "air_pressure": self._to_float(row.get("air_pressure")),
            "quality_flag": self._to_bool(row.get("quality_flag")),
        }
        return {k: v for k, v in data.items() if v not in (None, "")}

    def _validate_rows_strict(self, rows: list[dict]) -> list[dict]:
        if not rows:
            return []

        sanitized_rows = []
        invalid_rows = []

        for idx, row in enumerate(rows, start=1):
            payload = self._sanitize_ingest_row(row)
            missing = [field for field in self.REQUIRED_FIELDS if payload.get(field) in (None, "")]
            has_identifier = any(payload.get(field) not in (None, "") for field in self.IDENTIFIER_FIELDS)

            if missing or not has_identifier:
                reasons = []
                if missing:
                    reasons.append(f"faltando: {', '.join(missing)}")
                if not has_identifier:
                    reasons.append("faltando: id ou external_id")
                invalid_rows.append(f"linha {idx} ({'; '.join(reasons)})")
                continue

            sanitized_rows.append(payload)

        if invalid_rows:
            raise ValueError("Payload inválido para ingest: " + "; ".join(invalid_rows))

        return sanitized_rows

    def ingest(self):
        rows = self._parse_ingest_payload()

        if not rows:
            return jsonify({"msg": "Payload inválido: informe register e id/external_id no JSON/CSV"}), 422

        try:
            rows = self._validate_rows_strict(rows)
        except ValueError as e:
            return jsonify({"msg": str(e)}), 422

        try:
            created_items = self._service.create_batch_from_ingest(rows)
        except HTTPException as e:
            return jsonify({"msg": getattr(e, "description", str(e))}), e.code or 500
        except Exception:
            return jsonify({"msg": "Falha ao processar ingestão de observações"}), 500

        for row, resolved in zip(rows, created_items):
            payload = self._sanitize_ingest_row(row)
            self._audit.log_create("observations", resolved.get("device_id"), payload)

        return jsonify({"received": len(rows), "created": len(created_items), "errors": [], "observations": created_items}), 201

    def update(self, id: int):
        return jsonify({"msg": "Operação não suportada"}), 405

    def destroy(self, id: int):
        return jsonify({"msg": "Operação não suportada"}), 405

