from sqlalchemy.orm         import Session
from sqlalchemy             import select
from src.database.models    import api_credential_table


class AccessRepository:
    def __init__(self, engine):
        self.engine = engine

    def get_api_credentials(self, provider_name: str, client_ids=None) -> list[dict]:
        """Busca as credenciais de API para um provedor específico."""
        with Session(self.engine) as session:
            stmt = (
                select(api_credential_table.c.client_id, api_credential_table.c.username, api_credential_table.c.token)
                .where(api_credential_table.c.operation == provider_name)
            )
            if client_ids:
                stmt = stmt.where(api_credential_table.c.client_id.in_(client_ids))
                
            result = session.execute(stmt).all()
            return [(row.client_id, row.username, row.token) for row in result]

