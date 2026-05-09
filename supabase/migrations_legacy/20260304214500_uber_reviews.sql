-- Migração para Avaliações Uber
-- 1. Adicionar colunas de rating na tabela users (para passageiros e motoristas terem nota unificada)
ALTER TABLE users ADD COLUMN IF NOT EXISTS rating_avg DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- 2. Tabela de Avaliações de Viagens
CREATE TABLE IF NOT EXISTS trips_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    reviewer_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(trip_id, reviewer_id)
);

-- 3. Função para atualizar a média de avaliação no perfil do usuário
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET 
        rating_avg = (SELECT AVG(rating)::DECIMAL(3,2) FROM trips_reviews WHERE reviewee_id = NEW.reviewee_id),
        rating_count = (SELECT COUNT(*) FROM trips_reviews WHERE reviewee_id = NEW.reviewee_id)
    WHERE id = NEW.reviewee_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger para atualização automática
DROP TRIGGER IF EXISTS trigger_update_user_rating ON trips_reviews;
CREATE TRIGGER trigger_update_user_rating
AFTER INSERT OR UPDATE ON trips_reviews
FOR EACH ROW EXECUTE FUNCTION update_user_rating();

-- RLS
ALTER TABLE trips_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública de avaliações" ON trips_reviews FOR SELECT USING (true);
CREATE POLICY "Usuários podem criar suas próprias avaliações" ON trips_reviews FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT supabase_uid FROM users WHERE id = reviewer_id)
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE trips_reviews;
