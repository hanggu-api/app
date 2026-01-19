-- Migration: Bootstrap Dynamic Theme System
-- Created at: 2026-02-20

CREATE TABLE IF NOT EXISTS app_theme (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT 0,
  version INTEGER DEFAULT 1,
  
  -- Cores Principais
  primary_color TEXT NOT NULL DEFAULT '#FFD700',
  primary_blue TEXT DEFAULT '#2f8fdfff',
  secondary_color TEXT DEFAULT '#FFA500',
  background_color TEXT DEFAULT '#FFFFFF',
  surface_color TEXT DEFAULT '#F5F5F5',
  error_color TEXT DEFAULT '#FF0000',
  success_color TEXT DEFAULT '#4CAF50',
  warning_color TEXT DEFAULT '#FF9800',
  
  -- Cores de Texto
  text_primary_color TEXT DEFAULT '#000000',
  text_secondary_color TEXT DEFAULT '#757575',
  text_disabled_color TEXT DEFAULT '#BDBDBD',
  text_hint_color TEXT DEFAULT '#9E9E9E',
  
  -- Cores de Botões
  button_primary_bg TEXT DEFAULT '#FFD700',
  button_primary_text TEXT DEFAULT '#000000',
  button_secondary_bg TEXT DEFAULT '#FFFFFF',
  button_secondary_text TEXT DEFAULT '#000000',
  button_outline_color TEXT DEFAULT '#000000',
  
  -- Bordas e Sombras
  border_radius_small REAL DEFAULT 8,
  border_radius_medium REAL DEFAULT 12,
  border_radius_large REAL DEFAULT 16,
  border_radius_xlarge REAL DEFAULT 24,
  border_width REAL DEFAULT 2,
  border_color TEXT DEFAULT '#000000',
  
  -- Tipografia
  font_family TEXT DEFAULT 'Roboto',
  font_size_tiny REAL DEFAULT 10,
  font_size_small REAL DEFAULT 12,
  font_size_medium REAL DEFAULT 14,
  font_size_large REAL DEFAULT 18,
  font_size_xlarge REAL DEFAULT 24,
  font_size_title REAL DEFAULT 32,
  
  -- Espaçamentos
  spacing_tiny REAL DEFAULT 4,
  spacing_small REAL DEFAULT 8,
  spacing_medium REAL DEFAULT 16,
  spacing_large REAL DEFAULT 24,
  spacing_xlarge REAL DEFAULT 32,
  
  -- Sombras (Box Shadow)
  shadow_color TEXT DEFAULT '#000000',
  shadow_opacity REAL DEFAULT 0.08,
  shadow_blur REAL DEFAULT 6,
  shadow_offset_x REAL DEFAULT 0,
  shadow_offset_y REAL DEFAULT 3,

  -- Metadados
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Strings
CREATE TABLE IF NOT EXISTS app_strings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  language TEXT DEFAULT 'pt-BR',
  category TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(key, language)
);

-- Tabela de Configurações
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  type TEXT DEFAULT 'string',
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir Tema Padrão Ativo
INSERT OR IGNORE INTO app_theme (
  name, is_active, version,
  primary_color, primary_blue, secondary_color, background_color,
  text_primary_color, text_secondary_color,
  button_primary_bg, button_primary_text,
  button_secondary_bg, button_secondary_text,
  button_outline_color,
  border_radius_medium, border_width, border_color
) VALUES (
  'Default Yellow & Black', 1, 1,
  '#FFD700', '#2a8ee0ff', '#FFA500', '#FFFFFF',
  '#000000', '#757575',
  '#FFD700', '#000000',
  '#FFFFFF', '#000000',
  '#000000',
  12, 2, '#000000'
);
