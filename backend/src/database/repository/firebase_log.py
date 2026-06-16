from datetime import datetime, timezone
from firebase_admin import db


class FirebaseLogRepository:

    @property
    def _ref(self):
        return db.reference("backend/logs")

    def save(self, log: dict):
        log["timestamp"] = datetime.now(timezone.utc).isoformat()
        self._ref.push(log)

    def find_all(self, limit: int = 100) -> list:
        data = self._ref.get() or {}
        logs = list(data.values())
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return logs[:limit]

    def find_by_path(self, path: str) -> list:
        data = self._ref.order_by_child("path").equal_to(path).get() or {}
        return list(data.values())
