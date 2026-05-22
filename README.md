# ProjetoWEB

API REST desenvolvida em Flask para monitoramento de sensores meteorológicos. Permite gerenciar clientes, usuários, dispositivos e coletas de dados ambientais.

## Tecnologias

| Pacote | Versão mínima | Uso |
|--------|--------------|-----|
| Python | 3.12+ | Runtime |
| Flask | 3.0+ | Framework web |
| SQLAlchemy Core | 2.0+ | Acesso ao banco (Table reflection) |
| Flask-JWT-Extended | 4.6+ | Autenticação via JWT |
| psycopg2-binary | 2.9+ | Driver PostgreSQL |
| geoalchemy2 | 0.14+ | Suporte a colunas PostGIS |
| pymongo | 4.7+ | Logs de requisição no MongoDB |
| pandas | 2.0+ | Inserção em lote de observações |
| python-dotenv | 1.0+ | Variáveis de ambiente |
| werkzeug | 3.0+ | Hash de senhas |

## Arquitetura

O projeto segue uma arquitetura em camadas com injeção de dependência da engine SQLAlchemy:

```
app.py
└── src/__init__.py  (create_app)
    ├── db_config.py         → cria engine e injeta em init_tables()
    ├── middlewares/         → logger, JWT handlers, validator, error handler
    └── routers/ (Blueprints)
        └── controllers/
            └── services/
                └── dao/
                    └── database/repository/  (SQLAlchemy Core)
```

**Fluxo de inicialização:**
1. `init_db()` cria a engine via `DatabaseManager` e chama `init_tables(engine)`
2. `init_tables()` reflete as tabelas do banco com `autoload_with=engine`
3. Os routers são importados *depois* — os DAOs acessam `_cfg.engine` em runtime

## Estrutura do Projeto

```
ProjetoWEB/
├── app.py                        # Entry point (Flask auto-detect)
├── requirements.txt
├── pytest.ini
├── .env                          # Não versionar
└── src/
    ├── __init__.py               # App factory — create_app()
    ├── db_config.py              # Engine, JWT e MongoDB
    ├── config/
    │   └── settings.py           # DB_CONFIG e configs de APIs externas
    ├── database/
    │   ├── manager.py            # DatabaseManager — cria SQLAlchemy engine
    │   ├── models.py             # Table reflection via init_tables(engine)
    │   └── repository/
    │       ├── device.py         # DeviceRepository
    │       ├── weather.py        # WeatherRepository (pandas)
    │       ├── access.py         # AccessRepository
    │       └── users_repository.py
    ├── interfaces/
    │   ├── idao.py               # IDAO (ABC)
    │   ├── iservice.py           # IService (ABC)
    │   └── icontroller.py        # IController (ABC)
    ├── dao/
    │   ├── postgres_users_dao.py
    │   ├── postgres_devices_dao.py
    │   ├── postgres_observations_dao.py
    │   └── mongo_log_dao.py
    ├── services/
    │   ├── auth_service.py
    │   ├── users_service.py
    │   ├── devices_service.py
    │   ├── observations_service.py
    │   └── log_service.py
    ├── controllers/
    │   ├── auth_controller.py
    │   ├── users_controller.py
    │   ├── devices_controller.py
    │   └── observations_controller.py
    ├── routers/
    │   ├── auth_router.py
    │   ├── users_router.py
    │   ├── devices_router.py
    │   └── observations_router.py
    └── middlewares/
        ├── auth.py               # JWT error handlers
        ├── logger.py             # Log de requisições → MongoDB
        ├── validator.py          # @require_fields decorator
        └── error_handler.py      # Handlers 400/404/405/422/500
└── tests/
    ├── conftest.py               # Fixtures: app, client, token, auth
    ├── test_auth.py
    ├── test_users.py
    ├── test_devices.py
    └── test_observations.py
```

## Configuração

### 1. Clonar o repositório

```bash
git clone <url-do-repositorio>
cd ProjetoWEB
```

### 2. Criar e ativar o ambiente virtual

```bash
python -m venv .venv
source .venv/bin/activate   # Linux/macOS
.venv\Scripts\activate      # Windows
```

### 3. Instalar dependências

```bash
pip install -r requirements.txt
```

### 4. Variáveis de ambiente

Crie um arquivo `.env` na raiz:

```env
SECRET_KEY=sua-chave-secreta
JWT_SECRET_KEY=sua-chave-jwt-com-32-chars-minimo

DB_NAME=projetoweb
DB_USER=postgres
DB_PASS=sua-senha
DB_HOST=localhost
DB_PORT=5432

MONGO_URI=mongodb://localhost:27017
MONGO_DB=projetoweb_logs
```

### 5. Criar o banco de dados

```bash
psql -U postgres -c "CREATE DATABASE projetoweb;"
psql -U postgres -d projetoweb -f src/database/db.sql
```

### 6. Executar

```bash
flask run
```

A API ficará disponível em `http://localhost:5000`.

## Endpoints

### Auth

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/api/auth/login` | Retorna JWT | — |

**Body:**
```json
{ "email": "user@example.com", "password": "senha" }
```

### Usuários

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/users/` | Listar usuários ativos | JWT |
| GET | `/api/users/<id>` | Buscar usuário por ID | JWT |
| POST | `/api/users/` | Criar usuário | JWT |
| PUT | `/api/users/<id>` | Atualizar usuário | JWT |
| DELETE | `/api/users/<id>` | Desativar usuário | JWT |

**Body (POST):** `name`, `email`, `password` (obrigatórios)

### Dispositivos

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/devices/` | Listar dispositivos ativos | JWT |
| GET | `/api/devices/<id>` | Buscar dispositivo por ID | JWT |
| POST | `/api/devices/` | Cadastrar dispositivo | JWT |
| PUT | `/api/devices/<id>` | Atualizar dispositivo | JWT |
| DELETE | `/api/devices/<id>` | Desativar dispositivo | JWT |

**Body (POST):** `name` (obrigatório)

### Observações

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/observations/` | Listar observações | JWT |
| GET | `/api/observations/<device_id>?start=&end=` | Histórico por dispositivo | JWT |
| POST | `/api/observations/` | Registrar observação | JWT |

**Query params:** `start` e `end` no formato `YYYY-MM-DD` (padrão: `2000-01-01` / `2099-12-31`)  
**Body (POST):** `device_id`, `register` (obrigatórios)

## Testes

Os testes usam mocks de serviço — nenhuma conexão real ao banco é necessária.

```bash
pytest -v
```

```
35 passed in 0.47s
```

## Schemas do Banco

- **`public`** — `client`, `role`, `users`
- **`sensors`** — `device`, `location`, `provider`, `type`, `api_credential`, `observation`

