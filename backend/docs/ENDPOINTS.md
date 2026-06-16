# ENDPOINTS — ProjetoWEB

Este arquivo reúne apenas a documentação dos endpoints da API. A documentação geral do projeto fica em [README.md](../README.md).

## Acesso

- `all` = qualquer usuário autenticado
- `admin` = somente admin
- `same client` = admin ou usuário do mesmo `client_id`

## Auth

- `POST /api/auth/login` - retorna `access_token` e `refresh_token` [`all`]
- `POST /api/auth/refresh` - gera novo `access_token` [`all`]

Body do login:

```json
{ "email": "usuario@email.com", "password": "senha123" }
```

Headers:
- `Content-Type: application/json`

Headers do refresh:
- `Authorization: Bearer <refresh_token>`
- `Content-Type: application/json`

## Users

- `GET /api/users/` - lista usuários ativos [`same client`]
- `GET /api/users/<id>` - busca usuário por ID [`same client`]
- `POST /api/users/` - cria usuário; body: `name`, `email`, `password` [`same client`]
- `PUT /api/users/<id>` - atualiza usuário [`same client`]
- `DELETE /api/users/<id>` - desativa usuário [`same client`]

Headers:
- `Authorization: Bearer <access_token>`

Headers de `POST` e `PUT`:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body de `POST`:
```json
{ "name": "Nome", "email": "email@exemplo.com", "password": "senha" }
```

## Clients

- `GET /api/clients/` - lista clientes [`admin`]
- `GET /api/clients/<id>` - busca cliente por ID [`admin`]
- `POST /api/clients/` - cria cliente; body: `company_name` [`admin`]
- `PUT /api/clients/<id>` - atualiza cliente [`admin`]
- `DELETE /api/clients/<id>` - desativa cliente [`admin`]

Headers:
- `Authorization: Bearer <access_token>`

Headers de `POST` e `PUT`:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body de `POST`:
```json
{ "company_name": "Empresa X", "document": "12.345.678/0001-99" }
```

## Types

- `GET /api/types/` - lista tipos [`admin`]
- `GET /api/types/<id>` - busca tipo por ID [`admin`]
- `POST /api/types/` - cria tipo; body: `name` [`admin`]
- `PUT /api/types/<id>` - atualiza tipo [`admin`]
- `DELETE /api/types/<id>` - remove tipo [`admin`]

Headers:
- `Authorization: Bearer <access_token>`

Headers de `POST` e `PUT`:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body de `POST`:
```json
{ "name": "pluviometro" }
```

## Providers

- `GET /api/providers/` - lista provedores [`admin`]
- `GET /api/providers/<id>` - busca provedor por ID [`admin`]
- `POST /api/providers/` - cria provedor; body: `name` [`admin`]
- `PUT /api/providers/<id>` - atualiza provedor [`admin`]
- `DELETE /api/providers/<id>` - remove provedor [`admin`]

Headers:
- `Authorization: Bearer <access_token>`

Headers de `POST` e `PUT`:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body de `POST`:
```json
{ "name": "MQTT" }
```

## Devices

- `GET /api/devices/` - lista dispositivos ativos [`same client`]
- `GET /api/devices/<id>` - busca dispositivo por ID [`same client`]
- `POST /api/devices/` - cria dispositivo; body: `name` [`same client`]
- `PUT /api/devices/<id>` - atualiza dispositivo [`same client`]
- `DELETE /api/devices/<id>` - desativa dispositivo [`same client`]

Headers:
- `Authorization: Bearer <access_token>`

Headers de `POST` e `PUT`:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body de `POST`:
```json
{ "name": "Sensor 01", "type_id": 1, "provider_id": 1, "client_id": 1 }
```

## Location

- `GET /api/devices/<device_id>/location/` - busca localização do dispositivo [`same client`]
- `POST /api/devices/<device_id>/location/` - cria localização; body: `latitude`, `longitude` [`same client`]
- `PUT /api/devices/<device_id>/location/` - atualiza localização; body: `latitude`, `longitude` [`same client`]
- `DELETE /api/devices/<device_id>/location/` - remove localização [`same client`]

Headers:
- `Authorization: Bearer <access_token>`

Headers de `POST` e `PUT`:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body de `POST` e `PUT`:
```json
{ "latitude": -23.5505, "longitude": -46.6333 }
```

## Roles

- `GET /api/roles/` - lista roles [`admin`]
- `GET /api/roles/<id>` - busca role por ID [`admin`]
- `POST /api/roles/` - cria role; body: `name` [`admin`]
- `PUT /api/roles/<id>` - atualiza role; body: `name` [`admin`]
- `DELETE /api/roles/<id>` - desativa role [`admin`]

Headers:
- `Authorization: Bearer <access_token>`

Headers de `POST` e `PUT`:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body de `POST`:
```json
{ "name": "admin" }
```

## Observations

- `GET /api/observations/` - lista geral [`same client`]
- `GET /api/observations/<id>?start=&end=` - histórico por dispositivo [`same client`]
- `POST /api/observations/` - registra observação; body: `device_id`, `register` [`same client`]

Headers:
- `Authorization: Bearer <access_token>`

Headers de `POST`:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body de `POST`:
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

`start` e `end` são opcionais no `GET /<id>`; padrão `2000-01-01` e `2099-12-31`.
