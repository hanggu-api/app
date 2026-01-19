-- Migração: Adicionar cores de categorias para o redesign da Home
ALTER TABLE app_theme ADD COLUMN category_trip_bg TEXT DEFAULT 'rgba(255, 215, 0, 0.2)';
ALTER TABLE app_theme ADD COLUMN category_service_bg TEXT DEFAULT 'rgba(33, 150, 243, 0.1)';
ALTER TABLE app_theme ADD COLUMN category_package_bg TEXT DEFAULT 'rgba(255, 165, 0, 0.1)';
ALTER TABLE app_theme ADD COLUMN category_reserve_bg TEXT DEFAULT 'rgba(76, 175, 80, 0.1)';

-- Atualizar o tema ativo com os valores padrão do redesign
UPDATE app_theme SET 
    category_trip_bg = 'rgba(255, 215, 0, 0.2)',
    category_service_bg = 'rgba(33, 150, 243, 0.1)',
    category_package_bg = 'rgba(255, 165, 0, 0.1)',
    category_reserve_bg = 'rgba(76, 175, 80, 0.1)',
    updated_at = CURRENT_TIMESTAMP
WHERE is_active = 1;
