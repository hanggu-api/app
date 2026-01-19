-- Migration: Final rename of service_requests_new to service_requests
-- This fixes the inconsistency between the code and foreign key constraints in wallet_transactions

PRAGMA foreign_keys=OFF;

-- 1. Ensure service_requests doesn't exist as a view or table
DROP TABLE IF EXISTS service_requests;

-- 2. Rename the current table
ALTER TABLE service_requests_new RENAME TO service_requests;

PRAGMA foreign_keys=ON;
