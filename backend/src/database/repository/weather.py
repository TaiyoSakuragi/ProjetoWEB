import pandas as pd
from pathlib import Path
from sqlalchemy          import text, select
import src.database.models as _models


class WeatherRepository:
    def __init__(self, engine):
        self.engine = engine

    def exists_observation(self, device_id: int, register) -> bool:
        with self.engine.begin() as conn:
            stmt = select(_models.observation_table.c.device_id).where(
                _models.observation_table.c.device_id == device_id,
                _models.observation_table.c.register == register,
            )
            return conn.execute(stmt).first() is not None

    
    def save_observations(self, df: pd.DataFrame):
        try:
            if df.empty:
                return
                
            db_columns = _models.observation_table.columns.keys()
            df_filtered = df[[c for c in df.columns if c in db_columns]]

            df_filtered.to_sql(
                name='observation',
                schema='sensors',
                con=self.engine,
                if_exists='append',
                index=False,
                method='multi',
                chunksize=1000
            )
        except Exception as e:
            tmp_dir = Path("tmp")
            tmp_dir.mkdir(parents=True, exist_ok=True)
            df.to_csv(tmp_dir / f"failed_persistence_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.csv", index=False)
            raise Exception(f"Failed to persist data to database. Error: {str(e)}. Data snapshot saved to tmp/failed_persistence_*.csv for analysis.")


    def get_history(self, device_id: int, start: str, end: str, client_id: int | None = None) -> pd.DataFrame:
        query = text("""
            SELECT o.*
            FROM sensors.observation o
            JOIN sensors.device d ON d.id = o.device_id
            WHERE o.device_id = :device_id
              AND o.register BETWEEN :start AND :end
              AND (:client_id IS NULL OR d.client_id = :client_id)
            ORDER BY o.register ASC
        """)
        return pd.read_sql(
            query,
            self.engine,
            params={"device_id": device_id, "start": start, "end": end, "client_id": client_id},
        )

    def get_all_history(self, client_id: int | None = None) -> pd.DataFrame:
        query = text("""
            SELECT o.*
            FROM sensors.observation o
            JOIN sensors.device d ON d.id = o.device_id
            WHERE (:client_id IS NULL OR d.client_id = :client_id)
            ORDER BY o.register DESC
        """)
        return pd.read_sql(query, self.engine, params={"client_id": client_id})