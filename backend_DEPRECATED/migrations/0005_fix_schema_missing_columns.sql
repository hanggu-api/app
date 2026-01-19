-- Migration: Add missing columns to service_requests
-- Adding started_at, finished_at, and payment_remaining_status

ALTER TABLE service_requests ADD COLUMN started_at DATETIME;
ALTER TABLE service_requests ADD COLUMN finished_at DATETIME;
