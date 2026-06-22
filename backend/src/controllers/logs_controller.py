from flask import Response, jsonify, request
from src.services.log_service import LogService
from src.services.access_control import is_admin
from flask import abort


class LogsController:
    def __init__(self):
        self._service = LogService()

    def index(self):
        if not is_admin():
            abort(403, description="Acesso negado: permissão insuficiente")
        limit = request.args.get("limit", 100, type=int)
        logs = self._service.get_recent(limit)
        return jsonify(logs), 200

    def export_xml(self):
        if not is_admin():
            abort(403, description="Acesso negado: permissão insuficiente")
        limit = request.args.get("limit", 100, type=int)
        logs = self._service.get_recent(limit)
        xml_content = self._service.to_xml(logs)
        return Response(
            xml_content,
            status=200,
            mimetype="application/xml",
            headers={"Content-Disposition": "attachment; filename=logs.xml"},
        )
