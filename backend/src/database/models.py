# src/database/models.py
import geoalchemy2
from sqlalchemy import MetaData, Table

# Referências às tabelas — populadas após init_tables(engine)
observation_table    = None
device_table         = None
location_table       = None
provider_table       = None
type_table           = None
client_table         = None
role_table           = None
users_table          = None


def init_tables(engine):
    """Reflete as tabelas do banco a partir da engine injetada."""
    global observation_table, device_table, location_table, provider_table
    global type_table, client_table, role_table, users_table

    metadata = MetaData()
    try:
        observation_table    = Table('observation'   , metadata, schema="sensors", autoload_with=engine)
        device_table         = Table('device'        , metadata, schema="sensors", autoload_with=engine)
        location_table       = Table('location'      , metadata, schema="sensors", autoload_with=engine)
        provider_table       = Table('provider'      , metadata, schema="sensors", autoload_with=engine)
        type_table           = Table('type'          , metadata, schema="sensors", autoload_with=engine)
        client_table         = Table('client'        , metadata, schema="public" , autoload_with=engine)
        role_table           = Table('role'          , metadata, schema="public" , autoload_with=engine)
        users_table          = Table('users'         , metadata, schema="public" , autoload_with=engine)

    except Exception as e:
        raise RuntimeError(
            "Failed to initialize PostgreSQL tables. Check POSTGRES_HOST, "
            "POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASS, and the database "
            "server encoding/access configuration."
        ) from e

