import os
from datetime import timedelta
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager

load_dotenv()

jwt    = JWTManager()
engine = None


def init_db():
    """Cria a engine PostgreSQL e injeta nas tabelas via init_tables."""
    global engine
    from src.config.settings    import DB_CONFIG
    from src.database.manager   import DatabaseManager
    from src.database.models    import init_tables

    engine = DatabaseManager(DB_CONFIG).get_engine()
    init_tables(engine)


def init_jwt(app):
    app.config["SECRET_KEY"]                  = os.getenv("SECRET_KEY",     "change-me")
    app.config["JWT_SECRET_KEY"]              = os.getenv("JWT_SECRET_KEY", "change-me-jwt")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"]    = timedelta(minutes=15)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"]   = timedelta(days=30)
    jwt.init_app(app)


def init_firebase():
    """Inicializa o Firebase Admin SDK com as credenciais do .env."""
    import firebase_admin
    from firebase_admin import credentials
    from src.config.settings import REALTIME_CONFIG

    if not firebase_admin._apps:
        cred = credentials.Certificate(REALTIME_CONFIG["CREDENTIALS"])
        firebase_admin.initialize_app(cred, {
            "databaseURL": REALTIME_CONFIG["DATABASE_URL"]
        })

