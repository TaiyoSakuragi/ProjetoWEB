import time
from flask import g
from src.services.audit_log_service import AuditLogService

_audit = AuditLogService()


def register_logger(app):

    @app.before_request
    def before():
        g.start_time = time.time()

    @app.after_request
    def after(response):
        duration_ms = round((time.time() - g.get("start_time", time.time())) * 1000, 2)
        try:
            _audit.log_access(response, duration_ms)
        except Exception:
            pass  # Não interrompe a resposta se o Firebase estiver indisponível
        return response
