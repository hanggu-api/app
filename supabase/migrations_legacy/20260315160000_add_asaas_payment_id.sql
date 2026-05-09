-- Adiciona coluna asaas_payment_id se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='asaas_payment_id') THEN
        ALTER TABLE payments ADD COLUMN asaas_payment_id TEXT;
    END IF;
END $$;
