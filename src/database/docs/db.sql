-- ==========================================
-- 1. CRIAÇÃO DOS SCHEMAS
-- ==========================================
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS sensors;

-- ==========================================
-- 2. ATIVAÇÃO DA EXTENSÃO GEOGRÁFICA (PostGIS)
-- ==========================================
-- Ativa suporte a dados geográficos (necessário para o tipo GEOMETRY)
CREATE EXTENSION IF NOT EXISTS postgis;


-- ==========================================
-- 3. TABELAS DO SCHEMA: public (Usuários e Clientes)
-- ==========================================

-- Tabela de Clientes/Empresas
CREATE TABLE public.client (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    document VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Perfis de Acesso (Admin, Operador, etc)
CREATE TABLE public.role (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

-- Tabela de Usuários do Sistema
CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    client_id INT REFERENCES public.client(id) ON DELETE SET NULL,
    role_id INT REFERENCES public.role(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT TRUE
);


-- ==========================================
-- 4. TABELAS DO SCHEMA: sensors (Infraestrutura)
-- ==========================================

-- Tabela de Tipos de Dispositivos (ex: Pluviômetro, Estação)
CREATE TABLE sensors.type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Tabela de Provedores/Fabricantes (ex: Zeus, API Externa)
CREATE TABLE sensors.provider (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Tabela de Dispositivos/Sensores
CREATE TABLE sensors.device (
    id SERIAL PRIMARY KEY,
    external_id INT,
    name VARCHAR(150) NOT NULL,
    type_id INT REFERENCES sensors.type(id) ON DELETE RESTRICT,
    provider_id INT REFERENCES sensors.provider(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT TRUE,
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    availability_interval INT, -- Intervalo de leitura em minutos
    client_id INT REFERENCES public.client(id) ON DELETE SET NULL
);

-- Tabela de Localização (Relacionamento 1:1 com Device)
CREATE TABLE sensors.location (
    device_id INT PRIMARY KEY REFERENCES sensors.device(id) ON DELETE CASCADE,
    geom GEOMETRY(Point, 4326), -- Código 4326 é o padrão WGS84 usado em GPS (Lat/Long)
    latitude FLOAT,
    longitude FLOAT
);

-- Tabela de Coletas/Observações (Dados Históricos como Tabela Padrão)
CREATE TABLE sensors.observation (
    device_id INT REFERENCES sensors.device(id) ON DELETE CASCADE,
    register TIMESTAMP NOT NULL,
    rain_accumulated FLOAT,
    wind_speed FLOAT,
    wind_direction FLOAT,
    air_humidity FLOAT,
    air_temperature FLOAT,
    air_pressure FLOAT,
    quality_flag BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (device_id, register) -- Chave primária composta (Dispositivo + Hora)
);