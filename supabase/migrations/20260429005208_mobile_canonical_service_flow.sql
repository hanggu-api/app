ALTER TABLE public.service_requests_new
  ADD COLUMN IF NOT EXISTS completion_code TEXT,
  ADD COLUMN IF NOT EXISTS verification_code TEXT,
  ADD COLUMN IF NOT EXISTS proof_video TEXT,
  ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_remaining_status TEXT,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.generate_mobile_completion_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN LPAD(((FLOOR(RANDOM() * 900000) + 100000)::INT)::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.mobile_payment_is_paid(p_status TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LOWER(TRIM(COALESCE(p_status, ''))) IN (
    'paid',
    'paid_manual',
    'approved',
    'completed',
    'succeeded'
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_mobile_service_runtime()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_fixed BOOLEAN;
  v_status TEXT := LOWER(TRIM(COALESCE(NEW.status, '')));
  v_old_status TEXT := CASE
    WHEN TG_OP = 'UPDATE' THEN LOWER(TRIM(COALESCE(OLD.status, '')))
    ELSE ''
  END;
  v_remaining_paid BOOLEAN := public.mobile_payment_is_paid(
    NEW.payment_remaining_status
  );
BEGIN
  v_is_fixed := LOWER(TRIM(COALESCE(NEW.location_type, ''))) = 'provider'
    OR NEW.scheduled_at IS NOT NULL;
  IF v_is_fixed THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status_updated_at := COALESCE(NEW.status_updated_at, NOW());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_updated_at := NOW();
  ELSE
    NEW.status_updated_at := COALESCE(NEW.status_updated_at, OLD.status_updated_at);
  END IF;

  IF v_status IN ('waiting_payment_remaining', 'waiting_remaining_payment')
     AND NEW.arrived_at IS NULL THEN
    NEW.arrived_at := CASE
      WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.arrived_at, NOW())
      ELSE NOW()
    END;
  END IF;

  IF v_remaining_paid
     AND v_status IN ('waiting_payment_remaining', 'waiting_remaining_payment') THEN
    NEW.status := 'in_progress';
    v_status := 'in_progress';
  END IF;

  IF v_status = 'in_progress' AND v_remaining_paid THEN
    IF BTRIM(COALESCE(NEW.completion_code, '')) = '' THEN
      NEW.completion_code := public.generate_mobile_completion_code();
    END IF;
    IF BTRIM(COALESCE(NEW.verification_code, '')) = '' THEN
      NEW.verification_code := NEW.completion_code;
    END IF;
  END IF;

  IF v_status = 'awaiting_confirmation' THEN
    NEW.finished_at := CASE
      WHEN TG_OP = 'UPDATE' THEN COALESCE(NEW.finished_at, OLD.finished_at, NOW())
      ELSE COALESCE(NEW.finished_at, NOW())
    END;
  END IF;

  IF v_status = 'completed' THEN
    NEW.completed_at := CASE
      WHEN TG_OP = 'UPDATE' THEN COALESCE(NEW.completed_at, OLD.completed_at, NOW())
      ELSE COALESCE(NEW.completed_at, NOW())
    END;
    NEW.finished_at := CASE
      WHEN TG_OP = 'UPDATE' THEN COALESCE(NEW.finished_at, OLD.finished_at, NEW.completed_at)
      ELSE COALESCE(NEW.finished_at, NEW.completed_at)
    END;
  END IF;

  IF TG_OP = 'UPDATE'
     AND v_old_status = 'in_progress'
     AND v_status = 'in_progress'
     AND OLD.started_at IS NULL
     AND NEW.started_at IS NULL THEN
    NEW.started_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mobile_service_runtime ON public.service_requests_new;

CREATE TRIGGER trg_mobile_service_runtime
BEFORE INSERT OR UPDATE ON public.service_requests_new
FOR EACH ROW
EXECUTE FUNCTION public.enforce_mobile_service_runtime();

DROP FUNCTION IF EXISTS public.ensure_mobile_completion_code(TEXT);

CREATE FUNCTION public.ensure_mobile_completion_code(
  p_service_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_uid UUID := auth.uid();
  v_user_id BIGINT;
  v_service_id UUID := p_service_id::UUID;
  v_service RECORD;
  v_code TEXT;
BEGIN
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  SELECT id
    INTO v_user_id
  FROM public.users
  WHERE supabase_uid = v_auth_uid
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'user_not_found');
  END IF;

  SELECT *
    INTO v_service
  FROM public.service_requests_new
  WHERE id = v_service_id
    AND (
      client_id = v_user_id
      OR provider_id = v_user_id
    )
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'service_not_found');
  END IF;

  IF LOWER(TRIM(COALESCE(v_service.location_type, ''))) = 'provider'
     OR v_service.scheduled_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'fixed_service_not_supported');
  END IF;

  IF NOT public.mobile_payment_is_paid(v_service.payment_remaining_status)
     AND LOWER(TRIM(COALESCE(v_service.status, ''))) NOT IN (
       'in_progress',
       'awaiting_confirmation',
       'completed'
     ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'service_not_ready');
  END IF;

  v_code := BTRIM(COALESCE(v_service.completion_code, v_service.verification_code, ''));
  IF v_code = '' THEN
    UPDATE public.service_requests_new
    SET
      status = CASE
        WHEN status IN ('waiting_payment_remaining', 'waiting_remaining_payment')
          AND public.mobile_payment_is_paid(payment_remaining_status)
          THEN 'in_progress'
        ELSE status
      END,
      completion_code = public.generate_mobile_completion_code(),
      verification_code = NULL
    WHERE id = v_service_id
    RETURNING completion_code
    INTO v_code;

    UPDATE public.service_requests_new
    SET verification_code = completion_code
    WHERE id = v_service_id
      AND COALESCE(verification_code, '') <> COALESCE(completion_code, '');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'completion_code', v_code
  );
END;
$$;

DROP FUNCTION IF EXISTS public.provider_mark_mobile_service_arrived(TEXT);

CREATE FUNCTION public.provider_mark_mobile_service_arrived(
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
  v_service RECORD;
BEGIN
  IF v_provider_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  SELECT id
    INTO v_provider_user_id
  FROM public.users
  WHERE supabase_uid = v_provider_uid
  LIMIT 1;

  IF v_provider_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'provider_not_found');
  END IF;

  SELECT *
    INTO v_service
  FROM public.service_requests_new
  WHERE id = v_service_id
    AND provider_id = v_provider_user_id
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'service_not_found');
  END IF;

  IF LOWER(TRIM(COALESCE(v_service.location_type, ''))) = 'provider'
     OR v_service.scheduled_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'fixed_service_not_supported');
  END IF;

  IF NOT (
    LOWER(TRIM(COALESCE(v_service.payment_status, ''))) IN (
      'paid',
      'partially_paid',
      'paid_manual'
    )
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'deposit_not_paid');
  END IF;

  IF LOWER(TRIM(COALESCE(v_service.status, ''))) IN (
    'waiting_payment_remaining',
    'waiting_remaining_payment',
    'in_progress',
    'completed'
  ) AND v_service.arrived_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'service', jsonb_build_object(
        'id', v_service.id,
        'status', v_service.status,
        'arrived_at', v_service.arrived_at
      )
    );
  END IF;

  IF LOWER(TRIM(COALESCE(v_service.status, ''))) NOT IN (
    'accepted',
    'provider_near',
    'scheduled'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_status');
  END IF;

  UPDATE public.service_requests_new
  SET
    status = 'waiting_payment_remaining',
    arrived_at = COALESCE(arrived_at, v_now),
    payment_remaining_status = COALESCE(NULLIF(payment_remaining_status, ''), 'pending'),
    status_updated_at = v_now
  WHERE id = v_service_id
  RETURNING id, status, arrived_at, payment_remaining_status
  INTO v_service;

  INSERT INTO public.service_logs(service_id, action, details, created_at)
  VALUES (
    v_service_id,
    'PROVIDER_ARRIVED',
    jsonb_build_object(
      'provider_user_id', v_provider_user_id,
      'status', v_service.status,
      'payment_remaining_status', v_service.payment_remaining_status
    )::TEXT,
    v_now
  );

  RETURN jsonb_build_object(
    'ok', true,
    'service', jsonb_build_object(
      'id', v_service.id,
      'status', v_service.status,
      'arrived_at', v_service.arrived_at,
      'payment_remaining_status', v_service.payment_remaining_status
    )
  );
END;
$$;

DROP FUNCTION IF EXISTS public.provider_start_mobile_service(TEXT);

CREATE FUNCTION public.provider_start_mobile_service(
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
  v_service RECORD;
BEGIN
  IF v_provider_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  SELECT id
    INTO v_provider_user_id
  FROM public.users
  WHERE supabase_uid = v_provider_uid
  LIMIT 1;

  IF v_provider_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'provider_not_found');
  END IF;

  SELECT *
    INTO v_service
  FROM public.service_requests_new
  WHERE id = v_service_id
    AND provider_id = v_provider_user_id
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'service_not_found');
  END IF;

  IF LOWER(TRIM(COALESCE(v_service.location_type, ''))) = 'provider'
     OR v_service.scheduled_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'fixed_service_not_supported');
  END IF;

  IF NOT public.mobile_payment_is_paid(v_service.payment_remaining_status) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'payment_remaining_not_paid');
  END IF;

  IF LOWER(TRIM(COALESCE(v_service.status, ''))) NOT IN (
    'in_progress',
    'waiting_payment_remaining',
    'waiting_remaining_payment'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_status');
  END IF;

  UPDATE public.service_requests_new
  SET
    status = 'in_progress',
    started_at = COALESCE(started_at, v_now),
    status_updated_at = v_now
  WHERE id = v_service_id
  RETURNING id, status, started_at, completion_code, verification_code
  INTO v_service;

  INSERT INTO public.service_logs(service_id, action, details, created_at)
  VALUES (
    v_service_id,
    'PROVIDER_STARTED_SERVICE',
    jsonb_build_object(
      'provider_user_id', v_provider_user_id,
      'status', v_service.status,
      'started_at', v_service.started_at
    )::TEXT,
    v_now
  );

  RETURN jsonb_build_object(
    'ok', true,
    'service', jsonb_build_object(
      'id', v_service.id,
      'status', v_service.status,
      'started_at', v_service.started_at,
      'completion_code', v_service.completion_code,
      'verification_code', v_service.verification_code
    )
  );
END;
$$;

DROP FUNCTION IF EXISTS public.provider_complete_mobile_service(TEXT, TEXT, TEXT);

CREATE FUNCTION public.provider_complete_mobile_service(
  p_service_id TEXT,
  p_code TEXT DEFAULT NULL,
  p_proof_video TEXT DEFAULT NULL
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
  v_service RECORD;
  v_code TEXT := BTRIM(COALESCE(p_code, ''));
  v_stored_code TEXT;
  v_proof_video TEXT := BTRIM(COALESCE(p_proof_video, ''));
BEGIN
  IF v_provider_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  SELECT id
    INTO v_provider_user_id
  FROM public.users
  WHERE supabase_uid = v_provider_uid
  LIMIT 1;

  IF v_provider_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'provider_not_found');
  END IF;

  SELECT *
    INTO v_service
  FROM public.service_requests_new
  WHERE id = v_service_id
    AND provider_id = v_provider_user_id
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'service_not_found');
  END IF;

  IF LOWER(TRIM(COALESCE(v_service.location_type, ''))) = 'provider'
     OR v_service.scheduled_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'fixed_service_not_supported');
  END IF;

  IF v_proof_video = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'missing_proof_video');
  END IF;

  IF NOT public.mobile_payment_is_paid(v_service.payment_remaining_status) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'payment_remaining_not_paid');
  END IF;

  IF LOWER(TRIM(COALESCE(v_service.status, ''))) NOT IN (
    'in_progress',
    'awaiting_confirmation',
    'completed'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_status');
  END IF;

  IF LOWER(TRIM(COALESCE(v_service.status, ''))) = 'completed' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'requires_client_confirmation', false,
      'service', jsonb_build_object(
        'id', v_service.id,
        'status', v_service.status,
        'completed_at', v_service.completed_at,
        'proof_video', v_service.proof_video
      )
    );
  END IF;

  v_stored_code := BTRIM(
    COALESCE(v_service.completion_code, v_service.verification_code, '')
  );
  IF v_stored_code = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'completion_code_not_available');
  END IF;

  IF v_code = '' THEN
    UPDATE public.service_requests_new
    SET
      status = 'awaiting_confirmation',
      finished_at = COALESCE(finished_at, v_now),
      proof_video = v_proof_video,
      status_updated_at = v_now
    WHERE id = v_service_id
    RETURNING id, status, finished_at, proof_video
    INTO v_service;

    INSERT INTO public.service_logs(service_id, action, details, created_at)
    VALUES (
      v_service_id,
      'PROVIDER_COMPLETED_WITHOUT_CODE',
      jsonb_build_object(
        'provider_user_id', v_provider_user_id,
        'status', v_service.status,
        'proof_video', v_service.proof_video
      )::TEXT,
      v_now
    );

    RETURN jsonb_build_object(
      'ok', true,
      'requires_client_confirmation', true,
      'service', jsonb_build_object(
        'id', v_service.id,
        'status', v_service.status,
        'finished_at', v_service.finished_at,
        'proof_video', v_service.proof_video
      )
    );
  END IF;

  IF v_code <> v_stored_code THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_completion_code');
  END IF;

  UPDATE public.service_requests_new
  SET
    status = 'completed',
    finished_at = COALESCE(finished_at, v_now),
    completed_at = COALESCE(completed_at, v_now),
    proof_video = v_proof_video,
    status_updated_at = v_now
  WHERE id = v_service_id
  RETURNING id, status, completed_at, proof_video
  INTO v_service;

  INSERT INTO public.service_logs(service_id, action, details, created_at)
  VALUES (
    v_service_id,
    'PROVIDER_COMPLETED_WITH_CODE',
    jsonb_build_object(
      'provider_user_id', v_provider_user_id,
      'status', v_service.status,
      'completed_at', v_service.completed_at
    )::TEXT,
    v_now
  );

  RETURN jsonb_build_object(
    'ok', true,
    'requires_client_confirmation', false,
    'service', jsonb_build_object(
      'id', v_service.id,
      'status', v_service.status,
      'completed_at', v_service.completed_at,
      'proof_video', v_service.proof_video
    )
  );
END;
$$;

DROP FUNCTION IF EXISTS public.client_confirm_mobile_service_completion(TEXT);

CREATE FUNCTION public.client_confirm_mobile_service_completion(
  p_service_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_uid UUID := auth.uid();
  v_client_user_id BIGINT;
  v_service_id UUID := p_service_id::UUID;
  v_now TIMESTAMPTZ := NOW();
  v_service RECORD;
BEGIN
  IF v_client_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  SELECT id
    INTO v_client_user_id
  FROM public.users
  WHERE supabase_uid = v_client_uid
  LIMIT 1;

  IF v_client_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'client_not_found');
  END IF;

  SELECT *
    INTO v_service
  FROM public.service_requests_new
  WHERE id = v_service_id
    AND client_id = v_client_user_id
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'service_not_found');
  END IF;

  IF LOWER(TRIM(COALESCE(v_service.location_type, ''))) = 'provider'
     OR v_service.scheduled_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'fixed_service_not_supported');
  END IF;

  IF LOWER(TRIM(COALESCE(v_service.status, ''))) = 'completed' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'service', jsonb_build_object(
        'id', v_service.id,
        'status', v_service.status,
        'completed_at', v_service.completed_at
      )
    );
  END IF;

  IF LOWER(TRIM(COALESCE(v_service.status, ''))) NOT IN (
    'awaiting_confirmation',
    'waiting_client_confirmation',
    'completion_requested'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_status');
  END IF;

  UPDATE public.service_requests_new
  SET
    status = 'completed',
    completed_at = COALESCE(completed_at, v_now),
    finished_at = COALESCE(finished_at, v_now),
    status_updated_at = v_now
  WHERE id = v_service_id
  RETURNING id, status, completed_at
  INTO v_service;

  INSERT INTO public.service_logs(service_id, action, details, created_at)
  VALUES (
    v_service_id,
    'CLIENT_CONFIRMED_SERVICE_COMPLETION',
    jsonb_build_object(
      'client_user_id', v_client_user_id,
      'status', v_service.status,
      'completed_at', v_service.completed_at
    )::TEXT,
    v_now
  );

  RETURN jsonb_build_object(
    'ok', true,
    'service', jsonb_build_object(
      'id', v_service.id,
      'status', v_service.status,
      'completed_at', v_service.completed_at
    )
  );
END;
$$;
