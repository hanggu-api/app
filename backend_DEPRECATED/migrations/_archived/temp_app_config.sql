CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value TEXT, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO app_config (key, value, description) VALUES ('dispatch_max_cycles', '10', 'Number of cycles before opening service to all');
