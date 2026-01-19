PRAGMA foreign_keys = OFF;
DELETE FROM provider_professions;
DELETE FROM professions;
DELETE FROM service_categories;
DELETE FROM providers;
DELETE FROM notification_registry;
DELETE FROM service_requests;
DELETE FROM users;
PRAGMA foreign_keys = ON;

-- 1. Usuarios
INSERT INTO users (id, email, password_hash, full_name, role) VALUES (1, 'client@test.com', 'hash', 'Cliente Teste', 'client');
INSERT INTO users (id, email, password_hash, full_name, role) VALUES (2, 'provider1@test.com', 'hash', 'Prestador 1', 'provider');
INSERT INTO users (id, email, password_hash, full_name, role) VALUES (3, 'provider2@test.com', 'hash', 'Prestador 2', 'provider');

-- 2. Provedores
INSERT INTO providers (user_id, is_online, rating_avg, rating_count) VALUES (2, 1, 5.0, 10);
INSERT INTO providers (user_id, is_online, rating_avg, rating_count) VALUES (3, 1, 4.5, 5);

-- 3. Categorias de Servico
INSERT INTO service_categories (id, name) VALUES (1, 'Assistencia Tecnica');

-- 4. Profissoes
INSERT INTO professions (id, name, service_type, category_id) VALUES (1, 'Chaveiro', 'on_site', 1);

-- 5. Vincular Prestadores as Profissoes
INSERT INTO provider_professions (provider_user_id, profession_id) VALUES (2, 1);
INSERT INTO provider_professions (provider_user_id, profession_id) VALUES (3, 1);
