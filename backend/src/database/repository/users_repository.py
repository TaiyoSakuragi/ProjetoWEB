from sqlalchemy.orm         import Session
from sqlalchemy             import select, insert, update
import bcrypt
from werkzeug.security      import generate_password_hash, check_password_hash
import src.database.models as _models
from src.interfaces.idao    import IDAO


class UsersRepository(IDAO):
    def __init__(self, engine):
        self.engine = engine

    def find_all(self, client_id: int | None = None) -> list[dict]:
        with Session(self.engine) as session:
            stmt = select(_models.users_table).where(_models.users_table.c.is_active == True)
            if client_id is not None:
                stmt = stmt.where(_models.users_table.c.client_id == client_id)
            return [dict(row._mapping) for row in session.execute(stmt).all()]

    def find_by_id(self, id: int, client_id: int | None = None) -> dict | None:
        with Session(self.engine) as session:
            stmt = select(_models.users_table).where(_models.users_table.c.id == id)
            if client_id is not None:
                stmt = stmt.where(_models.users_table.c.client_id == client_id)
            row = session.execute(stmt).first()
            return dict(row._mapping) if row else None

    def find_by_email(self, email: str) -> dict | None:
        with Session(self.engine) as session:
            stmt = select(_models.users_table).where(
                _models.users_table.c.email == email,
                _models.users_table.c.is_active == True
            )
            row = session.execute(stmt).first()
            return dict(row._mapping) if row else None

    def save(self, data: dict) -> int:
        data = dict(data)
        data["password_hash"] = generate_password_hash(data.pop("password"))
        with self.engine.begin() as conn:
            result = conn.execute(
                insert(_models.users_table).values(**data).returning(_models.users_table.c.id)
            )
            return result.first()[0]

    def update(self, id: int, data: dict, client_id: int | None = None):
        allowed = {"name", "email", "client_id", "role_id", "is_active"}
        filtered = {k: v for k, v in data.items() if k in allowed}
        with self.engine.begin() as conn:
            stmt = update(_models.users_table).where(_models.users_table.c.id == id)
            if client_id is not None:
                stmt = stmt.where(_models.users_table.c.client_id == client_id)
            conn.execute(stmt.values(**filtered))

    def deactivate(self, id: int, client_id: int | None = None):
        self.update(id, {"is_active": False}, client_id=client_id)

    @staticmethod
    def check_password(user: dict, password: str) -> bool:
        password_hash = user["password_hash"]
        if isinstance(password_hash, str) and password_hash.startswith("$2"):
            return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))

        try:
            return check_password_hash(password_hash, password)
        except ValueError:
            return False
