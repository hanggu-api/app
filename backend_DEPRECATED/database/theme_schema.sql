-- =====================================================
-- Sistema de Tema Dinâmico - Database Schema
-- =====================================================

-- Tabela: app_theme
-- Armazena todas as configurações visuais do tema
CREATE TABLE IF NOT EXISTS app_theme (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT 0,
  version INTEGER DEFAULT 1,
  
  -- Cores Principais
  primary_color TEXT NOT NULL DEFAULT '#FFD700',
  primary_blue TEXT DEFAULT ' ',
  secondary_color TEXT DEFAULT '#FFA500',
  background_color TEXT DEFAULT '#FFFFFF',
  surface_color TEXT DEFAULT '#F5F5F5',
  error_color TEXT DEFAULT 'rgba(255, 0, 0, 1)',
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

  -- Cores de Categorias (Home Redesign)
  category_trip_bg TEXT DEFAULT 'rgba(255, 215, 0, 0.2)',
  category_service_bg TEXT DEFAULT 'rgba(33, 150, 243, 0.1)',
  category_package_bg TEXT DEFAULT 'rgba(255, 165, 0, 0.1)',
  category_reserve_bg TEXT DEFAULT 'rgba(76, 175, 80, 0.1)',

  -- Metadados
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_theme_active ON app_theme(is_active);

-- =====================================================
-- Tabela: app_strings
-- Armazena todos os textos do aplicativo
-- =====================================================
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

CREATE INDEX IF NOT EXISTS idx_strings_key ON app_strings(key);
CREATE INDEX IF NOT EXISTS idx_strings_language ON app_strings(language);
CREATE INDEX IF NOT EXISTS idx_strings_category ON app_strings(category);

-- =====================================================
-- Tabela: app_config
-- Configurações gerais do aplicativo
-- =====================================================
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  type TEXT DEFAULT 'string',
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- DADOS INICIAIS (SEED)
-- =====================================================

-- Tema padrão (atual do app)
INSERT OR REPLACE INTO app_theme (
  name, is_active, version,
  primary_color, primary_blue, secondary_color, background_color,
  text_primary_color, text_secondary_color,
  button_primary_bg, button_primary_text,
  button_secondary_bg, button_secondary_text,
  button_outline_color,
  border_radius_medium, border_width, border_color,
  category_trip_bg, category_service_bg, category_package_bg, category_reserve_bg
) VALUES (
  'Default Yellow & Black', 1, 1,
  '#FFD700', '#2196F3', '#FFA500', '#FFFFFF',
  '#000000', '#757575',
  '#FFD700', '#000000',
  '#FFFFFF', '#000000',
  '#000000',
  12, 2, '#000000',
  'rgba(255, 215, 0, 0.2)', 'rgba(33, 150, 243, 0.1)', 'rgba(255, 165, 0, 0.1)', 'rgba(76, 175, 80, 0.1)'
);

-- Strings principais (pt-BR)
INSERT OR REPLACE INTO app_strings (key, value, language, category, description) VALUES
  -- Home / Navegação
  ('app.name', '101 Service', 'pt-BR', 'general', 'Nome do aplicativo'),
  ('home.welcome', 'Bem-vindo', 'pt-BR', 'home', 'Mensagem de boas-vindas'),
  ('home.hello', 'Olá,', 'pt-BR', 'home', 'Saudação'),
  ('nav.home', 'Início', 'pt-BR', 'navigation', 'Tab início'),
  ('nav.services', 'Serviços', 'pt-BR', 'navigation', 'Tab serviços'),
  ('nav.profile', 'Perfil', 'pt-BR', 'navigation', 'Tab perfil'),
  
  -- Serviços
  ('service.new_offer', 'Nova Oferta de Serviço', 'pt-BR', 'service', 'Título modal nova oferta'),
  ('service.respond_fast', 'Responda rápido!', 'pt-BR', 'service', 'Subtítulo urgência'),
  ('service.accept', 'ACEITAR', 'pt-BR', 'service', 'Botão aceitar'),
  ('service.reject', 'RECUSAR', 'pt-BR', 'service', 'Botão recusar'),
  ('service.value', 'Valor', 'pt-BR', 'service', 'Label valor'),
  ('service.distance', 'Distância', 'pt-BR', 'service', 'Label distância'),
  ('service.description', 'Descrição', 'pt-BR', 'service', 'Label descrição'),
  ('service.address', 'Endereço', 'pt-BR', 'service', 'Label endereço'),
  ('service.no_description', 'Sem descrição', 'pt-BR', 'service', 'Fallback descrição'),
  ('service.no_address', 'Endereço não informado', 'pt-BR', 'service', 'Fallback endereço'),
  
  -- Autenticação
  ('auth.login', 'Entrar', 'pt-BR', 'auth', 'Botão login'),
  ('auth.register', 'Cadastrar', 'pt-BR', 'auth', 'Botão cadastro'),
  ('auth.email', 'E-mail', 'pt-BR', 'auth', 'Label email'),
  ('auth.password', 'Senha', 'pt-BR', 'auth', 'Label senha'),
  ('auth.forgot_password', 'Esqueci minha senha', 'pt-BR', 'auth', 'Link senha'),
  
  -- Mensagens de erro
  ('error.generic', 'Ocorreu um erro. Tente novamente.', 'pt-BR', 'error', 'Erro genérico'),
  ('error.no_connection', 'Sem conexão com a internet', 'pt-BR', 'error', 'Sem internet'),
  ('error.timeout', 'Tempo esgotado. Tente novamente.', 'pt-BR', 'error', 'Timeout'),
  
  -- Ações comuns
  ('action.save', 'Salvar', 'pt-BR', 'action', 'Botão salvar'),
  ('action.cancel', 'Cancelar', 'pt-BR', 'action', 'Botão cancelar'),
  ('action.ok', 'OK', 'pt-BR', 'action', 'Botão OK'),
  ('action.delete', 'Excluir', 'pt-BR', 'action', 'Botão excluir'),
  ('action.edit', 'Editar', 'pt-BR', 'action', 'Botão editar');

-- Configurações gerais
INSERT OR REPLACE INTO app_config (key, value, type, description) VALUES
  ('theme_version', '1', 'number', 'Versão do tema ativo'),
  ('min_app_version', '1.0.0', 'string', 'Versão mínima do app suportada'),
  ('force_update', 'false', 'boolean', 'Forçar atualização do app'),
  ('maintenance_mode', 'false', 'boolean', 'Modo manutenção'),
  ('feature_chat_enabled', 'true', 'boolean', 'Chat habilitado'),
  ('feature_video_enabled', 'true', 'boolean', 'Vídeo chamada habilitado');
