-- Migration: Proteger acesso anônimo às tabelas users e providers
-- Data: 2026-04-05
-- Motivo: Dados sensíveis (CPF, email, telefone, PIX, endereço) estavam
-- acessíveis publicamente via chave anon (sem login).
-- Impacto: ZERO mudanca no codigo do app. A migração só bloqueia
-- usuarios NAO logados (anon) de acessarem dados pessoais.

-- ============================================================
-- 1. TABELA public.users
-- ============================================================

-- Garante RLS habilitado
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Limpa politicas antigas conflitantes
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Public can view provider profiles" ON public.users;
DROP POLICY IF EXISTS "Trip or service participants read related profiles" ON public.users;
DROP POLICY IF EXISTS "Users read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Campos publicos visiveis a todos autenticados" ON public.users;
DROP POLICY IF EXISTS "Dono acessa todos os proprios dados" ON public.users;

-- 1a) AUTENTICADOS podem ler (SELECT)
--     → Permite listagem de prestadores, perfis, busca, etc.
--     → Nao funciona para anonimos (sem politica para anon)
CREATE POLICY "Autenticados leem usuarios"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- 1b) Usuario pode inserir APENAS o proprio perfil
CREATE POLICY "Usuario insere proprio perfil"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (supabase_uid = auth.uid());

-- 1c) Usuario pode editar APENAS o proprio perfil
CREATE POLICY "Usuario edita proprio perfil"
ON public.users
FOR UPDATE
TO authenticated
USING (supabase_uid = auth.uid())
WITH CHECK (supabase_uid = auth.uid());

-- 1d) Usuario pode deletar APENAS o proprio perfil
CREATE POLICY "Usuario deleta proprio perfil"
ON public.users
FOR DELETE
TO authenticated
USING (supabase_uid = auth.uid());

-- ============================================================
-- 2. TABELA public.providers
-- ============================================================

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view providers" ON public.providers;
DROP POLICY IF EXISTS "Providers can manage own data" ON public.providers;
DROP POLICY IF EXISTS "Users can view own provider data" ON public.providers;
DROP POLICY IF EXISTS "Providers basicos visiveis a todos autenticados" ON public.providers;
DROP POLICY IF EXISTS "Provider gerencia proprios dados" ON public.providers;

-- 2a) AUTENTICADOS podem ler providers (listagem de prestadores)
CREATE POLICY "Autenticados leem providers"
ON public.providers
FOR SELECT
TO authenticated
USING (true);

-- 2b) Usuario pode editar APENAS seu proprio provider
CREATE POLICY "Provider edita proprios dados"
ON public.providers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = providers.user_id
    AND u.supabase_uid = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = providers.user_id
    AND u.supabase_uid = auth.uid()
  )
);

-- ============================================================
-- 3. Verificacao: listar politicas ativas
-- ============================================================
-- Para verificar after aplicacao, rode:
-- SELECT tablename, policyname, cmd, roles, qual
-- FROM pg_policies
-- WHERE tablename IN ('users', 'providers')
-- ORDER BY tablename, policyname;
--
-- Resultado esperado:
-- users  | "Autenticados leem usuarios"       | SELECT | {authenticated} | true
-- users  | "Usuario insere proprio perfil"     | INSERT | {authenticated} | supabase_uid = auth.uid()
-- users  | "Usuario edita proprio perfil"      | UPDATE | {authenticated} | supabase_uid = auth.uid()
-- users  | "Usuario deleta proprio perfil"     | DELETE | {authenticated} | supabase_uid = auth.uid()
-- providers | "Autenticados leem providers"   | SELECT | {authenticated} | true
-- providers | "Provider edita proprios dados" | ALL    | {authenticated} | EXISTS (subquery)
