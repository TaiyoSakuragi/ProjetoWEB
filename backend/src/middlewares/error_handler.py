from flask import jsonify
from src.services.audit_log_service import AuditLogService

_audit = AuditLogService()


def register_error_handlers(app):

    @app.errorhandler(400)
    def bad_request(e):
        _audit.log_error(e, _audit.stack_trace())
        return jsonify({"msg": "Requisição inválida"}), 400

    @app.errorhandler(404)
    def not_found(e):
        _audit.log_error(e)
        return jsonify({"msg": "Recurso não encontrado"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        _audit.log_error(e)
        return jsonify({"msg": "Método não permitido"}), 405

    @app.errorhandler(403)
    def forbidden(e):
        message = getattr(e, "description", None) or "Acesso negado"
        _audit.log_error(message)
        return jsonify({"msg": message}), 403

    @app.errorhandler(422)
    def unprocessable(e):
        _audit.log_error(e)
        return jsonify({"msg": "Dados inválidos"}), 422

    @app.errorhandler(500)
    def internal_error(e):
        _audit.log_error(e, _audit.stack_trace())
        return jsonify({"msg": "Erro interno do servidor"}), 500
