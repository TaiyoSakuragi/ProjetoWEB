from datetime import datetime, timezone
from src.db_config import get_mongo_db


class MongoLogRepository:

    @property
    def _collection(self):
        return get_mongo_db()["logs"]

    def save(self, log: dict):
        log["timestamp"] = datetime.now(timezone.utc)
        self._collection.insert_one(log)

    def find_all(self, limit: int = 100) -> list:
        return list(
            self._collection.find({}, {"_id": 0})
            .sort("timestamp", -1)
            .limit(limit)
        )

    def find_by_path(self, path: str) -> list:
        return list(self._collection.find({"path": path}, {"_id": 0}))
