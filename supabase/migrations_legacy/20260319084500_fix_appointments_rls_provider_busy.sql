-- Corrige RLS de appointments para permitir:
-- 1) cliente criar agendamento para um prestador
-- 2) prestador bloquear/liberar horários da agenda
-- 3) participantes ler/atualizar/remover seus próprios agendamentos

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas antigas conflitantes (se existirem)
DROP POLICY IF EXISTS "Users can see their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Providers can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Providers can select own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Providers can insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Providers can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Providers can delete own appointments" ON public.appointments;

-- Leitura por participante (cliente ou prestador)
CREATE POLICY "appointments_select_participants"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  client_id = public.current_user_id()
  OR provider_id = public.current_user_id()
);

-- INSERT do cliente (agendamento normal)
CREATE POLICY "appointments_insert_client"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (
  client_id = public.current_user_id()
);

-- INSERT do prestador (bloqueio manual de slot)
-- Aceita client_id nulo ou igual ao próprio prestador.
CREATE POLICY "appointments_insert_provider_block"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (
  provider_id = public.current_user_id()
  AND (
    client_id IS NULL
    OR client_id = public.current_user_id()
  )
);

-- UPDATE por participante
CREATE POLICY "appointments_update_participants"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  client_id = public.current_user_id()
  OR provider_id = public.current_user_id()
)
WITH CHECK (
  client_id = public.current_user_id()
  OR provider_id = public.current_user_id()
);

-- DELETE por participante
CREATE POLICY "appointments_delete_participants"
ON public.appointments
FOR DELETE
TO authenticated
USING (
  client_id = public.current_user_id()
  OR provider_id = public.current_user_id()
);
