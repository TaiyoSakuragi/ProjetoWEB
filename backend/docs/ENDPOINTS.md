# ENDPOINTS — ProjetoWEB

Documentação dos endpoints da API backend. Para setup e execução, consulte [backend/README.md](../README.md).

## Convenções de acesso

- all: endpoint público
- auth: qualquer usuário autenticado
- same client: admin ou usuário do mesmo client_id
- admin: apenas admin

## Auth

- POST /api/auth/login [all]
- POST /api/auth/refresh [auth, requer refresh token]

Body de login:

```json
{ "email": "usuario@email.com", "password": "senha123" }
```

Headers comuns:

- Content-Type: application/json

Header para refresh:

- Authorization: Bearer <refresh_token>

## Users

- GET /api/users/ [same client]
- GET /api/users/<id> [same client]
- POST /api/users/ [same client]
- PUT /api/users/<id> [same client]
- DELETE /api/users/<id> [same client]

Body mínimo de POST:

```json
{ "name": "Nome", "email": "email@exemplo.com", "password": "senha" }
```

Regras importantes no POST /api/users/:

- client_id é definido automaticamente com o client_id do usuário autenticado que criou.
- role_id é forçado para 1.
- se o payload vier com client_id de outro cliente, retorna 403.

## Clients

- GET /api/clients/ [admin]
- GET /api/clients/<id> [admin]
- POST /api/clients/ [admin]
- PUT /api/clients/<id> [admin]
- DELETE /api/clients/<id> [admin]

Body de POST:

```json
{ "company_name": "Empresa X", "document": "12.345.678/0001-99" }
```

## Roles

- GET /api/roles/ [admin]
- GET /api/roles/<id> [admin]
- POST /api/roles/ [admin]
- PUT /api/roles/<id> [admin]
- DELETE /api/roles/<id> [admin]

Body de POST/PUT:

```json
{ "name": "admin" }
```

## Types

- GET /api/types/ [admin]
- GET /api/types/<id> [admin]
- POST /api/types/ [admin]
- PUT /api/types/<id> [admin]
- DELETE /api/types/<id> [admin]

Body de POST/PUT:

```json
{ "name": "pluviometro" }
```

## Providers

- GET /api/providers/ [admin]
- GET /api/providers/<id> [admin]
- POST /api/providers/ [admin]
- PUT /api/providers/<id> [admin]
- DELETE /api/providers/<id> [admin]

Body de POST/PUT:

```json
{ "name": "MQTT" }
```

## Devices

- GET /api/devices/ [same client]
- GET /api/devices/<id> [same client]
- POST /api/devices/ [same client]
- PUT /api/devices/<id> [same client]
- DELETE /api/devices/<id> [same client]

Body mínimo de POST:

```json
{ "name": "Sensor 01" }
```

## Locations

- GET /api/devices/<device_id>/location/ [same client]
- POST /api/devices/<device_id>/location/ [same client]
- PUT /api/devices/<device_id>/location/ [same client]
- DELETE /api/devices/<device_id>/location/ [same client]

Body de POST/PUT:

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

Body de POST:

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

## Headers para endpoints autenticados

- Authorization: Bearer <access_token>
- Content-Type: application/json (quando houver body)
