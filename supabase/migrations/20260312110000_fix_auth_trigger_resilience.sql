-- migração para corrigir a resiliência da trigger handle_new_user
-- Essa migração remove o bloco EXCEPTION que ignorava erros, garantindo que usuários inconsistentes não sejam criados.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  default_role text := 'client';
BEGIN
  -- 1. Tentar obter a role dos metadados (enviados pelo app)
  IF (new.raw_user_meta_data->>'role') IS NOT NULL THEN
    default_role := (new.raw_user_meta_data->>'role');
  END IF;

  -- 2. Inserir na tabela pública vinculando ao UUID do Auth
  INSERT INTO public.users (supabase_uid, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    default_role
  )
  ON CONFLICT (supabase_uid) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = CASE 
             WHEN users.role = 'client' THEN EXCLUDED.role 
             ELSE users.role 
           END;

  RETURN new;
  -- Nota: O bloco 'EXCEPTION WHEN OTHERS THEN' foi removido propositalmente.
  -- Queremos que o erro suba para o Auth para evitar usuários "fantasmas" (Auth-only).
END;
$$;
