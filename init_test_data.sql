DELETE FROM users;
DELETE FROM notification_registry;
DELETE FROM service_requests;
INSERT INTO users (id, email, password_hash, full_name, role) VALUES (1, 'client@test.com', 'hash', 'Cliente Teste', 'client');
INSERT INTO users (id, email, password_hash, full_name, role) VALUES (2, 'provider1@test.com', 'hash', 'Prestador 1', 'provider');
INSERT INTO users (id, email, password_hash, full_name, role) VALUES (3, 'provider2@test.com', 'hash', 'Prestador 2', 'provider');
