-- Migration: Add is_dismissed column to service_requests
-- This allows users to hide completed services from the home screen without necessarily reviewing them.

ALTER TABLE service_requests ADD COLUMN is_dismissed INTEGER DEFAULT 0;
