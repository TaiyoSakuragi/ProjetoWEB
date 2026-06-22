# ENDPOINTS — ProjetoWEB

Documentação dos endpoints da API backend. Para setup e execução, consulte [backend/README.md](../README.md).

## Convenções de acesso

- all: endpoint público
- auth: qualquer usuário autenticado
- same client: admin ou usuário do mesmo client_id
- admin: apenas admin

## Tabela Única De Campos

| Método | Endpoint | Acesso | Path params | Query params | Body obrigatório | Body opcional |
|---|---|---|---|---|---|---|
| POST | /api/auth/login | all | - | - | `email`, `password` | - |
| POST | /api/auth/refresh | auth | - | - | - | - |
| POST | /api/auth/logout | auth | - | - | - | - |
| GET | /api/users/ | same client | - | - | - | - |
| GET | /api/users/<id> | same client | `id` | - | - | - |
| POST | /api/users/ | same client | - | - | `name`, `email`, `password` | `client_id`, `role_id` |
| PUT | /api/users/<id> | same client | `id` | - | - | `name`, `email`, `client_id`, `role_id`, `is_active` |
| DELETE | /api/users/<id> | same client | `id` | - | - | - |
| GET | /api/clients/ | admin | - | - | - | - |
| GET | /api/clients/<id> | same client | `id` | - | - | - |
| POST | /api/clients/ | admin | - | - | `company_name`, `document` | `is_active` |
| PUT | /api/clients/<id> | admin | `id` | - | - | `company_name`, `document`, `is_active` |
| DELETE | /api/clients/<id> | admin | `id` | - | - | - |
| GET | /api/roles/ | admin | - | - | - | - |
| GET | /api/roles/<id> | admin | `id` | - | - | - |
| POST | /api/roles/ | admin | - | - | `name` | - |
| PUT | /api/roles/<id> | admin | `id` | - | - | `name` |
| DELETE | /api/roles/<id> | admin | `id` | - | - | - |
| GET | /api/types/ | admin | - | - | - | - |
| GET | /api/types/<id> | admin | `id` | - | - | - |
| POST | /api/types/ | admin | - | - | `name` | - |
| PUT | /api/types/<id> | admin | `id` | - | - | `name` |
| DELETE | /api/types/<id> | admin | `id` | - | - | - |
| GET | /api/providers/ | admin | - | - | - | - |
| GET | /api/providers/<id> | admin | `id` | - | - | - |
| POST | /api/providers/ | admin | - | - | `name` | - |
| PUT | /api/providers/<id> | admin | `id` | - | - | `name` |
| DELETE | /api/providers/<id> | admin | `id` | - | - | - |
| GET | /api/devices/ | same client | - | - | - | - |
| GET | /api/devices/<id> | same client | `id` | - | - | - |
| POST | /api/devices/ | same client | - | - | `external_id`, `name`, `type_id`, `provider_id`, `is_active`, `timezone`, `availability_interval` | - |
| POST | /api/devices/ingest | same client | - | - | por linha: `external_id`, `name`, `type_id`, `provider_id`, `is_active`, `timezone`, `availability_interval` | - |
| PUT | /api/devices/<id> | same client | `id` | - | - | `external_id`, `name`, `type_id`, `provider_id`, `timezone`, `availability_interval`, `is_active` |
| DELETE | /api/devices/<id> | same client | `id` | - | - | - |
| GET | /api/devices/<device_id>/location/ | same client | `device_id` | - | - | - |
| POST | /api/devices/<device_id>/location/ | same client | `device_id` | - | `latitude`, `longitude` | - |
| PUT | /api/devices/<device_id>/location/ | same client | `device_id` | - | `latitude`, `longitude` | - |
| DELETE | /api/devices/<device_id>/location/ | same client | `device_id` | - | - | - |
| GET | /api/observations/ | same client | - | - | - | - |
| GET | /api/observations/<device_id> | same client | `device_id` | `start`, `end` | - | - |
| POST | /api/observations/ | same client | - | - | `device_id`, `register` | `rain_accumulated`, `wind_speed`, `wind_direction`, `air_humidity`, `air_temperature`, `air_pressure`, `quality_flag` |
| POST | /api/observations/ingest | same client | - | - | por linha: `id` ou `external_id`, `register` | por linha: `rain_accumulated`, `wind_speed`, `wind_direction`, `air_humidity`, `air_temperature`, `air_pressure`, `quality_flag` |
| GET | /api/logs/ | admin | - | `limit` | - | - |
| GET | /api/logs/export | admin | - | `limit` | - | - |

Observações da tabela:

- Endpoints de ingest aceitam JSON e CSV.
- Para JSON de ingest: envie `application/json` no body.
- Para CSV de ingest: pode enviar `text/csv` no body ou `multipart/form-data` com campo `file`.

## Auth

- POST /api/auth/login [all]
- POST /api/auth/refresh [auth, requer refresh token]
- POST /api/auth/logout [auth]

Campos por endpoint:

- POST /api/auth/login
  - body obrigatório: `email`, `password`
- POST /api/auth/refresh
  - header obrigatório: `Authorization: Bearer <refresh_token>`
  - body: nenhum
- POST /api/auth/logout
  - header obrigatório: `Authorization: Bearer <access_token>`
  - body: nenhum

Body de login (exemplo):

```json
{ "email": "usuario@email.com", "password": "senha123" }
```

Headers comuns:

- Content-Type: application/json

Header para refresh:

- Authorization: Bearer <refresh_token>

## Users

- GET /api/users/ [same client] — retorna lista com `id`, `name`, `email`, `client_id`
- GET /api/users/<id> [same client] — retorna `id`, `name`, `email`, `client_id`, `role_id`
- POST /api/users/ [same client]
- PUT /api/users/<id> [same client]
- DELETE /api/users/<id> [same client]

Campos por endpoint:

- GET /api/users/
  - path params: nenhum
  - query params: nenhum
  - retorna: lista com `id`, `name`, `email`, `client_id`
- GET /api/users/<id>
  - path params obrigatórios: `id`
  - retorna: `id`, `name`, `email`, `client_id`, `role_id`
- POST /api/users/
  - body obrigatório: `name`, `email`, `password`
  - body opcional: `client_id`, `role_id` (são controlados pelo backend)
- PUT /api/users/<id>
  - path params obrigatórios: `id`
  - body opcional: `name`, `email`, `client_id`, `role_id`, `is_active`
- DELETE /api/users/<id>
  - path params obrigatórios: `id`
  - body: nenhum

Body mínimo de POST (exemplo):

```json
{ "name": "Nome", "email": "email@exemplo.com", "password": "senha" }
```

Regras importantes no POST /api/users/:

- client_id é definido automaticamente com o client_id do usuário autenticado que criou.
- role_id é forçado para 1.
- se o payload vier com client_id de outro cliente, retorna 403.

## Clients

- GET /api/clients/ [admin]
- GET /api/clients/<id> [same client] — admin vê qualquer cliente; cliente vê seus próprios dados
- POST /api/clients/ [admin]
- PUT /api/clients/<id> [admin]
- DELETE /api/clients/<id> [admin]

Campos por endpoint:

- GET /api/clients/
  - path/query params: nenhum
- GET /api/clients/<id>
  - path params obrigatórios: `id`
- POST /api/clients/
  - body obrigatório: `company_name`, `document`
  - body opcional: `is_active` (padrão `true`)
- PUT /api/clients/<id>
  - path params obrigatórios: `id`
  - body opcional: `company_name`, `document`, `is_active`
- DELETE /api/clients/<id>
  - path params obrigatórios: `id`
  - body: nenhum

Body de POST (exemplo):

```json
{ "company_name": "Empresa X", "document": "12.345.678/0001-99" }
```

## Roles

- GET /api/roles/ [admin]
- GET /api/roles/<id> [admin]
- POST /api/roles/ [admin]
- PUT /api/roles/<id> [admin]
- DELETE /api/roles/<id> [admin]

Campos por endpoint:

- GET /api/roles/
  - path/query params: nenhum
- GET /api/roles/<id>
  - path params obrigatórios: `id`
- POST /api/roles/
  - body obrigatório: `name`
- PUT /api/roles/<id>
  - path params obrigatórios: `id`
  - body opcional: `name`
- DELETE /api/roles/<id>
  - path params obrigatórios: `id`
  - body: nenhum

Body de POST/PUT (exemplo):

```json
{ "name": "admin" }
```

## Types

- GET /api/types/ [admin]
- GET /api/types/<id> [admin]
- POST /api/types/ [admin]
- PUT /api/types/<id> [admin]
- DELETE /api/types/<id> [admin]

Campos por endpoint:

- GET /api/types/
  - path/query params: nenhum
- GET /api/types/<id>
  - path params obrigatórios: `id`
- POST /api/types/
  - body obrigatório: `name`
- PUT /api/types/<id>
  - path params obrigatórios: `id`
  - body opcional: `name`
- DELETE /api/types/<id>
  - path params obrigatórios: `id`
  - body: nenhum

Body de POST/PUT (exemplo):

```json
{ "name": "pluviometro" }
```

## Providers

- GET /api/providers/ [admin]
- GET /api/providers/<id> [admin]
- POST /api/providers/ [admin]
- PUT /api/providers/<id> [admin]
- DELETE /api/providers/<id> [admin]

Campos por endpoint:

- GET /api/providers/
  - path/query params: nenhum
- GET /api/providers/<id>
  - path params obrigatórios: `id`
- POST /api/providers/
  - body obrigatório: `name`
- PUT /api/providers/<id>
  - path params obrigatórios: `id`
  - body opcional: `name`
- DELETE /api/providers/<id>
  - path params obrigatórios: `id`
  - body: nenhum

Body de POST/PUT (exemplo):

```json
{ "name": "MQTT" }
```

## Devices

- GET /api/devices/ [same client]
- GET /api/devices/<id> [same client]
- POST /api/devices/ [same client]
- POST /api/devices/ingest [same client]
- PUT /api/devices/<id> [same client]
- DELETE /api/devices/<id> [same client]

Campos por endpoint:

- GET /api/devices/
  - path/query params: nenhum
- GET /api/devices/<id>
  - body obrigatório: `external_id`, `name`, `type_id`, `provider_id`, `is_active`, `timezone`, `availability_interval`
  - `client_id` é definido automaticamente pelo usuário autenticado
  - `type_id` deve existir em `sensors.type`
  - `provider_id` deve existir em `sensors.provider`
  - path params obrigatórios: `id`
- POST /api/devices/
  - body obrigatório: `name`
  - body opcional: `external_id`, `name`, `type_id`, `provider_id`, `timezone`, `availability_interval`, `is_active`
  - body opcional: `external_id`, `type_id`, `provider_id`, `timezone`, `availability_interval`, `client_id`, `is_active`
- PUT /api/devices/<id>
  - path params obrigatórios: `id`
  - body opcional: `name`, `external_id`, `type_id`, `provider_id`, `timezone`, `availability_interval`, `client_id`, `is_active`
- DELETE /api/devices/<id>
  - path params obrigatórios: `id`
  - body: nenhum

Body mínimo de POST (exemplo):

```json
{ "name": "Sensor 01" }
```

Ingestão em lote de estações (JSON ou CSV):

- JSON: lista de estações ou objeto com `stations`/`devices`
- CSV: `text/csv` no body ou `multipart/form-data` com campo `file`
- Campo obrigatório por linha: `name`
- Campos obrigatórios por linha/nó: `external_id`, `name`, `type_id`, `provider_id`, `is_active`, `timezone`, `availability_interval`
- `client_id` é definido automaticamente pelo usuário autenticado
- `type_id` deve existir em `sensors.type`
- `provider_id` deve existir em `sensors.provider`
- Validação estrita: se faltar qualquer campo/coluna obrigatória, retorna `422` e não processa a ingestão
- Resposta: JSON ou XML, no mesmo formato do payload enviado, contendo `id` e `external_id`

## Locations

- GET /api/devices/<device_id>/location/ [same client]
- POST /api/devices/<device_id>/location/ [same client]
- PUT /api/devices/<device_id>/location/ [same client]
- DELETE /api/devices/<device_id>/location/ [same client]

Campos por endpoint:

- GET /api/devices/<device_id>/location/
  - path params obrigatórios: `device_id`
  - body: nenhum
- POST /api/devices/<device_id>/location/
  - path params obrigatórios: `device_id`
  - body obrigatório: `latitude`, `longitude`
- PUT /api/devices/<device_id>/location/
  - path params obrigatórios: `device_id`
  - body obrigatório: `latitude`, `longitude`
- DELETE /api/devices/<device_id>/location/
  - path params obrigatórios: `device_id`
  - body: nenhum

Body de POST/PUT (exemplo):

```json
{ "latitude": -23.5505, "longitude": -46.6333 }
```

Regras importantes:

- POST funciona como upsert: se a estação já tiver localização, atualiza; caso contrário, insere.
- ao salvar localização, o backend persiste latitude, longitude e geom (PostGIS).

## Observations

- GET /api/observations/ [same client]
- GET /api/observations/<device_id>?start=&end= [same client]
- POST /api/observations/ [same client]
- POST /api/observations/ingest [same client]

Campos por endpoint:

- GET /api/observations/
  - path/query params: nenhum
- GET /api/observations/<device_id>?start=&end=
  - path params obrigatórios: `device_id`
  - query params opcionais: `start`, `end`
- POST /api/observations/
  - body obrigatório: `device_id`, `register`
  - body opcional: `rain_accumulated`, `wind_speed`, `wind_direction`, `air_humidity`, `air_temperature`, `air_pressure`, `quality_flag`
- POST /api/observations/ingest
  - JSON: lista de observações ou objeto com `observations`
  - CSV: `text/csv` no body ou `multipart/form-data` com campo `file`
  - campos obrigatórios por linha: `device_id`, `register`
  - campos opcionais por linha: `rain_accumulated`, `wind_speed`, `wind_direction`, `air_humidity`, `air_temperature`, `air_pressure`, `quality_flag`

Body de POST (exemplo):

```json
{
  "device_id": 1,
  "register": "2026-06-15 10:30:00",
  "rain_accumulated": 2.1,
  "wind_speed": 12.5,
  "wind_direction": 180,
  "air_humidity": 72,
  "air_temperature": 24.8,
  "air_pressure": 1013.2,
  "quality_flag": true
}
```

Parâmetros de histórico:

- start e end são opcionais
- padrão: start=2000-01-01 e end=2099-12-31

Ingestão em lote de observações (JSON ou CSV):

- JSON: lista de observações ou objeto com `observations`
- CSV: `text/csv` no body ou `multipart/form-data` com campo `file`
- Campos obrigatórios por linha: `id` ou `external_id`, e `register`
- Se `external_id` for enviado, o backend converte para `device_id` antes de inserir
- Validação estrita: se faltar campo/coluna obrigatória, retorna `422` e não processa a ingestão
- Modo transacional (tudo ou nada): se qualquer linha falhar, nenhuma observação é inserida
- Resposta: `201` (sucesso total), `409` (duplicidade), `422` (payload inválido)

## Logs

- GET /api/logs/ [admin]
- GET /api/logs/export [admin]

### GET /api/logs/

Retorna os logs de auditoria mais recentes em JSON.

Parâmetros de query:

- `limit` (opcional, padrão: 100) — número máximo de registros retornados

### GET /api/logs/export

Faz download dos logs em formato XML (`logs.xml`).

Parâmetros de query:

- `limit` (opcional, padrão: 100) — número máximo de registros exportados

Campos por endpoint:

- GET /api/logs/
  - path params: nenhum
  - query params opcionais: `limit`
- GET /api/logs/export
  - path params: nenhum
  - query params opcionais: `limit`

Os logs são agrupados no Firebase por tipo de evento (`acesso_rota`, `login`, `logout`, `inclusao`, `alteracao`, `exclusao`, `erro`). Cada entrada contém os campos registrados conforme o evento:

| Evento | Campos |
|---|---|
| `login` / `logout` | `usuario`, `timestamp`, `ip`, `sucesso`, `user_agent` |
| `inclusao` | `tabela`, `registro_id`, `dados_inseridos`, `usuario`, `timestamp` |
| `alteracao` | `tabela`, `registro_id`, `antes`, `depois`, `usuario`, `timestamp` |
| `exclusao` | `tabela`, `registro_id`, `dados_excluidos`, `usuario`, `timestamp` |
| `erro` | `erro`, `stack_trace`, `endpoint`, `metodo`, `usuario`, `timestamp` |
| `acesso_rota` | `endpoint`, `metodo`, `status_code`, `tempo_resposta`, `usuario`, `timestamp` |

## Headers para endpoints autenticados

- Authorization: Bearer <access_token>
- Content-Type: application/json (quando houver body)
