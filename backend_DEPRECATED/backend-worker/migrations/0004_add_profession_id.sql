-- Migration: Add profession_id to service_requests
ALTER TABLE service_requests ADD COLUMN profession_id INTEGER;

-- Add index for profession_id to optimize searches
CREATE INDEX IF NOT EXISTS idx_service_requests_profession_id ON service_requests(profession_id);

-- Optional: Link to professions table if you want strict FK (D1 supports this)
-- Note: SQLite ALTER TABLE has limitations with ADD CONSTRAINT, 
-- but we can keep it as a simple INTEGER for now as requested.
