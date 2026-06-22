from flask import Flask, request
from src.db_config import jwt, init_db, init_jwt, init_firebase


def create_app():
    app = Flask(__name__)

    @app.after_request
    def add_cors_headers(response):
        # Dev-friendly CORS to allow frontend running on a different local origin.
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        return response

    @app.route("/api/<path:_unused>", methods=["OPTIONS"])
    def options_preflight(_unused):
        return ("", 204)

    # ── 1. Bancos de dados (engine injetada antes de qualquer import de router) ──
    init_db()
    init_jwt(app)
    init_firebase()

    # ── 2. Middlewares ───────────────────────────────────────────────────────────
    from src.middlewares.logger        import register_logger
    from src.middlewares.auth          import register_jwt_handlers
    from src.middlewares.error_handler import register_error_handlers

    register_logger(app)
    register_jwt_handlers(app, jwt)
    register_error_handlers(app)

    # ── 3. Routers (importados após init_db para que a engine já exista) ─────────
    from src.routers.auth_router         import auth_bp
    from src.routers.clients_router      import clients_bp
    from src.routers.types_router        import types_bp
    from src.routers.providers_router    import providers_bp
    from src.routers.locations_router    import locations_bp
    from src.routers.users_router        import users_bp
    from src.routers.devices_router      import devices_bp
    from src.routers.observations_router import observations_bp
    from src.routers.roles_router        import roles_bp
    from src.routers.logs_router         import logs_bp

    app.register_blueprint(auth_bp,         url_prefix="/api/auth")
    app.register_blueprint(clients_bp,      url_prefix="/api/clients")
    app.register_blueprint(types_bp,        url_prefix="/api/types")
    app.register_blueprint(providers_bp,    url_prefix="/api/providers")
    app.register_blueprint(locations_bp,    url_prefix="/api/devices/<int:device_id>/location")
    app.register_blueprint(users_bp,        url_prefix="/api/users")
    app.register_blueprint(devices_bp,      url_prefix="/api/devices")
    app.register_blueprint(observations_bp, url_prefix="/api/observations")
    app.register_blueprint(roles_bp,        url_prefix="/api/roles")
    app.register_blueprint(logs_bp,         url_prefix="/api/logs")

    return app
