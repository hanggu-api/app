-- Permitir que RLS funcione
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests_new ENABLE ROW LEVEL SECURITY;

-- Exemplo RLS: Usuário só pode ler e mudar o próprio perfil
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = supabase_uid);

CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = supabase_uid);

-- Trigger: Quando um usuário é criado no Supabase Auth, insere na tabela pública
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (supabase_uid, email, full_name, created_at)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    NOW()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gatilho conectado ao Auth
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
