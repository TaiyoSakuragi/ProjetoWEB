-- ==========================================
-- 1. TABELAS INDEPENDENTES
-- ==========================================

-- Schema: public
INSERT INTO public.client (company_name, document, is_active, created_at) VALUES
('Empresa A', '12.345.678/0001-99', true, CURRENT_TIMESTAMP),
('Empresa B', '98.765.432/0001-11', true, CURRENT_TIMESTAMP);

INSERT INTO public.role (name) VALUES
('admin'),
('cliente');

-- Schema: sensors
INSERT INTO sensors.type (name) VALUES
('pluviometro'),
('umidade_temperatura');

INSERT INTO sensors.provider (name) VALUES
('LoRa'),
('MQTT');

-- ==========================================
-- 2. TABELAS DEPENDENTES (NÍVEL 1)
-- ==========================================

-- Schema: public (Usuários)
-- Senha admin: admin
-- Senha client: client
INSERT INTO public."users" (name, email, password_hash, client_id, role_id, is_active) VALUES
('admin', 'admin@empresaa.com', '$2b$12$ybIY4XTG.HLHDuIsy/DUmu0iIPvwPm.FWz8QICxzWmKuv8BLx86D.', 1, 1, true),
('client', 'client@empresab.com', '$2b$12$.TeCnQ6uzJGWI2J6cX9OUO/.Mr/nCn.EvrI6xD4XCzp6GmdK/PBxe', 2, 2, true);

-- Schema: sensors (Dispositivos)
INSERT INTO sensors.device (external_id, name, type_id, provider_id, is_active, timezone, availability_interval, client_id) VALUES
-- type_id 2 (umidade_temperatura), provider_id 1 (LoRa), client_id 1 (Empresa A)
(1001, 'Sensor de Umidade e Temperatura', 2, 1, true, 'America/Sao_Paulo', 15, 1),
-- type_id 1 (pluviometro), provider_id 2 (MQTT), client_id 2 (Empresa B)
(2005, 'Pluviômetro', 1, 2, true, 'America/Sao_Paulo', 60, 2);

-- ==========================================
-- 3. TABELAS DEPENDENTES (NÍVEL 2)
-- ==========================================

-- Localização 
INSERT INTO sensors.location (device_id, geom, latitude, longitude) VALUES
(1, ST_SetSRID(ST_MakePoint(-45.8869, -23.1791), 4326), -23.1791, -45.8869),
(2, ST_SetSRID(ST_MakePoint(-46.6333, -23.5505), 4326), -23.5505, -46.6333);

-- Observações (Leituras)
INSERT INTO sensors.observation (
    device_id, register, rain_accumulated, wind_speed, wind_direction, 
    air_humidity, air_temperature, air_pressure, quality_flag
) VALUES
-- Dispositivo 1: Umidade e Temperatura (Empresa A)
(1, '2026-06-15 01:00:00', NULL, NULL, NULL, 65.0, 22.5, NULL, true),
(1, '2026-06-15 01:15:00', NULL, NULL, NULL, 68.0, 21.0, NULL, true),

-- Dispositivo 2: Pluviômetro (Empresa B)
(2, '2026-06-15 01:00:00', 5.5, NULL, NULL, NULL, NULL, NULL, true);
