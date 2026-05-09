-- Ensure deleting a user cascades to dependent records

-- service_requests: client_id / provider_id
ALTER TABLE public.service_requests
  DROP CONSTRAINT IF EXISTS service_requests_client_id_fkey;
ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.service_requests
  DROP CONSTRAINT IF EXISTS service_requests_provider_id_fkey;
ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- chat_messages: sender_id
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- transactions: user_id
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Mantém a função antiga (se existir) compatível com o schema atual.
-- (Criar/replace é seguro e evita erros de parsing no SQL Editor.)
CREATE OR REPLACE FUNCTION public.handle_user_cleanup()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
BEGIN
  DELETE FROM public.chat_messages
  WHERE sender_id = OLD.id;

  RETURN OLD;
END;
$func$;
