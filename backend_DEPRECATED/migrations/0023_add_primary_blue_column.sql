-- Migration: Add primary_blue to app_theme
-- Created at: 2026-02-20

ALTER TABLE app_theme ADD COLUMN primary_blue TEXT DEFAULT '#2196F3';

-- Atualizar o tema ativo com a cor correta
UPDATE app_theme SET primary_blue = '#2196F3' WHERE is_active = 1;
