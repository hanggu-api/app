PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS notification_registry;
DROP TABLE IF EXISTS service_requests;
DROP TABLE IF EXISTS provider_professions;
DROP TABLE IF EXISTS professions;
DROP TABLE IF EXISTS service_categories;
DROP TABLE IF EXISTS providers;
DROP TABLE IF EXISTS users;

-- Recriar estrutura m?nima para o Worker n?o reclamar
CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, full_name TEXT, role TEXT, fcm_token TEXT, password_hash TEXT);
CREATE TABLE providers (user_id INTEGER PRIMARY KEY, is_online INTEGER, rating_avg REAL, rating_count INTEGER);
CREATE TABLE service_categories (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE professions (id INTEGER PRIMARY KEY, name TEXT, category_id INTEGER);
CREATE TABLE provider_professions (provider_user_id INTEGER, profession_id INTEGER);
CREATE TABLE service_requests (id TEXT PRIMARY KEY, client_id INTEGER, category_id INTEGER, description TEXT, latitude REAL, longitude REAL, address TEXT, price_estimated REAL, price_upfront REAL, location_type TEXT, profession TEXT, provider_id INTEGER, status TEXT, created_at TEXT);
CREATE TABLE notification_registry (user_id INTEGER PRIMARY KEY, fcm_token TEXT, latitude REAL, longitude REAL, is_online INTEGER, professions TEXT, updated_at TEXT);

-- Inserir Dados de Teste
INSERT INTO users (id, email, full_name, role) VALUES (1, 'client@test.com', 'Cliente Teste', 'client');
INSERT INTO users (id, email, full_name, role) VALUES (2, 'provider1@test.com', 'Prestador 1', 'provider');
INSERT INTO users (id, email, full_name, role) VALUES (3, 'provider2@test.com', 'Prestador 2', 'provider');
INSERT INTO providers (user_id, is_online) VALUES (2, 1), (3, 1);
INSERT INTO service_categories (id, name) VALUES (1, 'Assistencia Tecnica');
INSERT INTO professions (id, name, category_id) VALUES (1, 'Chaveiro', 1);
INSERT INTO provider_professions (provider_user_id, profession_id) VALUES (2, 1), (3, 1);

PRAGMA foreign_keys = ON;
