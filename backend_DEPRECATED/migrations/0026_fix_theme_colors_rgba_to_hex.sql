-- Migração: Corrigir formato de cores de categorias de rgba para hex com alpha
-- Isso previne erro de parsing no aplicativo mobile (Flutter) que crasha a tela.

UPDATE app_theme SET 
    category_trip_bg = '#33FFD700'
WHERE category_trip_bg = 'rgba(255, 215, 0, 0.2)';

UPDATE app_theme SET 
    category_service_bg = '#1A2196F3'
WHERE category_service_bg = 'rgba(33, 150, 243, 0.1)';

UPDATE app_theme SET 
    category_package_bg = '#1AFFA500'
WHERE category_package_bg = 'rgba(255, 165, 0, 0.1)';

UPDATE app_theme SET 
    category_reserve_bg = '#1A4CAF50'
WHERE category_reserve_bg = 'rgba(76, 175, 80, 0.1)';
