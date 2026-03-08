-- Adicionando colunas necessárias para o temporizador de chegada e sistema de avaliações

ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2);

ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS rating_comment TEXT;

-- Certificando que os timestamps atualizam
COMMENT ON COLUMN public.trips.arrived_at IS 'Timestamp de quando o motorista acionou Cheguei (Usado para o contador de espera)';
