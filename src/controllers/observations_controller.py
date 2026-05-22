from flask import request, jsonify
from src.interfaces.icontroller         import IController
from src.services.observations_service  import ObservationsService


class ObservationsController(IController):

    def __init__(self):
        self._service = ObservationsService()

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
        return jsonify({"msg": "Observação registrada"}), 201

    def update(self, id: int):
        return jsonify({"msg": "Operação não suportada"}), 405

    def destroy(self, id: int):
        return jsonify({"msg": "Operação não suportada"}), 405

