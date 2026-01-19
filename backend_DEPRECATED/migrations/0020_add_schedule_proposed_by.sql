-- Add column to track who proposed the schedule
ALTER TABLE service_requests ADD COLUMN schedule_proposed_by INTEGER;
