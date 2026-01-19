-- Migração para adicionar rastreio de permissões ativas
ALTER TABLE notification_registry ADD COLUMN location_permission TEXT;
ALTER TABLE notification_registry ADD COLUMN notification_permission TEXT;
