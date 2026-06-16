import bcrypt

# Gerando hash real para 'admin'
senha_admin = b"admin"
hash_admin = bcrypt.hashpw(senha_admin, bcrypt.gensalt())
print(f"Hash real para 'admin': {hash_admin.decode('utf-8')}")

# Gerando hash real para 'client'
senha_client = b"client"
hash_client = bcrypt.hashpw(senha_client, bcrypt.gensalt())
print(f"Hash real para 'client': {hash_client.decode('utf-8')}")