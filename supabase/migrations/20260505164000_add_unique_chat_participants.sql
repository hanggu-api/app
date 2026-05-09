-- Migration to add unique constraint to service_chat_participants
-- This is required for the upsert logic in the sync function to work.

-- 1. Remove any potential duplicates before adding the constraint
DELETE FROM public.service_chat_participants a
USING public.service_chat_participants b
WHERE a.id < b.id 
  AND a.service_id = b.service_id 
  AND a.user_id = b.user_id;

-- 2. Add the unique constraint
ALTER TABLE public.service_chat_participants 
ADD CONSTRAINT service_chat_participants_service_user_unique 
UNIQUE (service_id, user_id);
