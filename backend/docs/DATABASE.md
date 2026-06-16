````mermaid
erDiagram
    %% ==========================================
    %% SCHEMA: public (Usuários e Permissões)
    %% ==========================================
    
    public_client {
        int id PK
        string company_name "Razão Social / Nome"
        string document "CNPJ / CPF"
        bool is_active
        timestamp created_at
    }

    public_user {
        int id PK
        string name
        string email
        string password_hash
        int client_id FK
        int role_id FK
        bool is_active
    }

    public_role {
        int id PK
        string name "ex: admin, operador, visualizador"
    }

    %% ==========================================
    %% SCHEMA: sensors (Infraestrutura e Coletas)
    %% ==========================================
    
    sensors_type {
        int id PK
        string name "ex: pluviometro, estacao"
    }

    sensors_provider {
        int id PK
        string name "ex: zeus, api_externa"
    }

    sensors_device {
        int id PK "serial not null"
        int external_id "ID no sistema de origem"
        string name "Nome do equipamento"
        int type_id FK
        int provider_id FK
        bool is_active
        string timezone
        int availability_interval "Intervalo de leitura"
        int client_id FK "Aponta para public.client.id"
    }

    sensors_location {
        int device_id PK, FK "not null"
        geometry geom
        float latitude
        float longitude
    }

    sensors_observation {
        int device_id PK, FK
        timestamp register PK
        float rain_accumulated
        float wind_speed 
        float wind_direction 
        float air_humidity 
        float air_temperature 
        float air_pressure
        bool quality_flag
    }

    %% ==========================================
    %% Relacionamentos do Schema: public
    %% ==========================================
    public_client ||--o{ public_user : "possui"
    public_role ||--o{ public_user : "define_permissoes"

    %% ==========================================
    %% Relacionamentos do Schema: sensors
    %% ==========================================
    sensors_type ||--o{ sensors_device : "classifica"
    sensors_provider ||--o{ sensors_device : "fornece"
    sensors_device ||--|| sensors_location : "esta_em"
    sensors_device ||--o{ sensors_observation : "registra"

    %% ==========================================
    %% Relacionamento ENTRE os Schemas (A Ponte)
    %% ==========================================
    public_client ||--o{ sensors_device : "vence_ou_aloca"

## Backlog Baseado no SQL

O [sql/insert.sql](../sql/insert.sql) aponta as próximas frentes de API:

- `clients`
- `types`
- `providers`
- `devices`
- `devices/<id>/location`
- `observations`

### Regras mínimas

- `client.company_name` obrigatório.
- `type.name` e `provider.name` obrigatórios e únicos.
- `device.name` obrigatório; `type_id`, `provider_id` e `client_id` devem existir; `availability_interval` > 0.
- `location.device_id` deve existir; latitude entre -90 e 90; longitude entre -180 e 180; 1:1 por `device_id`.
- `observation.device_id` deve existir; `register` obrigatório; `(device_id, register)` não pode repetir.