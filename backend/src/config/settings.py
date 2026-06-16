import os
import json

from dotenv  import load_dotenv

load_dotenv()

DB_CONFIG = {
    "DATABASE"  : os.getenv("POSTGRES_NAME"),
    "USER"      : os.getenv("POSTGRES_USER"),
    "PASSWORD"  : os.getenv("POSTGRES_PASS"),
    "HOST"      : os.getenv("POSTGRES_HOST"),
    "PORT"      : os.getenv("POSTGRES_PORT")
}

REALTIME_CONFIG = {
    "CREDENTIALS"   : json.loads(os.getenv("FIREBASE_CREDENTIALS")),
    "DATABASE_URL"  : os.getenv("FIREBASE_URL")  
}