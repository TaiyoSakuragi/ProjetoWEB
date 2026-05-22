from sqlalchemy.orm         import Session
from sqlalchemy             import select, insert, update
from werkzeug.security      import generate_password_hash, check_password_hash
from src.database.models    import users_table
from src.interfaces.idao    import IDAO


class UsersRepository(IDAO):
    def __init__(self, engine):
        self.engine = engine

    def find_all(self) -> list[dict]:
        with Session(self.engine) as session:
            stmt = select(users_table).where(users_table.c.is_active == True)
            return [dict(row._mapping) for row in session.execute(stmt).all()]

    def find_by_id(self, id: int) -> dict | None:
        with Session(self.engine) as session:
            stmt = select(users_table).where(users_table.c.id == id)
            row = session.execute(stmt).first()
            return dict(row._mapping) if row else None

    def find_by_email(self, email: str) -> dict | None:
        with Session(self.engine) as session:
            stmt = select(users_table).where(
                users_table.c.email == email,
                users_table.c.is_active == True
            )
            row = session.execute(stmt).first()
            return dict(row._mapping) if row else None

    def save(self, data: dict) -> int:
        data = dict(data)
        data["password_hash"] = generate_password_hash(data.pop("password"))
        with self.engine.begin() as conn:
            result = conn.execute(
                insert(users_table).values(**data).returning(users_table.c.id)
            )
            return result.first()[0]

    def update(self, id: int, data: dict):
        allowed = {"name", "email", "client_id", "role_id", "is_active"}
        filtered = {k: v for k, v in data.items() if k in allowed}
        with self.engine.begin() as conn:
            conn.execute(update(users_table).where(users_table.c.id == id).values(**filtered))

    def deactivate(self, id: int):
        self.update(id, {"is_active": False})

    @staticmethod
    def check_password(user: dict, password: str) -> bool:
        return check_password_hash(user["password_hash"], password)
