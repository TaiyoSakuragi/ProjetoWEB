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
| firebase-admin | 6.0+ | Logs de requisição no Firebase Realtime DB |
| pandas | 2.0+ | Inserção em lote de observações |
| python-dotenv | 1.0+ | Variáveis de ambiente |
| werkzeug | 3.0+ | Hash de senhas |

## Arquitetura

O projeto usa uma arquitetura em camadas com `create_app()` e engine SQLAlchemy injetada.

```
app.py
└── src/__init__.py  (create_app)
    ├── db_config.py         → cria engine e inicializa JWT/Firebase
    ├── middlewares/         → logger, JWT, validação, erros
    └── routers/ (Blueprints)
        └── controllers/
            └── services/
                └── database/repository/  (SQLAlchemy Core)
```

Fluxo curto:
1. `init_db()` cria a engine.
2. `init_tables()` reflete as tabelas.
3. Os routers são carregados depois da engine pronta.

## Estrutura do Projeto

```
ProjetoWEB/
├── app.py                        # Entry point (Flask auto-detect)
├── requirements.txt
├── pytest.ini
├── .env                          # Não versionar
├── docs/
│   ├── DATABASE.md               # Diagrama ER e documentação do banco
│   └── ENDPOINTS.md              # Documentação de endpoints da API
├── sql/
│   └── db.sql                    # Script DDL de criação do banco
└── src/
    ├── __init__.py               # App factory — create_app()
    ├── db_config.py              # Engine, JWT e MongoDB
    ├── config/
    │   └── settings.py           # DB_CONFIG lido do .env
    ├── database/
    │   ├── manager.py            # DatabaseManager — cria SQLAlchemy engine
    │   ├── models.py             # Table reflection via init_tables(engine)
    │   └── repository/
    │       ├── device.py         # DeviceRepository
    │       ├── weather.py        # WeatherRepository (pandas)
    │       ├── firebase_log.py   # FirebaseLogRepository
    │       └── users_repository.py
    ├── interfaces/
    │   ├── idao.py               # IDAO (ABC)
    │   ├── iservice.py           # IService (ABC)
    │   └── icontroller.py        # IController (ABC)
    ├── services/
    │   ├── auth_service.py
    │   ├── users_service.py
    │   ├── devices_service.py
    │   ├── observations_service.py
    │   └── log_service.py
    ├── controllers/
    │   ├── auth_controller.py
    │   ├── clients_controller.py
    │   ├── types_controller.py
    │   ├── providers_controller.py
    │   ├── locations_controller.py
    │   ├── users_controller.py
    │   ├── devices_controller.py
    │   └── observations_controller.py
    ├── routers/
    │   ├── auth_router.py
    │   ├── clients_router.py
    │   ├── types_router.py
    │   ├── providers_router.py
    │   ├── locations_router.py
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

1. Clonar o repositório

```bash
git clone <url-do-repositorio>
cd ProjetoWEB
```

2. Criar e ativar o ambiente virtual

```bash
python -m venv .venv
source .venv/bin/activate   # Linux/macOS
.venv\Scripts\activate      # Windows
```

3. Instalar dependências

```bash
pip install -r requirements.txt
```

4. Variáveis de ambiente

Crie um arquivo `.env` na raiz:

```env
SECRET_KEY=sua-chave-secreta
JWT_SECRET_KEY=sua-chave-jwt-com-32-chars-minimo

POSTGRES_NAME=projetoweb
POSTGRES_USER=postgres
POSTGRES_PASS=sua-senha
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

FIREBASE_CREDENTIALS='{"type":"service_account",...}'
FIREBASE_URL=https://<seu-projeto>.firebaseio.com
```

5. Criar o banco de dados

```bash
psql -U postgres -c "CREATE DATABASE projetoweb;"
psql -U postgres -d projetoweb -f sql/db.sql
```

6. Executar

```bash
flask run
```

A API ficará disponível em `http://localhost:5000`.

## Endpoints

### Auth

- `POST /api/auth/login` - retorna JWT

Body:
```json
{ "email": "user@example.com", "password": "senha" }
```

### Users

- `GET /api/users/` - lista usuários ativos
- `GET /api/users/<id>` - busca usuário por ID
- `POST /api/users/` - cria usuário; body: `name`, `email`, `password`
- `PUT /api/users/<id>` - atualiza usuário
- `DELETE /api/users/<id>` - desativa usuário

### Devices

- `GET /api/devices/` - lista dispositivos ativos
- `GET /api/devices/<id>` - busca dispositivo por ID
- `POST /api/devices/` - cadastra dispositivo; body: `name`
- `PUT /api/devices/<id>` - atualiza dispositivo
- `DELETE /api/devices/<id>` - desativa dispositivo

### Observations

- `GET /api/observations/` - lista observações
- `GET /api/observations/<id>?start=&end=` - histórico por dispositivo
- `POST /api/observations/` - registra observação; body: `device_id`, `register`

`start` e `end` são opcionais em `GET /<id>`; padrão `2000-01-01` e `2099-12-31`.

## Testes

Os testes usam mocks de serviço; não exigem banco real.

```bash
pytest -v
```

```
35 passed
```

## Schemas do Banco

- **`public`** — `client`, `role`, `users`
- **`sensors`** — `device`, `location`, `provider`, `type`, `observation`

