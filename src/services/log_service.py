import xml.etree.ElementTree as ET
from src.database.repository.mongo_log import MongoLogRepository


class LogService:

    def __init__(self):
        self._repo = MongoLogRepository()

    def get_recent(self, limit: int = 100):
        return self._repo.find_all(limit)

    def get_by_path(self, path: str):
        return self._repo.find_by_path(path)

    def to_xml(self, logs: list) -> str:
        root = ET.Element("logs")
        for log in logs:
            entry = ET.SubElement(root, "log")
            for key, value in log.items():
                child = ET.SubElement(entry, key)
                child.text = str(value)
        return ET.tostring(root, encoding="unicode", xml_declaration=True)
