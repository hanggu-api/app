-- Adiciona colunas de telemetria de dispositivo para anti-fraude
ALTER TABLE notification_registry ADD COLUMN device_name TEXT;
ALTER TABLE notification_registry ADD COLUMN device_model TEXT;
ALTER TABLE notification_registry ADD COLUMN os_version TEXT;
ALTER TABLE notification_registry ADD COLUMN device_id TEXT;
ALTER TABLE notification_registry ADD COLUMN device_platform TEXT;
ALTER TABLE notification_registry ADD COLUMN app_version TEXT;
ALTER TABLE notification_registry ADD COLUMN last_device_update DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Índice único por user_id + device_id para rastrear múltiplos dispositivos
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_registry_user_device 
ON notification_registry(user_id, device_id) WHERE device_id IS NOT NULL;

-- Índice para consultas por modelo de dispositivo (análise de fraude)
CREATE INDEX IF NOT EXISTS idx_notification_registry_device_model 
ON notification_registry(device_model);
