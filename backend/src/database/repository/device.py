from sqlalchemy.orm         import Session
from sqlalchemy             import select, insert, update as sa_update
import src.database.models as _models
from src.interfaces.idao    import IDAO


class DeviceRepository(IDAO):
    def __init__(self, engine):
        self.engine = engine

    # ── leitura ────────────────────────────────────────────────────────────────

    def find_all(self, client_id: int | None = None) -> list[dict]:
        with Session(self.engine) as session:
            stmt = select(_models.device_table).where(_models.device_table.c.is_active == True)
            if client_id is not None:
                stmt = stmt.where(_models.device_table.c.client_id == client_id)
            return [dict(row._mapping) for row in session.execute(stmt).all()]

    def find_by_id(self, device_id: int, client_id: int | None = None) -> dict | None:
        row = self.get_device_metadata(device_id, client_id=client_id)
        return dict(row._mapping) if row else None

    def find_by_external_id(self, external_id: str | int, client_id: int | None = None) -> dict | None:
        with Session(self.engine) as session:
            normalized_external_id = external_id
            if external_id not in (None, ""):
                raw = str(external_id).strip()
                compact = raw.replace(".", "").replace(",", "")
                if compact.isdigit():
                    normalized_external_id = int(compact)

            stmt = select(_models.device_table).where(_models.device_table.c.external_id == normalized_external_id)
            if client_id is not None:
                stmt = stmt.where(_models.device_table.c.client_id == client_id)
            row = session.execute(stmt).first()
            return dict(row._mapping) if row else None

    def get_active_by(self, provider_name: str, client_id: int):
        """Busca IDs externos das estações ativas de um provedor específico."""
        with Session(self.engine) as session:
            stmt = (
                select(_models.device_table.c.external_id, _models.device_table.c.id)
                .join(_models.provider_table, _models.device_table.c.provider_id == _models.provider_table.c.id)
                .where(
                    _models.provider_table.c.name == provider_name,
                    _models.device_table.c.is_active == True,
                    _models.device_table.c.external_id != None,
                    _models.device_table.c.client_id == client_id
                )
            )
            result = session.execute(stmt).all()
            return [{"external_id": row.external_id, "device_id": row.id} for row in result]

    def get_device_metadata(self, device_id: int, client_id: int | None = None):
        """Traz os detalhes de um dispositivo (ex: fuso horário, nome)."""
        with Session(self.engine) as session:
            stmt = select(_models.device_table).where(_models.device_table.c.id == device_id)
            if client_id is not None:
                stmt = stmt.where(_models.device_table.c.client_id == client_id)
            return session.execute(stmt).first()

    # ── escrita ────────────────────────────────────────────────────────────────

    def save(self, entity: dict) -> int:
        with self.engine.begin() as conn:
            result = conn.execute(
                insert(_models.device_table).values(**entity).returning(_models.device_table.c.id)
            )
            return result.first()[0]

    def update(self, id: int, data: dict, client_id: int | None = None) -> dict | None:
        allowed = {"name", "external_id", "type_id", "provider_id",
                   "timezone", "availability_interval", "client_id", "is_active"}
        filtered = {k: v for k, v in data.items() if k in allowed}
        with self.engine.begin() as conn:
            stmt = sa_update(_models.device_table).where(_models.device_table.c.id == id)
            if client_id is not None:
                stmt = stmt.where(_models.device_table.c.client_id == client_id)
            conn.execute(stmt.values(**filtered))
        return self.find_by_id(id, client_id=client_id)

    def deactivate(self, id: int, client_id: int | None = None):
        self.update(id, {"is_active": False}, client_id=client_id)
