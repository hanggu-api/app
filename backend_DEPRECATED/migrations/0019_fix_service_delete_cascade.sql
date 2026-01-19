-- Migration: Fix Service Deletion Cascade
-- This migration recreates tables referencing service_requests to add ON DELETE CASCADE

-- 1. chat_messages
CREATE TABLE chat_messages_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id TEXT NOT NULL,
    sender_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    sent_at TEXT DEFAULT (datetime('now')),
    read_at TEXT,
    FOREIGN KEY(service_id) REFERENCES service_requests(id) ON DELETE CASCADE,
    FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT INTO chat_messages_new SELECT * FROM chat_messages;
DROP TABLE chat_messages;
ALTER TABLE chat_messages_new RENAME TO chat_messages;
CREATE INDEX idx_chat_messages_service_id ON chat_messages(service_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);

-- 2. appointments
CREATE TABLE appointments_new (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider_id" BIGINT NOT NULL,
    "client_id" BIGINT,
    "service_request_id" TEXT,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "appointments_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "appointments_service_request_id_fkey" FOREIGN KEY ("service_request_id") REFERENCES "service_requests" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
INSERT INTO appointments_new SELECT * FROM appointments;
DROP TABLE appointments;
ALTER TABLE appointments_new RENAME TO appointments;
CREATE INDEX "appointments_fk_app_service_idx" ON "appointments"("service_request_id");
CREATE INDEX "idx_appointments_provider_start" ON "appointments"("provider_id", "start_time");

-- 3. service_edit_requests
CREATE TABLE service_edit_requests_new (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "service_id" TEXT NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "additional_value" DECIMAL NOT NULL,
    "platform_fee" DECIMAL NOT NULL,
    "images_json" TEXT,
    "video_key" TEXT,
    "status" TEXT DEFAULT 'pending',
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "decided_at" DATETIME,
    CONSTRAINT "service_edit_requests_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service_requests" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "service_edit_requests_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
INSERT INTO service_edit_requests_new SELECT * FROM service_edit_requests;
DROP TABLE service_edit_requests;
ALTER TABLE service_edit_requests_new RENAME TO service_edit_requests;
CREATE INDEX "idx_service_edit_requests_service_id" ON "service_edit_requests"("service_id");

-- 4. transactions
CREATE TABLE transactions_new (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "service_id" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT DEFAULT 'pending',
    "provider_ref" TEXT,
    "description" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service_requests" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
INSERT INTO transactions_new SELECT * FROM transactions;
DROP TABLE transactions;
ALTER TABLE transactions_new RENAME TO transactions;
CREATE INDEX "idx_transactions_service_id" ON "transactions"("service_id");

-- 5. notificacao_de_servicos (Add Formal FK)
CREATE TABLE notificacao_de_servicos_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id TEXT,
    client_id INTEGER,
    profession TEXT,
    description TEXT,
    latitude REAL,
    longitude REAL,
    status TEXT DEFAULT 'pending',
    provider_id INTEGER,
    provider_name TEXT,
    provider_phone TEXT,
    scheduled_at TEXT,
    distance REAL,
    notification_attempts INTEGER DEFAULT 0,
    last_notification_at TEXT,
    requesting_user_id INTEGER,
    is_client INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ciclo_atual INTEGER DEFAULT 0,
    FOREIGN KEY(service_id) REFERENCES service_requests(id) ON DELETE CASCADE
);
INSERT INTO notificacao_de_servicos_new SELECT * FROM notificacao_de_servicos;
DROP TABLE notificacao_de_servicos;
ALTER TABLE notificacao_de_servicos_new RENAME TO notificacao_de_servicos;

-- 6. service_dispatch_history (Add Formal FK)
CREATE TABLE service_dispatch_history_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id TEXT NOT NULL,
    provider_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    fcm_message_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    details TEXT,
    FOREIGN KEY(service_id) REFERENCES service_requests(id) ON DELETE CASCADE
);
INSERT INTO service_dispatch_history_new SELECT * FROM service_dispatch_history;
DROP TABLE service_dispatch_history;
ALTER TABLE service_dispatch_history_new RENAME TO service_dispatch_history;
