-- migration/0028_add_app_theme.sql
CREATE TABLE IF NOT EXISTS app_theme (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version INTEGER DEFAULT 1,
  name TEXT DEFAULT 'default',
  is_active BOOLEAN DEFAULT 1,
  
  -- Cores
  primary_color TEXT DEFAULT '#FFD700',
  secondary_color TEXT DEFAULT '#FFA500',
  background_color TEXT DEFAULT '#FFFFFF',
  surface_color TEXT DEFAULT '#F5F5F5',
  error_color TEXT DEFAULT '#B00020',
  success_color TEXT DEFAULT '#4CAF50',
  warning_color TEXT DEFAULT '#FF9800',
  text_primary_color TEXT DEFAULT '#000000',
  text_secondary_color TEXT DEFAULT '#757575',
  text_disabled_color TEXT DEFAULT '#BDBDBD',
  text_hint_color TEXT DEFAULT '#9E9E9E',
  button_primary_bg TEXT DEFAULT '#FFD700',
  button_primary_text TEXT DEFAULT '#000000',
  button_secondary_bg TEXT DEFAULT '#E0E0E0',
  button_secondary_text TEXT DEFAULT '#000000',
  button_outline_color TEXT DEFAULT '#FFD700',
  
  -- Bordas
  border_radius_small REAL DEFAULT 4.0,
  border_radius_medium REAL DEFAULT 8.0,
  border_radius_large REAL DEFAULT 16.0,
  border_radius_xlarge REAL DEFAULT 24.0,
  border_width REAL DEFAULT 1.0,
  border_color TEXT DEFAULT '#E0E0E0',
  shadow_color TEXT DEFAULT '#000000',
  shadow_opacity REAL DEFAULT 0.08,
  shadow_blur REAL DEFAULT 6.0,
  shadow_offset_x REAL DEFAULT 0.0,
  shadow_offset_y REAL DEFAULT 3.0,
  
  -- Tipografia
  font_family TEXT DEFAULT 'Roboto',
  font_size_tiny REAL DEFAULT 10.0,
  font_size_small REAL DEFAULT 12.0,
  font_size_medium REAL DEFAULT 14.0,
  font_size_large REAL DEFAULT 18.0,
  font_size_xlarge REAL DEFAULT 24.0,
  font_size_title REAL DEFAULT 32.0,
  
  -- Espaçamento
  spacing_tiny REAL DEFAULT 4.0,
  spacing_small REAL DEFAULT 8.0,
  spacing_medium REAL DEFAULT 16.0,
  spacing_large REAL DEFAULT 24.0,
  spacing_xlarge REAL DEFAULT 32.0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inserir tema padrão
INSERT OR IGNORE INTO app_theme (name, is_active) VALUES ('default', 1);
