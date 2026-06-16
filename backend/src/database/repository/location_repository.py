from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete, func
import src.database.models as _models
from src.interfaces.idao import IDAO


class LocationRepository(IDAO):
    def __init__(self, engine):
        self.engine = engine

    def find_all(self) -> list[dict]:
        with Session(self.engine) as session:
            stmt = select(
                _models.location_table.c.device_id,
                func.ST_Y(_models.location_table.c.geom).label("latitude"),
                func.ST_X(_models.location_table.c.geom).label("longitude")
            )
            rows = session.execute(stmt).all()
            return [dict(row._mapping) for row in rows]

    def find_by_id(self, id: int) -> dict | None:
        return self.find_by_device_id(id)

    def find_by_device_id(self, device_id: int) -> dict | None:
        with Session(self.engine) as session:
            stmt = select(
                _models.location_table.c.device_id,
                func.ST_Y(_models.location_table.c.geom).label("latitude"),
                func.ST_X(_models.location_table.c.geom).label("longitude")
            ).where(_models.location_table.c.device_id == device_id)
            row = session.execute(stmt).first()
            return dict(row._mapping) if row else None

    def save(self, data: dict) -> int:
        payload = dict(data)
        latitude = float(payload.pop("latitude"))
        longitude = float(payload.pop("longitude"))
        payload["latitude"] = latitude
        payload["longitude"] = longitude
        payload["geom"] = func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326)
        with self.engine.begin() as conn:
            result = conn.execute(insert(_models.location_table).values(**payload).returning(_models.location_table.c.device_id))
            return result.first()[0]

    def update(self, id: int, data: dict):
        payload = dict(data)
        latitude = float(payload.pop("latitude")) if "latitude" in payload else None
        longitude = float(payload.pop("longitude")) if "longitude" in payload else None
        values = {}
        if latitude is not None and longitude is not None:
            values["latitude"] = latitude
            values["longitude"] = longitude
            values["geom"] = func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326)
        with self.engine.begin() as conn:
            conn.execute(update(_models.location_table).where(_models.location_table.c.device_id == id).values(**values))

    def deactivate(self, id: int):
        with self.engine.begin() as conn:
            conn.execute(delete(_models.location_table).where(_models.location_table.c.device_id == id))