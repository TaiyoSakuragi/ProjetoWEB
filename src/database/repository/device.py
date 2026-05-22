from sqlalchemy.orm         import Session
from sqlalchemy             import select, insert, update as sa_update
from src.database.models    import device_table, provider_table
from src.interfaces.idao    import IDAO
import src.database.models as _models


class DeviceRepository(IDAO):
    def __init__(self, engine):
        self.engine = engine

    # ── leitura ────────────────────────────────────────────────────────────────

    def find_all(self) -> list[dict]:
        with Session(self.engine) as session:
            stmt = select(device_table).where(device_table.c.is_active == True)
            return [dict(row._mapping) for row in session.execute(stmt).all()]

    def find_by_id(self, device_id: int) -> dict | None:
        row = self.get_device_metadata(device_id)
        return dict(row._mapping) if row else None

    def get_active_by(self, provider_name: str, client_id: int):
        """Busca IDs externos das estações ativas de um provedor específico."""
        with Session(self.engine) as session:
            stmt = (
                select(device_table.c.external_id, device_table.c.id)
                .join(provider_table, device_table.c.provider_id == provider_table.c.id)
                .where(
                    provider_table.c.name == provider_name,
                    device_table.c.is_active == True,
                    device_table.c.external_id != None,
                    device_table.c.client_id == client_id
                )
            )
            result = session.execute(stmt).all()
            return [{"external_id": row.external_id, "device_id": row.id} for row in result]

    def get_device_metadata(self, device_id: int):
        """Traz os detalhes de um dispositivo (ex: fuso horário, nome)."""
        with Session(self.engine) as session:
            stmt = select(device_table).where(device_table.c.id == device_id)
            return session.execute(stmt).first()

    # ── escrita ────────────────────────────────────────────────────────────────

    def save(self, entity: dict) -> int:
        with self.engine.begin() as conn:
            result = conn.execute(
                insert(device_table).values(**entity).returning(device_table.c.id)
            )
            return result.first()[0]

    def update(self, id: int, data: dict) -> dict | None:
        allowed = {"name", "external_id", "type_id", "provider_id",
                   "timezone", "availability_interval", "client_id", "is_active"}
        filtered = {k: v for k, v in data.items() if k in allowed}
        with self.engine.begin() as conn:
            conn.execute(
                sa_update(device_table).where(device_table.c.id == id).values(**filtered)
            )
        return self.find_by_id(id)

    def deactivate(self, id: int):
        self.update(id, {"is_active": False})
