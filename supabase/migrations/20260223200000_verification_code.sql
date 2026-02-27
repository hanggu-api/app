-- Adicionar coluna de código de verificação para conclusão de serviços
ALTER TABLE service_requests_new ADD COLUMN IF NOT EXISTS verification_code TEXT;

-- Gerar código aleatório de 6 dígitos no INSERT se não for fornecido (opcional, mas bom para automação)
-- Para agora, deixaremos como NULL e o app ou trigger pode preencher.
