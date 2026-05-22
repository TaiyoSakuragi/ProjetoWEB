import os
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "DATABASE": os.getenv("DB_NAME"),
    "USER": os.getenv("DB_USER"),
    "PASSWORD": os.getenv("DB_PASS"),
    "HOST": os.getenv("DB_HOST"),
    "PORT": os.getenv("DB_PORT")
}
