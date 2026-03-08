-- Habilitar Realtime para a tabela trips e drivers (se existir)
begin;
  -- Remove a publicação se já existir para evitar conflitos (opcional, mas seguro)
  -- drop publication if exists supabase_realtime;
  
  -- Garante que o Realtime está ativo para a tabela trips
  alter publication supabase_realtime add table public.trips;
  
  -- Se houver uma tabela de localizações de motoristas dedicada, adicione também
  -- alter publication supabase_realtime add table public.driver_locations;
commit;
