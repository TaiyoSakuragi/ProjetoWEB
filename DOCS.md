# Documentação do Projeto — ProjetoWEB

## Sumário

1. [Visão Geral](#visão-geral)
2. [Tecnologias](#tecnologias)
3. [Configuração e Execução](#configuração-e-execução)
4. [Arquitetura](#arquitetura)
5. [Interfaces (POO)](#interfaces-poo)
6. [Camadas do Projeto](#camadas-do-projeto)
   - [Config](#config)
   - [Database / Repository (DAO)](#database--repository-dao)
   - [Services](#services)
   - [Controllers](#controllers)
   - [Routers](#routers)
   - [Middlewares](#middlewares)
7. [Endpoints da API](#endpoints-da-api)
8. [Banco de Dados](#banco-de-dados)
9. [Logs com MongoDB](#logs-com-mongodb)
10. [Testes](#testes)

---

## Visão Geral

API REST para monitoramento de sensores/dispositivos climáticos. Permite cadastrar dispositivos, registrar observações, gerenciar usuários e exportar logs de acesso.

Construído com Flask seguindo a arquitetura **MVC + Service Layer + Router + Middleware**, com PostgreSQL como banco relacional e MongoDB para logs de requisições.

---

## Tecnologias

| Componente        | Tecnologia                          |
|-------------------|-------------------------------------|
| Backend           | Python 3.12 + Flask 3.0             |
| Banco relacional  | PostgreSQL + SQLAlchemy Core 2.0    |
| Banco NoSQL       | MongoDB (pymongo)                   |
| Autenticação      | JWT (flask-jwt-extended)            |
| Dados tabulares   | pandas                              |
| Geodados          | geoalchemy2 (PostGIS)               |
| Testes            | pytest                              |
| Variáveis de env  | python-dotenv                       |

---

## Configuração e Execução

### 1. Clonar e criar ambiente virtual

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
SECRET_KEY=sua-chave-secreta
JWT_SECRET_KEY=sua-chave-jwt-com-no-minimo-32-chars

DB_NAME=projetoweb
DB_USER=postgres
DB_PASS=sua-senha
DB_HOST=localhost
DB_PORT=5432

MONGO_URI=mongodb://localhost:27017
MONGO_DB=projetoweb_logs
```

### 3. Criar o banco de dados

Execute o script SQL em `src/database/docs/db.sql` no seu PostgreSQL:

```bash
psql -U postgres -f src/database/docs/db.sql
```

### 4. Executar a aplicação

```bash
flask --app app run --debug
```

A API estará disponível em `http://localhost:5000`.

---

## Arquitetura

```
HTTP Request
     │
     ▼
 [ Router ]          → define rotas e aplica middlewares de validação/auth
     │
     ▼
 [ Controller ]      → recebe a requisição, chama o service, retorna JSON
     │
     ▼
 [ Service ]         → regras de negócio, validações de domínio
     │
     ▼
 [ Repository ]      → acesso ao banco de dados (DAO)
     │
     ├──► PostgreSQL  (dados principais)
     └──► MongoDB     (logs de requisições)
```

Fluxo de inicialização (`app.py` → `create_app()`):

```
create_app()
  ├── init_db()      → cria engine PostgreSQL + reflete tabelas via init_tables()
  ├── init_jwt(app)  → configura Flask-JWT-Extended
  ├── init_mongo()   → conecta ao MongoDB
  ├── register middlewares (logger, auth, error_handler)
  └── register blueprints (auth, users, devices, observations)
```

---

## Interfaces (POO)

Todas as classes principais implementam interfaces abstratas definidas em `src/interfaces/`.

### `IDAO` — `src/interfaces/idao.py`

Interface base para todas as classes de acesso a dados (Repositories). Obriga a implementação dos métodos CRUD fundamentais.

```python
class IDAO(ABC):
    def find_all(self) -> list: ...
    def find_by_id(self, id: int) -> dict | None: ...
    def save(self, data: dict) -> int: ...
    def update(self, id: int, data: dict): ...
    def deactivate(self, id: int): ...
```

**Implementado por:** `UsersRepository`, `DeviceRepository`

---

### `IService` — `src/interfaces/iservice.py`

Interface para todas as classes de serviço. Define o contrato de operações de negócio.

```python
class IService(ABC):
    def get_all(self): ...
    def get_by_id(self, id: int): ...
    def create(self, data: dict): ...
    def update(self, id: int, data: dict): ...
    def delete(self, id: int): ...
```

**Implementado por:** `UsersService`, `DevicesService`, `ObservationsService`

---

### `IController` — `src/interfaces/icontroller.py`

Interface para todos os controllers. Mapeia ações HTTP para métodos nomeados por convenção REST.

```python
class IController(ABC):
    def index(self): ...          # GET /
    def show(self, id): ...       # GET /<id>
    def store(self): ...          # POST /
    def update(self, id): ...     # PUT /<id>
    def destroy(self, id): ...    # DELETE /<id>
```

**Implementado por:** `UsersController`, `DevicesController`, `ObservationsController`

---

## Camadas do Projeto

### Config

#### `app.py`
Ponto de entrada da aplicação. Importa e chama `create_app()`.

```python
from src import create_app
app = create_app()
```

#### `src/__init__.py`
App factory. Inicializa banco, JWT, MongoDB e registra middlewares e blueprints.

#### `src/db_config.py`
Centraliza a criação da engine PostgreSQL, a instância do JWT e a conexão MongoDB. Expõe `engine`, `jwt` e `get_mongo_db()` para uso nas demais camadas.

#### `src/config/settings.py`
Lê as variáveis de ambiente e monta o dicionário `DB_CONFIG` usado pelo `DatabaseManager`.

---

### Database / Repository (DAO)

Responsável por toda comunicação com os bancos de dados. Nenhuma lógica de negócio existe aqui — apenas queries e operações de persistência.

#### `src/database/manager.py` — `DatabaseManager`
Recebe `DB_CONFIG` e cria a engine SQLAlchemy com pool de conexões (`pool_size=10`, `max_overflow=20`).

#### `src/database/models.py` — `init_tables(engine)`
Reflete todas as tabelas do PostgreSQL via `autoload_with=engine`, atribuindo-as a variáveis globais usadas pelos repositories. Requer que as tabelas já existam no banco.

```python
init_tables(engine)
# Após a chamada, as variáveis globais ficam disponíveis:
# observation_table, device_table, location_table, provider_table,
# type_table, api_credential_table, client_table, role_table, users_table
```

#### `src/database/repository/users_repository.py` — `UsersRepository(IDAO)`
CRUD completo de usuários. Faz hash de senha no `save()` via werkzeug. Método estático `check_password()` para autenticação.

| Método | Descrição |
|---|---|
| `find_all()` | Lista usuários ativos |
| `find_by_id(id)` | Busca por ID |
| `find_by_email(email)` | Busca por e-mail (usado no login) |
| `save(data)` | Insere e retorna ID; faz hash da senha |
| `update(id, data)` | Atualiza campos permitidos |
| `deactivate(id)` | Soft delete (`is_active = False`) |
| `check_password(user, pw)` | Verifica hash da senha |

#### `src/database/repository/device.py` — `DeviceRepository(IDAO)`
CRUD completo de dispositivos.

| Método | Descrição |
|---|---|
| `find_all()` | Lista dispositivos ativos |
| `find_by_id(id)` | Retorna metadados do dispositivo |
| `get_active_by(provider, client_id)` | Busca dispositivos ativos por provedor |
| `save(data)` | Insere e retorna ID |
| `update(id, data)` | Atualiza campos permitidos |
| `deactivate(id)` | Soft delete (`is_active = False`) |

#### `src/database/repository/weather.py` — `WeatherRepository`
Persistência e consulta de observações climáticas via pandas. Não implementa `IDAO` pois trabalha com séries temporais, não CRUD convencional.

| Método | Descrição |
|---|---|
| `save_observations(df)` | Bulk insert de DataFrame via `df.to_sql()` |
| `get_history(device_id, start, end)` | Retorna DataFrame com histórico por período |

#### `src/database/repository/access.py` — `AccessRepository`
Consulta credenciais de API por provedor e cliente.

#### `src/database/repository/mongo_log.py` — `MongoLogRepository`
Persistência e consulta de logs no MongoDB.

| Método | Descrição |
|---|---|
| `save(log)` | Insere log com timestamp UTC automático |
| `find_all(limit)` | Retorna os últimos N logs |
| `find_by_path(path)` | Filtra logs por endpoint |

---

### Services

Contêm as regras de negócio. Cada service recebe a engine do banco via `src.db_config.engine` e instancia o repository correspondente.

#### `src/services/auth_service.py` — `AuthService`
Autentica usuário por e-mail e senha usando `UsersRepository`.

#### `src/services/users_service.py` — `UsersService(IService)`
Delega operações CRUD ao `UsersRepository`.

#### `src/services/devices_service.py` — `DevicesService(IService)`
Delega operações CRUD ao `DeviceRepository`.

#### `src/services/observations_service.py` — `ObservationsService(IService)`
Usa `WeatherRepository`. Observações são **imutáveis** — `update()` e `delete()` lançam `NotImplementedError`. O método extra `get_by_device(device_id, start, end)` retorna histórico em formato lista de dicts.

#### `src/services/log_service.py` — `LogService`
Consulta logs via `MongoLogRepository` e oferece conversão para XML via `to_xml()`.

```python
service = LogService()
logs = service.get_recent(limit=50)
xml_str = service.to_xml(logs)
```

---

### Controllers

Recebem a requisição HTTP do Flask (`request`), chamam o service e devolvem JSON. Implementam `IController`.

| Arquivo | Classe | Responsabilidade |
|---|---|---|
| `auth_controller.py` | `AuthController` | Login, geração de JWT |
| `users_controller.py` | `UsersController` | CRUD de usuários |
| `devices_controller.py` | `DevicesController` | CRUD de dispositivos |
| `observations_controller.py` | `ObservationsController` | Registro e consulta de observações |

**Exemplo de fluxo no controller:**

```python
def store(self):
    data = request.get_json()          # 1. lê o body
    device_id = self._service.create(data)  # 2. chama o service
    return jsonify({"id": device_id}), 201  # 3. retorna JSON
```

---

### Routers

Definem as rotas HTTP e aplicam os decorators de autenticação e validação. Cada router é um Flask `Blueprint` registrado com um prefixo de URL.

| Arquivo | Blueprint | Prefixo |
|---|---|---|
| `auth_router.py` | `auth_bp` | `/api/auth` |
| `users_router.py` | `users_bp` | `/api/users` |
| `devices_router.py` | `devices_bp` | `/api/devices` |
| `observations_router.py` | `observations_bp` | `/api/observations` |

Exemplo de rota com autenticação e validação obrigatória de campos:

```python
@devices_bp.post("/")
@jwt_required()                  # middleware de autenticação
@require_fields("name")          # middleware de validação
def store():
    return _ctrl.store()
```

---

### Middlewares

Registrados no app Flask antes dos blueprints. Atuam de forma transversal em todas as requisições.

#### `src/middlewares/logger.py` — `register_logger(app)`
Registra cada requisição no MongoDB antes e depois de ser processada. Salva: método HTTP, path, status code e duração em ms. Falha silenciosa — não interrompe a resposta se o MongoDB estiver indisponível.

#### `src/middlewares/auth.py` — `register_jwt_handlers(app, jwt)`
Trata erros de JWT de forma padronizada: token ausente (401), token expirado (401), token inválido (422).

#### `src/middlewares/error_handler.py` — `register_error_handlers(app)`
Tratamento global de exceções HTTP. Todas as respostas de erro retornam JSON com o campo `msg`.

| Código | Mensagem |
|---|---|
| 400 | Requisição inválida |
| 404 | Recurso não encontrado |
| 405 | Método não permitido |
| 422 | Dados inválidos |
| 500 | Erro interno do servidor |

#### `src/middlewares/validator.py` — `@require_fields(*fields)`
Decorator aplicado nas rotas. Valida a presença de campos obrigatórios no body JSON antes de o request chegar ao controller. Retorna 422 com lista de campos ausentes.

```python
@require_fields("email", "password")
def login():
    ...
```

---

## Endpoints da API

### Autenticação

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/api/auth/login` | Não | Login; retorna JWT |

**Body:**
```json
{ "email": "usuario@email.com", "password": "senha123" }
```

**Resposta 200:**
```json
{ "access_token": "eyJ..." }
```

---

### Usuários — `/api/users`

> Todas as rotas exigem header `Authorization: Bearer <token>`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/users/` | Lista todos os usuários ativos |
| GET | `/api/users/<id>` | Retorna um usuário pelo ID |
| POST | `/api/users/` | Cria um novo usuário |
| PUT | `/api/users/<id>` | Atualiza dados do usuário |
| DELETE | `/api/users/<id>` | Desativa o usuário (soft delete) |

**Body POST** (campos obrigatórios: `name`, `email`, `password`):
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "senha123",
  "client_id": 1,
  "role_id": 2
}
```

---

### Dispositivos — `/api/devices`

> Todas as rotas exigem `Authorization: Bearer <token>`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/devices/` | Lista todos os dispositivos ativos |
| GET | `/api/devices/<id>` | Retorna um dispositivo pelo ID |
| POST | `/api/devices/` | Cadastra um novo dispositivo |
| PUT | `/api/devices/<id>` | Atualiza dados do dispositivo |
| DELETE | `/api/devices/<id>` | Desativa o dispositivo |

**Body POST** (campo obrigatório: `name`):
```json
{
  "name": "Estação Norte",
  "external_id": "EST-001",
  "type_id": 1,
  "provider_id": 2,
  "timezone": "America/Sao_Paulo",
  "client_id": 1
}
```

---

### Observações — `/api/observations`

> Todas as rotas exigem `Authorization: Bearer <token>`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/observations/` | Lista todas as observações |
| GET | `/api/observations/<device_id>` | Histórico de um dispositivo por período |
| POST | `/api/observations/` | Registra uma nova observação |

**Parâmetros de query em GET `/<device_id>`:**
```
?start=2024-01-01&end=2024-12-31
```

**Body POST** (campos obrigatórios: `device_id`, `register`):
```json
{
  "device_id": 1,
  "register": "2024-06-15T12:00:00",
  "temperature": 25.4,
  "humidity": 78.2
}
```

---

## Banco de Dados

O schema SQL completo está em `src/database/docs/db.sql`. O projeto usa dois schemas PostgreSQL:

- **`public`** — tabelas de usuários e clientes: `client`, `role`, `users`
- **`sensors`** — tabelas de monitoramento: `device`, `observation`, `location`, `provider`, `type`, `api_credential`

As tabelas são **refletidas em runtime** pelo SQLAlchemy via `init_tables(engine)` — não há definição de modelos ORM no código.

---

## Logs com MongoDB

Cada requisição HTTP é automaticamente registrada no MongoDB pelo `log_middleware`. Os documentos são salvos na collection `logs` do banco definido em `MONGO_DB`.

**Estrutura do documento:**
```json
{
  "_id": "ObjectId(...)",
  "timestamp": "2024-06-15T12:00:00Z",
  "method": "POST",
  "path": "/api/devices/",
  "status": 201,
  "duration_ms": 42.5
}
```

**Consulta via `LogService`:**

```python
service = LogService()

# Últimos 100 logs
logs = service.get_recent(limit=100)

# Logs de um endpoint específico
logs = service.get_by_path("/api/devices/")

# Exportar como XML
xml = service.to_xml(logs)
```

---

## Testes

Os testes ficam em `tests/` e usam `pytest`. Nenhuma conexão real com banco é necessária — tudo é mockado no nível dos services.

```bash
# Executar todos os testes
pytest -v
```

**Cobertura atual: 35 testes, 100% passando.**

| Arquivo | Testes |
|---|---|
| `tests/test_auth.py` | Login com sucesso, credenciais inválidas, body ausente |
| `tests/test_users.py` | CRUD completo + auth obrigatória |
| `tests/test_devices.py` | CRUD completo + auth obrigatória |
| `tests/test_observations.py` | Listagem, histórico por dispositivo, criação |

A fixture `app` em `tests/conftest.py` usa `unittest.mock.patch` para interceptar `init_db` e `init_mongo`, evitando conexões reais nos testes.
