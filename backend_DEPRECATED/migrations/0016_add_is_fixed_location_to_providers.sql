-- Migration to add is_fixed_location to providers table
-- This allows differentiating between fixed-location providers (with operating hours) and mobile providers.

ALTER TABLE providers ADD COLUMN is_fixed_location INTEGER DEFAULT 0;
