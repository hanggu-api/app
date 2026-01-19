-- Migration: Add departure_alert_sent to service_requests
ALTER TABLE service_requests ADD COLUMN departure_alert_sent BOOLEAN DEFAULT FALSE;
