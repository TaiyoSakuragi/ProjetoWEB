import csv
import io
import xml.etree.ElementTree as ET

from flask import request, jsonify, Response, abort
from werkzeug.exceptions import HTTPException
from src.interfaces.icontroller     import IController
from src.services.devices_service   import DevicesService
from src.services.audit_log_service import AuditLogService


class DevicesController(IController):
    REQUIRED_INGEST_FIELDS = (
        "external_id",
        "name",
        "type_id",
        "provider_id",
        "is_active",
        "timezone",
        "availability_interval",
    )

    def __init__(self):
        self._service = DevicesService()
        self._audit = AuditLogService()

    def index(self):
        devices = self._service.get_all()
        return jsonify(
            [{"id": d["id"], "name": d["name"], "external_id": d.get("external_id")} for d in devices]
        ), 200

    def _response_format(self) -> str:
        accept = (request.headers.get("Accept") or "").lower()
        mimetype = (request.mimetype or "").lower()
        if "application/xml" in accept or mimetype in {"application/xml", "text/xml"}:
            return "xml"
        return "json"

    def _xml_to_dict(self, xml_text: str) -> dict:
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError:
            abort(400, description="XML inválido")

        return {child.tag: child.text for child in root}

    def _xml_to_devices(self, xml_text: str) -> list[dict]:
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError:
            abort(400, description="XML inválido")

        def node_to_dict(node):
            return {child.tag: child.text for child in node}

        if root.tag == "devices":
            return [node_to_dict(node) for node in root.findall("device")]

        if root.tag == "device":
            return [node_to_dict(root)]
        abort(422, description="XML inválido para devices: use raiz <devices> ou <device>")

    def _serialize_device(self, device: dict) -> dict:
        return {
            "id": device.get("id"),
            "external_id": device.get("external_id"),
            "name": device.get("name"),
            "type_id": device.get("type_id"),
            "provider_id": device.get("provider_id"),
            "is_active": device.get("is_active"),
            "timezone": device.get("timezone"),
            "availability_interval": device.get("availability_interval"),
            "client_id": device.get("client_id"),
        }

    def _device_xml_response(self, device: dict, status: int = 201):
        root = ET.Element("device")
        for key, value in self._serialize_device(device).items():
            child = ET.SubElement(root, key)
            child.text = "" if value is None else str(value)
        ET.indent(root, space="    ")
        xml_content = ET.tostring(root, encoding="utf-8", xml_declaration=True).decode("utf-8")
        return Response(xml_content, status=status, mimetype="application/xml")

    def _devices_xml_response(self, devices: list[dict], status: int = 201):
        root = ET.Element("devices")
        for device in devices:
            entry = ET.SubElement(root, "device")
            for key, value in self._serialize_device(device).items():
                child = ET.SubElement(entry, key)
                child.text = "" if value is None else str(value)
        ET.indent(root, space="    ")
        xml_content = ET.tostring(root, encoding="utf-8", xml_declaration=True).decode("utf-8")
        return Response(xml_content, status=status, mimetype="application/xml")

    def _parse_single_payload(self) -> dict:
        if request.mimetype in {"application/xml", "text/xml"}:
            return self._coerce_device_payload(self._xml_to_dict(request.get_data(as_text=True)))
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            abort(400, description="Payload inválido")
        return self._coerce_device_payload(payload)

    def show(self, id: int):
        device = self._service.get_by_id(id)
        if not device:
            return jsonify({"msg": "Dispositivo não encontrado"}), 404
        return jsonify({
            "id":                   device["id"],
            "name":                 device["name"],
            "external_id":          device.get("external_id"),
            "timezone":             device.get("timezone"),
            "is_active":            device.get("is_active"),
        }), 200

    def store(self):
        data = self._parse_single_payload()
        device_id = self._service.create(data)
        device = self._service.get_by_id(device_id)
        self._audit.log_create("devices", device_id, data)
        response_payload = self._serialize_device(device)
        if self._response_format() == "xml":
            return self._device_xml_response(response_payload, status=201)
        return jsonify(response_payload), 201

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

    def _to_int(self, value):
        if value in (None, ""):
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return value

    def _coerce_device_payload(self, payload: dict) -> dict:
        data = dict(payload)
        for key in ("type_id", "provider_id", "availability_interval"):
            if key in data:
                data[key] = self._to_int(data.get(key))
        if "is_active" in data:
            data["is_active"] = self._to_bool(data.get("is_active"))
        return data

    def _sanitize_station_row(self, row: dict) -> dict:
        data = {
            "external_id": row.get("external_id"),
            "name": row.get("name"),
            "type_id": self._to_int(row.get("type_id")),
            "provider_id": self._to_int(row.get("provider_id")),
            "is_active": self._to_bool(row.get("is_active")),
            "timezone": row.get("timezone"),
            "availability_interval": self._to_int(row.get("availability_interval")),
        }
        return {k: v for k, v in data.items() if v not in (None, "")}

    def _parse_ingest_payload(self) -> list[dict]:
        if request.mimetype in {"application/xml", "text/xml"}:
            return [self._coerce_device_payload(item) for item in self._xml_to_devices(request.get_data(as_text=True))]

        if request.is_json:
            payload = request.get_json(silent=True)
            if isinstance(payload, list):
                return [self._coerce_device_payload(item) for item in payload]
            if isinstance(payload, dict):
                if isinstance(payload.get("stations"), list):
                    return [self._coerce_device_payload(item) for item in payload.get("stations")]
                if isinstance(payload.get("devices"), list):
                    return [self._coerce_device_payload(item) for item in payload.get("devices")]
                return [self._coerce_device_payload(payload)]
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
        missing_header = [field for field in self.REQUIRED_INGEST_FIELDS if field not in header]
        if missing_header:
            abort(422, description=f"CSV inválido: colunas obrigatórias ausentes: {', '.join(missing_header)}")

        return [self._coerce_device_payload(row) for row in reader]

    def _validate_rows_strict(self, rows: list[dict]):
        if not rows:
            abort(400, description="Payload de ingest vazio")

        invalid_rows = []
        for idx, row in enumerate(rows, start=1):
            payload = self._sanitize_station_row(row)
            missing = [field for field in self.REQUIRED_INGEST_FIELDS if payload.get(field) in (None, "")]
            if missing:
                invalid_rows.append({"index": idx, "missing": missing})

        if invalid_rows:
            details = "; ".join(
                f"linha {item['index']}: {', '.join(item['missing'])}" for item in invalid_rows
            )
            abort(422, description=f"Campos obrigatórios ausentes no payload: {details}")

    def ingest(self):
        rows = self._parse_ingest_payload()
        self._validate_rows_strict(rows)
        created = 0
        errors = []
        created_devices = []

        for idx, row in enumerate(rows, start=1):
            try:
                payload = self._sanitize_station_row(row)
                device_id = self._service.create(payload)
                created += 1
                device = self._service.get_by_id(device_id)
                created_devices.append(self._serialize_device(device))
                self._audit.log_create("devices", device_id, payload)
            except HTTPException as e:
                errors.append({"index": idx, "error": getattr(e, "description", str(e))})
            except Exception as e:
                errors.append({"index": idx, "error": str(e)})

        status = 201 if not errors else 207
        response_payload = {"received": len(rows), "created": created, "errors": errors, "devices": created_devices}
        if self._response_format() == "xml":
            root = ET.Element("devices_result")
            ET.SubElement(root, "received").text = str(len(rows))
            ET.SubElement(root, "created").text = str(created)
            errors_node = ET.SubElement(root, "errors")
            for err in errors:
                err_node = ET.SubElement(errors_node, "error")
                for key, value in err.items():
                    child = ET.SubElement(err_node, key)
                    child.text = "" if value is None else str(value)
            devices_node = ET.SubElement(root, "devices")
            for device in created_devices:
                entry = ET.SubElement(devices_node, "device")
                for key, value in device.items():
                    child = ET.SubElement(entry, key)
                    child.text = "" if value is None else str(value)
            ET.indent(root, space="    ")
            xml_content = ET.tostring(root, encoding="utf-8", xml_declaration=True).decode("utf-8")
            return Response(xml_content, status=status, mimetype="application/xml")
        return jsonify(response_payload), status

    def update(self, id: int):
        device = self._service.get_by_id(id)
        if not device:
            return jsonify({"msg": "Dispositivo não encontrado"}), 404
        data = self._parse_single_payload()
        before = dict(device)
        updated_device = self._service.update(id, data)
        self._audit.log_update("devices", id, before, updated_device)
        response_payload = self._serialize_device(updated_device)
        if self._response_format() == "xml":
            return self._device_xml_response(response_payload, status=200)
        return jsonify(response_payload), 200

    def destroy(self, id: int):
        device = self._service.get_by_id(id)
        if not device:
            return jsonify({"msg": "Dispositivo não encontrado"}), 404
        before = dict(device)
        self._service.delete(id)
        self._audit.log_delete("devices", id, before)
        return jsonify({"msg": "Dispositivo desativado"}), 200

