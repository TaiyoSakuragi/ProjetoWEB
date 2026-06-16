from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete
import src.database.models as _models
from src.interfaces.idao import IDAO


class ProviderRepository(IDAO):
    def __init__(self, engine):
        self.engine = engine

    def find_all(self) -> list[dict]:
        with Session(self.engine) as session:
            stmt = select(_models.provider_table)
            return [dict(row._mapping) for row in session.execute(stmt).all()]

    def find_by_id(self, id: int) -> dict | None:
        with Session(self.engine) as session:
            stmt = select(_models.provider_table).where(_models.provider_table.c.id == id)
            row = session.execute(stmt).first()
            return dict(row._mapping) if row else None

    def save(self, data: dict) -> int:
        with self.engine.begin() as conn:
            result = conn.execute(
                insert(_models.provider_table).values(**data).returning(_models.provider_table.c.id)
            )
            return result.first()[0]

    def update(self, id: int, data: dict):
        allowed = {"name"}
        filtered = {k: v for k, v in data.items() if k in allowed}
        with self.engine.begin() as conn:
            conn.execute(update(_models.provider_table).where(_models.provider_table.c.id == id).values(**filtered))

    def deactivate(self, id: int):
        with self.engine.begin() as conn:
            conn.execute(delete(_models.provider_table).where(_models.provider_table.c.id == id))