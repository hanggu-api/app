-- Migration: Add profession_id to service_requests
ALTER TABLE service_requests ADD COLUMN profession_id INTEGER;

-- Add index for profession_id to optimize searches
CREATE INDEX IF NOT EXISTS idx_service_requests_profession_id ON service_requests(profession_id);
