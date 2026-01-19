-- Migration: Fix foreign key constraints in notificacao_de_servicos
-- Remove foreign keys that reference old table name service_requests

PRAGMA foreign_keys=OFF;

-- Backup existing data
CREATE TABLE notificacao_de_servicos_backup AS SELECT * FROM notificacao_de_servicos;

-- Drop old table
DROP TABLE notificacao_de_servicos;

-- Create new table WITHOUT foreign key constraints (D1 doesn't enforce them strictly anyway)
CREATE TABLE notificacao_de_servicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id TEXT NOT NULL,
    provider_user_id BIGINT NOT NULL,
    fcm_token TEXT NOT NULL,
    service_name TEXT NOT NULL,
    profession_id INTEGER,
    price_total DECIMAL(10, 2),
    price_provider DECIMAL(10, 2),
    commission_rate DECIMAL(5, 2),
    distance DECIMAL(10, 2) NOT NULL,
    service_latitude DECIMAL(10, 8),
    service_longitude DECIMAL(10, 8),
    provider_latitude DECIMAL(10, 8),
    provider_longitude DECIMAL(10, 8),
    notification_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'DELIVERED', 'ACCEPTED', 'REJECTED', 'SILENCE')),
    last_notified_at DATETIME,
    queue_order INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ciclo_atual INTEGER DEFAULT 0
);

-- Restore data
INSERT INTO notificacao_de_servicos 
SELECT * FROM notificacao_de_servicos_backup;

-- Drop backup
DROP TABLE notificacao_de_servicos_backup;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_notificacao_service_id ON notificacao_de_servicos(service_id);
CREATE INDEX IF NOT EXISTS idx_notificacao_provider_id ON notificacao_de_servicos(provider_user_id);
CREATE INDEX IF NOT EXISTS idx_notificacao_status ON notificacao_de_servicos(status);
CREATE INDEX IF NOT EXISTS idx_notificacao_queue_order ON notificacao_de_servicos(service_id, queue_order);

PRAGMA foreign_keys=ON;
