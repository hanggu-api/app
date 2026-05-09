-- Migration to fix chat_messages errors caused by legacy references to "public.trips".
-- trips was removed from the project as it belonged to an old transport service.
-- We update the validation trigger and RLS policies to use current service tables.

-- 1) Update the validation function to remove "trips" and include current tables.
CREATE OR REPLACE FUNCTION public.validate_chat_service_ref()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Check in public.service_requests (Mobile services)
  IF EXISTS (
    SELECT 1 FROM public.service_requests 
    WHERE id::text = NEW.service_id::text
  ) THEN
    RETURN NEW;
  END IF;

  -- 2. Check in public.agendamento_servico (Fixed services)
  IF EXISTS (
    SELECT 1 FROM public.agendamento_servico 
    WHERE id::text = NEW.service_id::text
  ) THEN
    RETURN NEW;
  END IF;
  
  RAISE EXCEPTION 'service_id % does not exist in valid service tables (service_requests, agendamento_servico)', NEW.service_id;
END;
$$;

-- 2. Update RLS Policies for chat_messages

-- Policy: Chat participants can read messages
DROP POLICY IF EXISTS "Chat participants can read messages" ON public.chat_messages;
CREATE POLICY "Chat participants can read messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    -- Case 1: Mobile service (service_requests)
    SELECT 1 FROM public.service_requests s
    WHERE s.id::text = chat_messages.service_id::text
    AND (s.client_id::text = auth.uid()::text OR s.provider_id::text = auth.uid()::text)
  )
  OR
  EXISTS (
    -- Case 2: Fixed service (agendamento_servico)
    SELECT 1 FROM public.agendamento_servico a
    WHERE a.id::text = chat_messages.service_id::text
    AND (a.cliente_uid::text = auth.uid()::text OR a.prestador_uid::text = auth.uid()::text)
  )
);

-- Policy: Chat participants can insert messages
DROP POLICY IF EXISTS "Chat participants can insert messages" ON public.chat_messages;
CREATE POLICY "Chat participants can insert messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    -- Must be a participant and must be the sender
    SELECT 1 FROM public.users u
    WHERE u.supabase_uid::text = auth.uid()::text
    AND u.id::text = chat_messages.sender_id::text
    AND (
      EXISTS (
        SELECT 1 FROM public.service_requests s
        WHERE s.id::text = chat_messages.service_id::text
        AND (s.client_id::text = auth.uid()::text OR s.provider_id::text = auth.uid()::text)
      )
      OR
      EXISTS (
        SELECT 1 FROM public.agendamento_servico a
        WHERE a.id::text = chat_messages.service_id::text
        AND (a.cliente_uid::text = auth.uid()::text OR a.prestador_uid::text = auth.uid()::text)
      )
    )
  )
);
