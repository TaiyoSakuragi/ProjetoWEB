import firebase_admin
from firebase_admin import credentials
from firebase_admin import db
from datetime import datetime, timezone
from src.config.settings import REALTIME_CONFIG


cred = credentials.Certificate(REALTIME_CONFIG["CREDENTIALS"])
firebase_admin.initialize_app(cred, {
    "databaseURL": REALTIME_CONFIG["DATABASE_URL"]
})

print("🚀 Conectado ao Firebase com sucesso!")

def registrar_log(nivel, escopo, mensagem):
    ref = db.reference("backend/logs")
    
    ref.push({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "nivel": nivel.upper(),
        "escopo": escopo,
        "mensagem": mensagem
    })
    print(f"[{nivel.upper()}] Log enviado para o Firebase!")

registrar_log(nivel="info", escopo="sistema", mensagem="Conexão inicial estabelecida com sucesso.")
registrar_log(nivel="warning", escopo="usuarios", mensagem="Tentativa de login inválida para o usuário 'teste'.")