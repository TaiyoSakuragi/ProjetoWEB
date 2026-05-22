import os
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager
from pymongo import MongoClient

load_dotenv()

jwt    = JWTManager()
engine = None
_mongo_db = None


def init_db():
    """Cria a engine PostgreSQL e injeta nas tabelas via init_tables."""
    global engine
    from src.config.settings    import DB_CONFIG
    from src.database.manager   import DatabaseManager
    from src.database.models    import init_tables

    engine = DatabaseManager(DB_CONFIG).get_engine()
    init_tables(engine)


def init_jwt(app):
    app.config["SECRET_KEY"]     = os.getenv("SECRET_KEY",     "change-me")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "change-me-jwt")
    jwt.init_app(app)


def init_mongo():
    global _mongo_db
    client    = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
    _mongo_db = client[os.getenv("MONGO_DB", "projetoweb_logs")]
    return _mongo_db


def get_mongo_db():
    return _mongo_db

