ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_by TEXT CHECK (cancelled_by IN ('client', 'driver')),
ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_driver_cancellation_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_driver_cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS last_driver_cancellation_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_driver_cancellation_driver_id BIGINT REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS last_driver_cancellation_driver_name TEXT;

COMMENT ON COLUMN public.trips.cancelled_by IS 'Quem encerrou a corrida definitivamente: client ou driver';
COMMENT ON COLUMN public.trips.cancellation_fee IS 'Valor de taxa associado ao cancelamento definitivo';
COMMENT ON COLUMN public.trips.last_driver_cancellation_at IS 'Ultimo cancelamento do motorista que recolocou a corrida em busca';
COMMENT ON COLUMN public.trips.last_driver_cancellation_reason IS 'Motivo do ultimo cancelamento do motorista antes da redistribuicao';
COMMENT ON COLUMN public.trips.last_driver_cancellation_fee IS 'Taxa gerada para o passageiro no ultimo cancelamento do motorista por longa espera';
