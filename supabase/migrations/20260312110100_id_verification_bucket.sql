-- Migração para criar o bucket de verificação de identidade e políticas RLS

-- 1. Criar o bucket se não existir
INSERT INTO storage.buckets (id, name, public)
SELECT 'id-verification', 'id-verification', false
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'id-verification'
);

-- 2. Permitir que usuários autenticados façam upload de seus próprios documentos
CREATE POLICY "Drivers can upload identity documents" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'id-verification' 
  AND auth.role() = 'authenticated'
);

-- 3. Permitir que os usuários (ou o service role/edge functions) vejam os arquivos
CREATE POLICY "Users and edge functions can view identity documents" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'id-verification'
);
