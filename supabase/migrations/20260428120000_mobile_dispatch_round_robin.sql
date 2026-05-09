-- Runtime definitivo do dispatch móvel 1x1 em 3 rodadas.
-- Fonte única de verdade: public.notificacao_de_servicos + service_dispatch_queue.

ALTER TABLE public.notificacao_de_servicos
  ADD COLUMN IF NOT EXISTS response_deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS skip_reason TEXT,
  ADD COLUMN IF NOT EXISTS push_status TEXT,
  ADD COLUMN IF NOT EXISTS push_error_code TEXT,
  ADD COLUMN IF NOT EXISTS push_error_type TEXT,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by_run TEXT,
  ADD COLUMN IF NOT EXISTS attempt_no INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3;

UPDATE public.notificacao_de_servicos
SET
  attempt_no = CASE
    WHEN status IN ('queued', 'retry_ready') THEN GREATEST(COALESCE(notification_count, 0) + 1, 1)
    WHEN status = 'notified' THEN GREATEST(COALESCE(notification_count, 0), 1)
    ELSE GREATEST(COALESCE(notification_count, 0), 1)
  END,
  max_attempts = 3
WHERE COALESCE(attempt_no, 0) < 1
   OR max_attempts IS DISTINCT FROM 3;

WITH ranked AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY service_id, provider_user_id
      ORDER BY
        COALESCE(notification_count, 0) DESC,
        COALESCE(last_notified_at, answered_at) DESC NULLS LAST,
        id DESC
    ) AS rn
  FROM public.notificacao_de_servicos
  WHERE service_id IS NOT NULL
    AND provider_user_id IS NOT NULL
)
DELETE FROM public.notificacao_de_servicos n
USING ranked r
WHERE n.ctid = r.ctid
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notificacao_servicos_service_provider_unique
  ON public.notificacao_de_servicos(service_id, provider_user_id);

CREATE INDEX IF NOT EXISTS idx_notificacao_servicos_runtime_lookup
  ON public.notificacao_de_servicos(service_id, status, attempt_no, queue_order);

DROP FUNCTION IF EXISTS public.provider_accept_service_offer(TEXT);

CREATE FUNCTION public.provider_accept_service_offer(
  p_service_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider_uid UUID := auth.uid();
  v_provider_user_id BIGINT;
  v_service_id UUID := p_service_id::UUID;
  v_now TIMESTAMPTZ := NOW();
  v_offer RECORD;
  v_service RECORD;
BEGIN
  IF v_provider_uid IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'not_authenticated'
    );
  END IF;

  SELECT u.id
    INTO v_provider_user_id
  FROM public.users u
  WHERE u.supabase_uid = v_provider_uid
  LIMIT 1;

  IF v_provider_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'provider_not_found'
    );
  END IF;

  SELECT *
    INTO v_offer
  FROM public.notificacao_de_servicos
  WHERE service_id = v_service_id
    AND provider_user_id = v_provider_user_id
    AND status = 'notified'
    AND (
      response_deadline_at IS NULL
      OR response_deadline_at > v_now
    )
  ORDER BY last_notified_at DESC NULLS LAST, id DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'offer_not_active'
    );
  END IF;

  UPDATE public.service_requests_new
  SET
    provider_id = v_provider_user_id,
    status = 'accepted',
    status_updated_at = v_now
  WHERE id = v_service_id
    AND provider_id IS NULL
    AND status IN (
      'pending',
      'searching',
      'searching_provider',
      'search_provider',
      'waiting_provider',
      'open_for_schedule'
    )
  RETURNING id, provider_id, status
  INTO v_service;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'already_accepted'
    );
  END IF;

  UPDATE public.notificacao_de_servicos
  SET
    status = CASE
      WHEN provider_user_id = v_provider_user_id THEN 'accepted'
      ELSE 'closed_by_accept'
    END,
    answered_at = v_now,
    skip_reason = CASE
      WHEN provider_user_id = v_provider_user_id THEN NULL
      ELSE 'accepted_by_other_provider'
    END
  WHERE service_id = v_service_id
    AND status IN ('queued', 'retry_ready', 'notified');

  UPDATE public.service_dispatch_queue
  SET
    status = 'done',
    next_run_at = v_now,
    last_error = NULL,
    updated_at = v_now
  WHERE service_id = v_service_id;

  INSERT INTO public.service_logs (service_id, action, details, created_at)
  VALUES (
    v_service_id,
    'PROVIDER_ACCEPTED',
    jsonb_build_object(
      'dispatch_mode', 'round_robin_by_distance',
      'provider_user_id', v_provider_user_id,
      'queue_order', v_offer.queue_order,
      'attempt_no', v_offer.attempt_no,
      'max_attempts', v_offer.max_attempts
    )::TEXT,
    v_now
  );

  RETURN jsonb_build_object(
    'ok', true,
    'service', jsonb_build_object(
      'id', v_service.id,
      'provider_id', v_service.provider_id,
      'status', v_service.status
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.provider_reject_service_offer(
  p_service_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider_uid UUID := auth.uid();
  v_provider_user_id BIGINT;
  v_service_id UUID := p_service_id::UUID;
  v_now TIMESTAMPTZ := NOW();
  v_offer RECORD;
BEGIN
  IF v_provider_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT u.id
    INTO v_provider_user_id
  FROM public.users u
  WHERE u.supabase_uid = v_provider_uid
  LIMIT 1;

  IF v_provider_user_id IS NULL THEN
    RAISE EXCEPTION 'provider_not_found' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_offer
  FROM public.notificacao_de_servicos
  WHERE service_id = v_service_id
    AND provider_user_id = v_provider_user_id
    AND status = 'notified'
    AND (
      response_deadline_at IS NULL
      OR response_deadline_at > v_now
    )
  ORDER BY last_notified_at DESC NULLS LAST, id DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE public.notificacao_de_servicos
  SET
    status = 'rejected',
    answered_at = v_now,
    skip_reason = 'provider_rejected_offer'
  WHERE id = v_offer.id;

  INSERT INTO public.service_logs (service_id, action, details, created_at)
  VALUES (
    v_service_id,
    'PROVIDER_REJECTED',
    jsonb_build_object(
      'dispatch_mode', 'round_robin_by_distance',
      'provider_user_id', v_provider_user_id,
      'queue_order', v_offer.queue_order,
      'attempt_no', v_offer.attempt_no,
      'max_attempts', v_offer.max_attempts
    )::TEXT,
    v_now
  );

  INSERT INTO public.service_dispatch_queue(service_id, status, next_run_at, attempts, last_error)
  VALUES (v_service_id, 'pending', v_now, 0, NULL)
  ON CONFLICT (service_id) DO UPDATE
    SET status = 'pending',
        next_run_at = v_now,
        last_error = NULL,
        updated_at = v_now;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.provider_accept_service_offer(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provider_accept_service_offer(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.provider_reject_service_offer(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provider_reject_service_offer(TEXT) TO authenticated;
