-- SQLite Compatible Migration for D1
ALTER TABLE service_requests ADD COLUMN task_id INTEGER REFERENCES task_catalog(id);
CREATE INDEX IF NOT EXISTS idx_task_id ON service_requests(task_id);
