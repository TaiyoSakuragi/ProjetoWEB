import sys
from unittest.mock import MagicMock, patch

# Garante que geoalchemy2 não bloqueia em ambientes sem PostGIS (ex: CI)
if "geoalchemy2" not in sys.modules:
    sys.modules["geoalchemy2"] = MagicMock()

import pytest


@pytest.fixture(scope="session")
def app():
    """
    Cria a aplicação Flask uma única vez por sessão de testes.
    - init_db  → patchado para não conectar ao PostgreSQL
    - init_mongo → patchado para não conectar ao MongoDB
    - _cfg.engine → MagicMock para que os DAOs possam ser instanciados
    """
    with patch("src.init_db"), patch("src.init_mongo"):
        import src.db_config as _cfg
        _cfg.engine = MagicMock()

        from src import create_app
        application = create_app()
        application.config.update({
            "TESTING": True,
            "JWT_SECRET_KEY": "test-secret-key-com-32-bytes-ok!!",
        })
        yield application


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def token(app):
    from flask_jwt_extended import create_access_token
    with app.app_context():
        return create_access_token(identity="1")


@pytest.fixture
def auth(token):
    """Headers com Bearer token e Content-Type JSON."""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
