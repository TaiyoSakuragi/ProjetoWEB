from datetime import datetime, timezone
from firebase_admin import db


class FirebaseLogRepository:

    @property
    def _ref(self):
        return db.reference("backend/logs")

    def save(self, log: dict):
        log["timestamp"] = datetime.now(timezone.utc).isoformat()
        evento = log.get("evento", "geral")
        db.reference(f"backend/logs/{evento}").push(log)

    def _is_log_entry(self, value) -> bool:
        return isinstance(value, dict) and (
            "timestamp" in value
            or "data_hora" in value
            or "evento" in value
            or "endpoint" in value
        )

    def _collect_logs(self, data: dict) -> list:
        logs = []
        for value in data.values():
            # Legacy shape: backend/logs/<push_id> => { ...log fields... }
            if self._is_log_entry(value):
                logs.append(value)
                continue

            # Grouped shape: backend/logs/<evento>/<push_id> => { ...log fields... }
            if isinstance(value, dict):
                for inner_value in value.values():
                    if self._is_log_entry(inner_value):
                        logs.append(inner_value)
        return logs

    def find_all(self, limit: int = 100) -> list:
        data = self._ref.get() or {}
        logs = self._collect_logs(data)
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return logs[:limit]

    def find_by_path(self, path: str) -> list:
        logs = self.find_all(limit=10000)
        return [log for log in logs if log.get("endpoint") == path]
