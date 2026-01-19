-- Migration: Add shadow configuration columns to app_theme
-- These allow remote control of box-shadow properties
ALTER TABLE app_theme ADD COLUMN shadow_color TEXT DEFAULT '#000000';
ALTER TABLE app_theme ADD COLUMN shadow_opacity REAL DEFAULT 0.08;
ALTER TABLE app_theme ADD COLUMN shadow_blur REAL DEFAULT 6;
ALTER TABLE app_theme ADD COLUMN shadow_offset_x REAL DEFAULT 0;
ALTER TABLE app_theme ADD COLUMN shadow_offset_y REAL DEFAULT 3;

-- Update existing active theme with default shadow values
UPDATE app_theme SET 
  shadow_color = '#000000',
  shadow_opacity = 0.08,
  shadow_blur = 6,
  shadow_offset_x = 0,
  shadow_offset_y = 3
WHERE is_active = 1;
