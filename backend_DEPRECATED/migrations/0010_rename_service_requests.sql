-- Migration: Rename service_requests_new to service_requests
-- This migration renames the table after all schema updates are complete

PRAGMA foreign_keys=OFF;

-- Drop any existing service_requests table or view
DROP TABLE IF EXISTS service_requests;
DROP VIEW IF EXISTS service_requests;

-- Rename service_requests_new to service_requests
ALTER TABLE service_requests_new RENAME TO service_requests;

PRAGMA foreign_keys=ON;
