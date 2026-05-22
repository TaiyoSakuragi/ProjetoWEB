import pandas as pd
from sqlalchemy          import text
from src.database.models import observation_table


class WeatherRepository:
    def __init__(self, engine):
        self.engine = engine

    
    def save_observations(self, df: pd.DataFrame):
        try:
            if df.empty:
                return
                
            db_columns = observation_table.columns.keys()
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
            df.to_csv(f"tmp/failed_persistence_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.csv", index=False)
            raise Exception(f"Failed to persist data to database. Error: {str(e)}. Data snapshot saved to tmp/failed_persistence_*.csv for analysis.")


    def get_history(self, device_id: int, start: str, end: str) -> pd.DataFrame:
        query = text("""
            SELECT * FROM sensors.observation
            WHERE device_id = :device_id
            AND register BETWEEN :start AND :end
            ORDER BY register ASC
        """)
        return pd.read_sql(query, self.engine, params={"device_id": device_id, "start": start, "end": end})