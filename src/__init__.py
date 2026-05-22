from flask import Flask
from src.db_config import jwt, init_db, init_jwt, init_mongo


def create_app():
    app = Flask(__name__)

    # ── 1. Bancos de dados (engine injetada antes de qualquer import de router) ──
    init_db()
    init_jwt(app)
    init_mongo()

    # ── 2. Middlewares ───────────────────────────────────────────────────────────
    from src.middlewares.logger        import register_logger
    from src.middlewares.auth          import register_jwt_handlers
    from src.middlewares.error_handler import register_error_handlers

    register_logger(app)
    register_jwt_handlers(app, jwt)
    register_error_handlers(app)

    # ── 3. Routers (importados após init_db para que a engine já exista) ─────────
    from src.routers.auth_router         import auth_bp
    from src.routers.users_router        import users_bp
    from src.routers.devices_router      import devices_bp
    from src.routers.observations_router import observations_bp

    app.register_blueprint(auth_bp,         url_prefix="/api/auth")
    app.register_blueprint(users_bp,        url_prefix="/api/users")
    app.register_blueprint(devices_bp,      url_prefix="/api/devices")
    app.register_blueprint(observations_bp, url_prefix="/api/observations")

    return app
