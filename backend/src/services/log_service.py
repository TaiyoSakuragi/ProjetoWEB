import xml.etree.ElementTree as ET
from src.database.repository.firebase_log import FirebaseLogRepository


class LogService:
    def __init__(self):
        self._repo = FirebaseLogRepository()

    def get_recent(self, limit: int = 100):
        return self._repo.find_all(limit)

    def get_by_path(self, path: str):
        return self._repo.find_by_path(path)

    def _acao_from_evento(self, evento: str) -> str:
        return {
            "login": "Login",
            "logout": "Logout",
            "inclusao": "Inclusao",
            "alteracao": "Alteracao",
            "exclusao": "Exclusao",
            "erro": "Erro",
            "acesso_rota": "Acesso a rota",
        }.get(evento, evento or "Desconhecido")

    def _tipo_evento(self, evento: str) -> str:
        return {
            "login": "autenticacao",
            "logout": "autenticacao",
            "inclusao": "dados",
            "alteracao": "dados",
            "exclusao": "dados",
            "erro": "erro",
            "acesso_rota": "acesso",
        }.get(evento, "geral")

    def _descricao(self, log: dict) -> str:
        evento = log.get("evento", "")
        if evento == "login":
            return "Usuario autenticado com sucesso" if log.get("sucesso") else "Falha na autenticacao"
        if evento == "logout":
            return "Usuario encerrou a sessao"
        if evento == "inclusao":
            return f"Registro inserido na tabela {log.get('tabela', 'desconhecida')}"
        if evento == "alteracao":
            return f"Registro alterado na tabela {log.get('tabela', 'desconhecida')}"
        if evento == "exclusao":
            return f"Registro excluido da tabela {log.get('tabela', 'desconhecida')}"
        if evento == "erro":
            return str(log.get("erro") or "Erro nao especificado")
        if evento == "acesso_rota":
            endpoint = log.get("endpoint", "")
            metodo = log.get("metodo", "")
            return f"Acesso ao endpoint {metodo} {endpoint}".strip()
        return "Evento de auditoria"

    def to_xml(self, logs: list) -> str:
        root = ET.Element("logs")
        for idx, log in enumerate(logs, start=1):
            if not isinstance(log, dict):
                continue

            evento = log.get("evento", "")
            entry = ET.SubElement(root, "evento", {"id": str(idx)})

            ET.SubElement(entry, "usuario").text = str(log.get("usuario", "anonimo"))
            ET.SubElement(entry, "acao").text = self._acao_from_evento(evento)
            ET.SubElement(entry, "descricao").text = self._descricao(log)
            ET.SubElement(entry, "data_hora").text = str(log.get("data_hora") or log.get("timestamp") or "")
            ET.SubElement(entry, "tipo_evento").text = self._tipo_evento(evento)
            ET.SubElement(entry, "ip_origem").text = str(log.get("ip", ""))

        ET.indent(root, space="    ")
        return ET.tostring(root, encoding="utf-8", xml_declaration=True).decode("utf-8")
