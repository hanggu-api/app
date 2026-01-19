-- RPC de Confirmação de Conclusão do Serviço
-- Verifica o código do cliente e debita/credita na carteira do prestador de forma atômica
CREATE OR REPLACE FUNCTION rpc_confirm_completion(
  p_service_id TEXT, 
  p_code TEXT, 
  p_proof_video TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
  v_stored_code TEXT;
  v_price_estimated DECIMAL;
  v_provider_id BIGINT;
  v_provider_amount DECIMAL;
BEGIN
  SELECT status, completion_code, price_estimated, provider_id
  INTO v_status, v_stored_code, v_price_estimated, v_provider_id
  FROM service_requests_new
  WHERE id = p_service_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service not found';
  END IF;

  IF v_status != 'awaiting_confirmation' THEN
    RAISE EXCEPTION 'Service is not awaiting confirmation';
  END IF;

  IF v_stored_code != p_code THEN
    RETURN FALSE; -- Código Inválido
  END IF;

  v_provider_amount := COALESCE(v_price_estimated, 0) * 0.85;

  UPDATE service_requests_new
  SET 
    status = 'completed',
    completed_at = NOW(),
    status_updated_at = NOW(),
    proof_video = p_proof_video,
    provider_amount = v_provider_amount
  WHERE id = p_service_id;

  IF v_provider_id IS NOT NULL THEN
    UPDATE providers
    SET wallet_balance = COALESCE(wallet_balance, 0) + v_provider_amount
    WHERE user_id = v_provider_id;

    INSERT INTO wallet_transactions(id, user_id, service_id, amount, type, description, created_at)
    VALUES (
      gen_random_uuid()::text,
      v_provider_id,
      p_service_id,
      v_provider_amount,
      'credit',
      'Crédito pelo serviço ' || p_service_id,
      NOW()
    );
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC de Solicitação de Conclusão (Gera Código)
CREATE OR REPLACE FUNCTION rpc_request_completion(
  p_service_id TEXT
) RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
BEGIN
  -- Gera código aleatório de 6 dígitos
  v_code := floor(random() * 899999 + 100000)::text;

  UPDATE service_requests_new
  SET 
    completion_code = v_code,
    status = 'awaiting_confirmation',
    status_updated_at = NOW()
  WHERE id = p_service_id;

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
