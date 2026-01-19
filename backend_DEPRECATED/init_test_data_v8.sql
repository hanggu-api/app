-- Limpar dados (sem falhar se nao existirem)
DELETE FROM provider_professions;
DELETE FROM professions;
DELETE FROM notification_registry;
DELETE FROM service_requests;
DELETE FROM users;

-- Inserir Profissao (FIX: Removido slug conforme feedback do usuario)
INSERT INTO professions (id, name, service_type) VALUES (1, 'Chaveiro', 'on_site');

-- Inserir Usuarios
INSERT INTO users (id, email, password_hash, full_name, role) VALUES (1, 'client@test.com', 'hash', 'Cliente Teste', 'client');
INSERT INTO users (id, email, password_hash, full_name, role) VALUES (2, 'provider1@test.com', 'hash', 'Prestador 1', 'provider');
INSERT INTO users (id, email, password_hash, full_name, role) VALUES (3, 'provider2@test.com', 'hash', 'Prestador 2', 'provider');

-- Vincular Prestadores
INSERT INTO provider_professions (provider_user_id, profession_id) VALUES (2, 1);
INSERT INTO provider_professions (provider_user_id, profession_id) VALUES (3, 1);
