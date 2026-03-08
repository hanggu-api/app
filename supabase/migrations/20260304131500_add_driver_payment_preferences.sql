-- Adiciona suporte para preferências de pagamento dos motoristas
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepts_pix_direct BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepts_card_machine BOOLEAN DEFAULT FALSE;

-- Atualiza a view/publicação se necessário (Supabase Realtime geralmente cuida disso se a tabela já estiver na publicação)
