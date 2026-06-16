import time
from flask import request, g
from src.database.repository.firebase_log import FirebaseLogRepository

_repo = FirebaseLogRepository()


def register_logger(app):

    @app.before_request
    def before():
        g.start_time = time.time()

    @app.after_request
    def after(response):
        duration_ms = round((time.time() - g.get("start_time", time.time())) * 1000, 2)
        try:
            _repo.save({
                "method": request.method,
                "path": request.path,
                "status": response.status_code,
                "duration_ms": duration_ms,
            })
        except Exception:
            pass  # Não interrompe a resposta se o Firebase estiver indisponível
        return response
