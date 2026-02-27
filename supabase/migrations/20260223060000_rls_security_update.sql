-- Habilitar RLS para tabelas vulneráveis
ALTER TABLE public.app_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacao_de_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_professions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_tasks ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura pública para configurações básicas onde todos precisam ler (Flutter app e anônimos)
CREATE POLICY "Public configs viewable by anyone" ON public.app_configs FOR SELECT USING (true);
CREATE POLICY "Public categories viewable by anyone" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "Public tasks viewable by anyone" ON public.service_tasks FOR SELECT USING (true);
CREATE POLICY "Public professions viewable by anyone" ON public.professions FOR SELECT USING (true);

-- Autenticados podem ler dados de prestadores
CREATE POLICY "Authed can read provider locations" ON public.provider_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authed can read provider professions" ON public.provider_professions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authed can read reviews" ON public.reviews FOR SELECT TO authenticated USING (true);

-- Providers podem manipular seus próprios dados de profissão e localização
CREATE POLICY "Providers can update own location" ON public.provider_locations FOR ALL TO authenticated USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = provider_id)) WITH CHECK (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = provider_id));
CREATE POLICY "Providers can update own professions" ON public.provider_professions FOR ALL TO authenticated USING (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = provider_user_id)) WITH CHECK (auth.uid() IN (SELECT supabase_uid FROM public.users WHERE id = provider_user_id));
