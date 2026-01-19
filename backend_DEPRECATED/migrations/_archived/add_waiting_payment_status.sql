-- ========================================
-- Migração: Adicionar 'waiting_payment' ao ENUM de status
-- ========================================
-- Banco de dados: app

USE app;

-- Verificar estrutura atual
SELECT '🔍 Verificando estrutura atual da tabela appointments...' as status;
SHOW COLUMNS FROM appointments LIKE 'status';

SELECT '' as '';
SELECT '🔧 Atualizando coluna status para incluir waiting_payment...' as status;

-- Atualizar o ENUM para incluir 'waiting_payment'
ALTER TABLE appointments 
MODIFY COLUMN status ENUM('scheduled', 'completed', 'cancelled', 'busy', 'waiting_payment') 
NOT NULL DEFAULT 'scheduled';

SELECT '✅ Coluna status atualizada com sucesso!' as status;
SELECT '' as '';

-- Verificar estrutura atualizada
SELECT '🔍 Verificando estrutura atualizada...' as status;
SHOW COLUMNS FROM appointments LIKE 'status';

SELECT '' as '';
SELECT '🎉 Migração concluída com sucesso!' as status;
SELECT '   A tabela appointments agora suporta o status "waiting_payment"' as info;
