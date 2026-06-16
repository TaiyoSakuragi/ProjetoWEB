# Backend - ProjetoWEB

API REST em Flask para autenticacao, cadastro e consulta de dados meteorologicos.

## Stack

- Python
- Flask
- Flask-JWT-Extended
- SQLAlchemy Core
- PostgreSQL + PostGIS
- GeoAlchemy2

## Estrutura

- app.py: ponto de entrada
- src/controllers: camada HTTP
- src/services: regras de negocio
- src/database/repository: acesso a dados
- src/routers: blueprints
- docs: documentacao tecnica
- sql: scripts SQL

## Configuracao

1. Ambiente virtual

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

2. Dependencias

```bash
pip install -r requirements.txt
```

3. Variaveis de ambiente

Crie o arquivo .env em backend/ com valores do seu ambiente:

```env
SECRET_KEY=change-me
JWT_SECRET_KEY=change-me-too

POSTGRES_NAME=projetoweb
POSTGRES_USER=postgres
POSTGRES_PASS=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

FIREBASE_CREDENTIALS='{"type":"service_account",...}'
FIREBASE_URL=https://<seu-projeto>.firebaseio.com
```

4. Banco de dados

```bash
psql -U postgres -c "CREATE DATABASE projetoweb;"
psql -U postgres -d projetoweb -f sql/db.sql
psql -U postgres -d projetoweb -f sql/insert.sql
```

## Execucao

```bash
flask run --host=0.0.0.0 --port=5000
```

Base URL: http://127.0.0.1:5000

## Endpoints principais

- POST /api/auth/login
- GET/POST/PUT/DELETE /api/users
- GET/POST/PUT/DELETE /api/devices
- GET/POST/PUT/DELETE /api/devices/<device_id>/location
- GET /api/observations/<device_id>?start=YYYY-MM-DD&end=YYYY-MM-DD

## Regras importantes

- Criacao de usuario usa automaticamente client_id do criador autenticado.
- Criacao de usuario forca role_id = 1.
- Criacao de localizacao funciona como upsert (se existir, atualiza).
- Em location, sao persistidos geom, latitude e longitude.

## Documentacao adicional

- docs/DATABASE.md
- docs/ENDPOINTS.md
