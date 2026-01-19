PRAGMA foreign_keys = OFF;

-- Drop in order of dependencies
DROP TABLE IF EXISTS wallet_transactions;
DROP TABLE IF EXISTS service_tasks;
DROP TABLE IF EXISTS task_catalog;
DROP TABLE IF EXISTS provider_professions;
DROP TABLE IF EXISTS notificacao_de_servicos;
DROP TABLE IF EXISTS provider_locations;
DROP TABLE IF EXISTS service_requests_new;
DROP TABLE IF EXISTS providers;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS service_categories;
DROP TABLE IF EXISTS professions;
DROP TABLE IF EXISTS notification_registry;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS app_config;

-- Recreate Tables
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firebase_uid TEXT UNIQUE,
    email TEXT UNIQUE,
    full_name TEXT,
    role TEXT,
    phone TEXT,
    avatar_url TEXT,
    fcm_token TEXT,
    password_hash TEXT,
    created_at TEXT,
    last_seen_at TEXT,
    is_verified INTEGER DEFAULT 0
);

CREATE TABLE providers (
    user_id INTEGER PRIMARY KEY,
    commercial_name TEXT,
    address TEXT,
    latitude REAL,
    longitude REAL,
    document_type TEXT,
    document_value TEXT,
    is_online INTEGER DEFAULT 0,
    rating_avg REAL DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    wallet_balance REAL DEFAULT 0.0,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE wallet_transactions (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    service_id TEXT,
    amount REAL,
    type TEXT,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE service_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);
CREATE TABLE professions (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, category_id INTEGER);
CREATE TABLE provider_professions (provider_user_id INTEGER, profession_id INTEGER);

CREATE TABLE task_catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profession_id INTEGER,
    name TEXT,
    pricing_type TEXT,
    unit_name TEXT,
    unit_price REAL,
    keywords TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT,
    FOREIGN KEY(profession_id) REFERENCES professions(id)
);

CREATE TABLE service_requests_new (
    id TEXT PRIMARY KEY,
    client_id INTEGER,
    category_id INTEGER,
    task_id INTEGER,
    profession_id INTEGER,
    description TEXT,
    latitude REAL,
    longitude REAL,
    address TEXT,
    price_estimated REAL,
    price_upfront REAL,
    provider_amount REAL,
    location_type TEXT,
    profession TEXT,
    provider_id INTEGER,
    status TEXT,
    scheduled_at TEXT,
    arrived_at TEXT,
    started_at TEXT,
    finished_at TEXT,
    proof_video TEXT,
    completion_code TEXT,
    payment_remaining_status TEXT DEFAULT 'pending',
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY(client_id) REFERENCES users(id),
    FOREIGN KEY(task_id) REFERENCES task_catalog(id)
);

CREATE TABLE service_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id TEXT,
    name TEXT,
    quantity REAL DEFAULT 1.0,
    unit_price REAL,
    subtotal REAL,
    created_at TEXT,
    FOREIGN KEY(service_id) REFERENCES service_requests_new(id) ON DELETE CASCADE
);

CREATE TABLE notification_registry (
    user_id INTEGER PRIMARY KEY,
    fcm_token TEXT,
    latitude REAL,
    longitude REAL,
    is_online INTEGER,
    professions_ids TEXT,
    last_seen_at TEXT,
    radius_km REAL DEFAULT 50
);

CREATE TABLE notificacao_de_servicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id TEXT,
    provider_user_id INTEGER,
    fcm_token TEXT,
    status TEXT,
    last_notified_at TEXT,
    service_name TEXT,
    profession_id INTEGER,
    price_total REAL,
    price_provider REAL,
    commission_rate REAL,
    distance REAL,
    service_latitude REAL,
    service_longitude REAL,
    provider_latitude REAL,
    provider_longitude REAL,
    notification_count INTEGER DEFAULT 0,
    queue_order INTEGER,
    ciclo_atual INTEGER DEFAULT 1
);

CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id TEXT,
    user_id INTEGER,
    amount REAL,
    status TEXT,
    mp_payment_id TEXT,
    payment_method_id TEXT,
    payer_email TEXT,
    created_at TEXT
);

CREATE TABLE app_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    type TEXT
);

CREATE TABLE provider_locations (
    provider_id INTEGER PRIMARY KEY,
    latitude REAL,
    longitude REAL,
    updated_at TEXT
);

-- Seed Data
INSERT INTO app_config (key, value, type) VALUES ('platform_commission_rate', '15', 'number');
INSERT INTO service_categories (id, name) VALUES (1, 'Assistencia Tecnica'), (2, 'Eletricista');
INSERT INTO professions (id, name, category_id) VALUES (1, 'Chaveiro', 1), (2, 'Eletricista', 2);
INSERT INTO task_catalog (id, profession_id, name, unit_price) VALUES (1, 2, 'Troca de fiação', 100.0);

PRAGMA foreign_keys = ON;
