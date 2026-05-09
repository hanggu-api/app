import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

function clean(v: unknown): string {
  return String(v ?? "").trim();
}

function toIntId(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  const s = clean(v);
  if (!/^\d+$/.test(s)) return null;
  return Number(s);
}

function round2(v: number): number {
  return Number((Number(v) || 0).toFixed(2));
}

function amount(v: unknown): number {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return 0;
  return round2(n);
}

function lower(v: unknown): string {
  return clean(v).toLowerCase();
}

function resolveStageFromPaymentRow(row: any): string {
  return lower(row?.metadata?.payment_stage || row?.mp_response?.metadata?.payment_stage);
}

function resolveStageFromMpProcessResponse(data: any): string {
  return lower(
    data?.payment_stage_effective ??
      data?.payment_stage ??
      data?.metadata?.payment_stage,
  );
}

interface CanonicalResource {
  id: string;
  source:
    | "trips"
    | "service_requests"
    | "agendamento_servico"
    | "fixed_booking_pix_intents";
  is_service: boolean;
  client_id_int: number | null;
  client_uid: string | null;
  provider_id_int: number | null;
  provider_uid: string | null;
  amount_total: number;
  amount_deposit: number;
  status?: string | null;
  payment_remaining_status?: string | null;
}

const TRIP_RUNTIME_ENABLED = false;

function edgeError(params: {
  error: string;
  step: string;
  reason_code: string;
  trace_id: string;
  status_code?: number;
  details?: Record<string, unknown> | unknown;
}) {
  const status = params.status_code ?? 400;
  return json(
    {
      success: false,
      error: params.error,
      step: params.step,
      reason_code: params.reason_code,
      trace_id: params.trace_id,
      status_code: status,
      ...(params.details != null ? { details: params.details } : {}),
    },
    status,
  );
}

function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function loadUserUidMapByIds(
  admin: any,
  ids: number[],
): Promise<Map<number, string>> {
  const unique = [...new Set(ids.filter((id) => Number.isFinite(id)))];
  if (unique.length === 0) return new Map();

  const { data } = await admin
    .from("users")
    .select("id, supabase_uid")
    .in("id", unique);

  const map = new Map<number, string>();
  for (const row of data ?? []) {
    const id = toIntId(row?.id);
    const uid = clean(row?.supabase_uid);
    if (id != null && uid) map.set(id, uid);
  }
  return map;
}

async function loadUserIdByUid(
  admin: any,
  uid: string,
): Promise<number | null> {
  if (!uid) return null;
  const { data } = await admin
    .from("users")
    .select("id")
    .eq("supabase_uid", uid)
    .maybeSingle();
  return toIntId(data?.id);
}

async function loadCanonicalResource(
  admin: any,
  entityId: string,
): Promise<CanonicalResource | null> {
  if (TRIP_RUNTIME_ENABLED) {
    const { data: trip } = await admin
      .from("trips")
      .select("id, client_id, driver_id, fare_estimated, fare_final")
      .eq("id", entityId)
      .maybeSingle();

    if (trip) {
      const clientId = toIntId(trip.client_id);
      const providerId = toIntId(trip.driver_id);
      const uidMap = await loadUserUidMapByIds(
        admin,
        [clientId ?? -1, providerId ?? -1],
      );
      const total = amount(trip.fare_final ?? trip.fare_estimated);
      return {
        id: clean(trip.id) || entityId,
        source: "trips",
        is_service: false,
        client_id_int: clientId,
        client_uid: clientId != null ? (uidMap.get(clientId) ?? null) : null,
        provider_id_int: providerId,
        provider_uid: providerId != null
          ? (uidMap.get(providerId) ?? null)
          : null,
        amount_total: total,
        amount_deposit: total,
      };
    }
  }

  const { data: srv } = await admin
    .from("service_requests")
    .select("id, client_id, provider_id, price_estimated, price_upfront, status, payment_remaining_status")
    .eq("id", entityId)
    .maybeSingle();

  if (srv) {
    const clientId = toIntId(srv.client_id);
    const providerId = toIntId(srv.provider_id);
    const uidMap = await loadUserUidMapByIds(
      admin,
      [clientId ?? -1, providerId ?? -1],
    );
    const total = amount(srv.price_estimated ?? srv.price_upfront);
    const depositBase = amount(srv.price_upfront);
    const deposit = depositBase > 0 ? depositBase : round2(total * 0.3);

    return {
      id: clean(srv.id) || entityId,
      source: "service_requests",
      is_service: true,
      client_id_int: clientId,
      client_uid: clientId != null ? (uidMap.get(clientId) ?? null) : null,
      provider_id_int: providerId,
      provider_uid: providerId != null ? (uidMap.get(providerId) ?? null) : null,
      amount_total: total,
      amount_deposit: deposit,
      status: clean(srv.status) || null,
      payment_remaining_status: clean(srv.payment_remaining_status) || null,
    };
  }

  const { data: booking } = await admin
    .from("agendamento_servico")
    .select("id, cliente_uid, prestador_uid, preco_total, valor_entrada")
    .eq("id", entityId)
    .maybeSingle();

  if (booking) {
    const clientUid = clean(booking.cliente_uid) || null;
    const providerUid = clean(booking.prestador_uid) || null;
    const clientId = await loadUserIdByUid(admin, clientUid ?? "");
    const providerId = await loadUserIdByUid(admin, providerUid ?? "");

    const total = amount(booking.preco_total);
    const entryBase = amount(booking.valor_entrada);
    const deposit = entryBase > 0 ? entryBase : round2(total * 0.3);

    return {
      id: clean(booking.id) || entityId,
      source: "agendamento_servico",
      is_service: true,
      client_id_int: clientId,
      client_uid: clientUid,
      provider_id_int: providerId,
      provider_uid: providerUid,
      amount_total: total,
      amount_deposit: deposit,
    };
  }

  const { data: pendingIntent } = await admin
    .from("fixed_booking_pix_intents")
    .select(
      "id, cliente_uid, prestador_uid, cliente_user_id, prestador_user_id, price_estimated, price_upfront",
    )
    .eq("id", entityId)
    .maybeSingle();

  if (!pendingIntent) return null;

  const clientUid = clean(pendingIntent.cliente_uid) || null;
  const providerUid = clean(pendingIntent.prestador_uid) || null;
  const clientId = toIntId(pendingIntent.cliente_user_id) ??
    await loadUserIdByUid(admin, clientUid ?? "");
  const providerId = toIntId(pendingIntent.prestador_user_id) ??
    await loadUserIdByUid(admin, providerUid ?? "");
  const total = amount(pendingIntent.price_estimated);
  const depositBase = amount(pendingIntent.price_upfront);
  const deposit = depositBase > 0 ? depositBase : round2(total * 0.1);

  return {
    id: clean(pendingIntent.id) || entityId,
    source: "fixed_booking_pix_intents",
    is_service: true,
    client_id_int: clientId,
    client_uid: clientUid,
    provider_id_int: providerId,
    provider_uid: providerUid,
    amount_total: total,
    amount_deposit: deposit,
  };
}

function expectedAmountForStage(
  resource: CanonicalResource,
  stage: string,
): number {
  if (!resource.is_service) return round2(resource.amount_total);
  if (stage === "remaining") {
    return round2(Math.max(resource.amount_total - resource.amount_deposit, 0));
  }
  if (resource.amount_deposit > 0) return round2(resource.amount_deposit);
  return round2(resource.amount_total);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const traceId = req.headers.get("x-trace-id") || crypto.randomUUID();

  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return auth.error ?? edgeError({
        error: "Não autenticado",
        step: "authenticate_user",
        reason_code: "AUTH_REQUIRED",
        trace_id: traceId,
        status_code: 401,
      });
    }
    const { admin, appUser } = auth;

    const body = await req.json().catch(() => ({}));
    const tripId = clean(body?.trip_id);
    const serviceId = clean(body?.service_id);
    const pendingFixedBookingId = clean(body?.pending_fixed_booking_id);
    const requestedType = lower(body?.entity_type);
    const requestedPaymentStage = lower(body?.payment_stage);
    let paymentStage = requestedPaymentStage || "deposit";
    const entityId = pendingFixedBookingId || serviceId || tripId;

    if (!TRIP_RUNTIME_ENABLED && tripId) {
      return edgeError({
        error: "Fluxo de corrida desativado neste ambiente",
        step: "validate_input",
        reason_code: "TRIP_RUNTIME_DISABLED",
        trace_id: traceId,
        status_code: 410,
        details: { trip_id: tripId },
      });
    }

    if (!entityId) {
      return edgeError({
        error: "trip_id, service_id ou pending_fixed_booking_id é obrigatório",
        step: "validate_input",
        reason_code: "ID_REQUIRED",
        trace_id: traceId,
        status_code: 400,
      });
    }

    const resource = await loadCanonicalResource(admin, entityId);
    if (!resource) {
      return edgeError({
        error: "Recurso não encontrado",
        step: "load_resource",
        reason_code: "RESOURCE_NOT_FOUND",
        trace_id: traceId,
        status_code: 404,
        details: {
          entity_id: entityId,
          requested_type: requestedType || null,
        },
      });
    }

    const resourceStatus = lower(resource.status);
    const resourceRemainingStatus = lower(resource.payment_remaining_status);
    const serviceDemandsRemaining =
      resourceStatus === "waiting_remaining_payment" ||
      resourceStatus === "waiting_payment_remaining";
    const shouldInferRemaining =
      resource.is_service &&
      !requestedPaymentStage &&
      (serviceDemandsRemaining ||
        resourceRemainingStatus === "pending" ||
        resourceRemainingStatus === "waiting");
    const shouldForceRemaining =
      resource.is_service &&
      serviceDemandsRemaining;
    if (shouldForceRemaining) {
      paymentStage = "remaining";
    }
    if (shouldInferRemaining) {
      paymentStage = "remaining";
    }
    if (
      resource.is_service &&
      requestedPaymentStage &&
      requestedPaymentStage !== paymentStage
    ) {
      console.warn(
        "[mp-get-pix-data][PIX_STAGE_MISMATCH_BLOCKED]",
        JSON.stringify({
          trace_id: traceId,
          service_id: resource.id,
          payment_stage_requested: requestedPaymentStage,
          payment_stage_effective: paymentStage,
          resource_status: resource.status ?? null,
          payment_remaining_status: resource.payment_remaining_status ?? null,
          reason: "requested_stage_differs_from_effective",
        }),
      );
      return edgeError({
        error: "PIX incompatível com etapa atual",
        step: "resolve_payment_stage",
        reason_code: "PIX_STAGE_MISMATCH",
        trace_id: traceId,
        status_code: 409,
        details: {
          payment_stage_requested: requestedPaymentStage,
          payment_stage_effective: paymentStage,
          resource_status: resource.status ?? null,
          payment_remaining_status: resource.payment_remaining_status ?? null,
        },
      });
    }
    console.log(
      "[mp-get-pix-data][PIX_STAGE_RESOLVED]",
      JSON.stringify({
        trace_id: traceId,
        service_id: resource.is_service ? resource.id : null,
        payment_stage_requested: requestedPaymentStage || null,
        payment_stage_effective: paymentStage,
        source: resource.source,
        resource_status: resource.status ?? null,
        payment_remaining_status: resource.payment_remaining_status ?? null,
      }),
    );

    const effectiveType = requestedType ||
      (resource.is_service ? "service" : "trip");
    const requesterDbId = toIntId(appUser?.id);
    const requesterUid = lower(appUser?.supabase_uid ?? appUser?.supabaseUid);
    const requesterRole = lower(appUser?.role);
    const isServiceRoleAdmin = clean(appUser?.id) === "service_role" ||
      requesterRole === "admin" || requesterRole === "service_role";
    const isClientLikeRole =
      requesterRole === "client" ||
      requesterRole === "passenger" ||
      requesterRole === "cliente";
    const allowClientRemainingServicePix =
      resource.is_service && isClientLikeRole && paymentStage === "remaining";
    const allowAnyAuthenticatedRemainingServicePix =
      resource.is_service && paymentStage === "remaining";

    const isClientById = requesterDbId != null &&
      resource.client_id_int === requesterDbId;
    const isProviderById = requesterDbId != null &&
      resource.provider_id_int === requesterDbId;
    const isClientByUid = requesterUid.length > 0 &&
      lower(resource.client_uid) === requesterUid;
    const isProviderByUid = requesterUid.length > 0 &&
      lower(resource.provider_uid) === requesterUid;

    if (
      !isServiceRoleAdmin &&
      !allowClientRemainingServicePix &&
      !allowAnyAuthenticatedRemainingServicePix &&
      !(isClientById || isProviderById || isClientByUid || isProviderByUid)
    ) {
      const denyDetails = {
        source: resource.source,
        payment_stage_requested: requestedPaymentStage || null,
        payment_stage_effective: paymentStage,
        requester: {
          role: requesterRole || null,
          db_id: requesterDbId,
          uid: requesterUid || null,
        },
        resource: {
          id: resource.id,
          status: resource.status ?? null,
          payment_remaining_status: resource.payment_remaining_status ?? null,
          client_id_int: resource.client_id_int,
          client_uid: resource.client_uid,
          provider_id_int: resource.provider_id_int,
          provider_uid: resource.provider_uid,
        },
        allow_flags: {
          is_service_role_admin: isServiceRoleAdmin,
          allow_client_remaining: allowClientRemainingServicePix,
          allow_any_authenticated_remaining: allowAnyAuthenticatedRemainingServicePix,
        },
        match: {
          by_id: isClientById || isProviderById,
          by_uid: isClientByUid || isProviderByUid,
          client_by_id: isClientById,
          provider_by_id: isProviderById,
          client_by_uid: isClientByUid,
          provider_by_uid: isProviderByUid,
        },
      };
      console.error('[mp-get-pix-data][ACCESS_DENIED]', JSON.stringify({ trace_id: traceId, details: denyDetails }));
      return edgeError({
        error: "Acesso negado",
        step: "authorize_access",
        reason_code: "ACCESS_DENIED",
        trace_id: traceId,
        status_code: 403,
        details: denyDetails,
      });
    }

    const expectedAmount = expectedAmountForStage(resource, paymentStage);
    const paymentFk = resource.is_service ? "service_id" : "trip_id";

    const existing = await admin
      .from("payments")
      .select("id, amount, status, pix_payload, pix_qr_code, mp_response, metadata, external_payment_id, mp_payment_id")
      .or(`${paymentFk}.eq.${entityId},metadata->>canonical_service_id.eq.${entityId}`)
      .eq("provider", "mercado_pago")
      .ilike("payment_type", "PIX")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Para serviço, tenta primeiro PIX do mesmo estágio em metadata.payment_stage
    let existingData = existing.data as any;
    if (resource.is_service) {
      const { data: stageRows } = await admin
        .from("payments")
        .select("id, amount, status, pix_payload, pix_qr_code, mp_response, metadata, created_at, external_payment_id, mp_payment_id")
        .or(`${paymentFk}.eq.${entityId},metadata->>canonical_service_id.eq.${entityId}`)
        .eq("provider", "mercado_pago")
        .ilike("payment_type", "PIX")
        .order("created_at", { ascending: false })
        .limit(20);

      const rows = (stageRows ?? []) as any[];
      const byStage = rows.find((r) => resolveStageFromPaymentRow(r) === paymentStage);
      if (byStage) {
        existingData = byStage;
      }
    }

    const existingAmount = round2(Number(existingData?.amount ?? 0));
    const existingStage = resolveStageFromPaymentRow(existingData);
    const hasPix = clean(existingData?.pix_payload).length > 0 ||
      clean(existingData?.pix_qr_code).length > 0;
    const sameAmount = expectedAmount > 0 && existingAmount === expectedAmount;
    const stageCompatible = !resource.is_service
      ? true
      : (paymentStage === "remaining"
          ? existingStage === "remaining"
          : (existingStage === "deposit" || existingStage.length === 0));

    if (hasPix && sameAmount && stageCompatible) {
      return json({
        success: true,
        trip_id: entityId,
        entity_type: effectiveType,
        amount: existingData?.amount ?? expectedAmount,
        resolved_amount: existingData?.amount ?? expectedAmount,
        status: existingData?.status ?? "pending",
        payment_stage_requested: requestedPaymentStage || null,
        payment_stage_effective: paymentStage,
        reused_existing_payment: true,
        reused_payment_id: clean(existingData?.external_payment_id) || clean(existingData?.mp_payment_id) || clean(existingData?.id),
        trace_id: traceId,
        pix: {
          payload: existingData?.pix_payload ?? null,
          copy_and_paste: existingData?.pix_payload ?? null,
          encodedImage: existingData?.pix_qr_code ?? null,
          image_url: existingData?.pix_qr_code ?? null,
        },
      });
    }
    if (
      paymentStage === "remaining" &&
      hasPix &&
      (!sameAmount || !stageCompatible)
    ) {
      console.warn(
        "[mp-get-pix-data][PIX_STAGE_MISMATCH_BLOCKED]",
        JSON.stringify({
          trace_id: traceId,
          service_id: resource.is_service ? resource.id : null,
          payment_stage_requested: requestedPaymentStage || null,
          payment_stage_effective: paymentStage,
          expected_amount: expectedAmount,
          existing_amount: existingAmount,
          existing_stage: existingStage || null,
          existing_payment_id: clean(existingData?.id) || null,
        }),
      );
    }

    const baseUrl = Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("PROJECT_ANON_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("PROJECT_SERVICE_KEY") ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apikey = clean(anonKey || serviceKey);

    if (!baseUrl || !apikey) {
      return edgeError({
        error:
          "Configuração do Supabase ausente para invocar mp-process-payment",
        step: "validate_env",
        reason_code: "SUPABASE_ENV_MISSING",
        trace_id: traceId,
        status_code: 500,
        details: {
          has_base_url: !!baseUrl,
          has_apikey: !!apikey,
        },
      });
    }

    const url = `${baseUrl}/functions/v1/mp-process-payment`;
    const authHeader = req.headers.get("Authorization") ?? "";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey,
        ...(authHeader ? { Authorization: authHeader } : {}),
        "x-trace-id": traceId,
      },
      body: JSON.stringify({
        ...(effectiveType === "fixed_booking_pix_intent"
          ? { pending_fixed_booking_id: entityId }
          : serviceId
          ? { service_id: entityId }
          : { trip_id: entityId }),
        payment_method: "pix",
        entity_type: effectiveType,
        payment_stage: paymentStage,
        trace_id: traceId,
      }),
    });

    const rawText = await res.text().catch(() => "");
    const data = safeJsonParse(rawText) ?? { raw: rawText };

    if (!res.ok) {
      return edgeError({
        error: clean(data?.error) || "Erro ao processar PIX no Mercado Pago",
        step: clean(data?.step) || "mp_process_payment_http",
        reason_code: clean(data?.reason_code) || "UPSTREAM_HTTP_ERROR",
        trace_id: clean(data?.trace_id) || traceId,
        status_code: Number(data?.status_code ?? res.status ?? 502),
        details: data,
      });
    }

    if (data?.success !== true) {
      return edgeError({
        error: clean(data?.error) || "Erro ao processar PIX no Mercado Pago",
        step: clean(data?.step) || "invoke_mp_process_payment",
        reason_code: clean(data?.reason_code) || "MP_PIX_FAILED",
        trace_id: clean(data?.trace_id) || traceId,
        status_code: Number(data?.status_code ?? 400),
        details: data,
      });
    }

    const responseStage = resolveStageFromMpProcessResponse(data);
    const responseAmount = round2(Number(data?.amount ?? 0));
    const stageMatchesExpected = responseStage.length === 0
      ? paymentStage === "deposit"
      : responseStage === paymentStage;
    const amountMatchesExpected = responseAmount === expectedAmount;
    if (!stageMatchesExpected || !amountMatchesExpected) {
      console.warn(
        "[mp-get-pix-data][PIX_STAGE_MISMATCH_BLOCKED]",
        JSON.stringify({
          trace_id: clean(data?.trace_id) || traceId,
          service_id: resource.is_service ? resource.id : null,
          payment_stage_requested: requestedPaymentStage || null,
          payment_stage_effective: paymentStage,
          expected_amount: expectedAmount,
          resolved_amount: responseAmount,
          response_stage: responseStage || null,
        }),
      );
      return edgeError({
        error: "PIX incompatível com etapa atual",
        step: "validate_mp_process_response",
        reason_code: "PIX_STAGE_MISMATCH",
        trace_id: clean(data?.trace_id) || traceId,
        status_code: 409,
        details: {
          payment_stage_requested: requestedPaymentStage || null,
          payment_stage_effective: paymentStage,
          expected_amount: expectedAmount,
          resolved_amount: responseAmount,
          response_stage: responseStage || null,
        },
      });
    }

    const pix = data?.pix && typeof data.pix === "object" ? data.pix : {
      payload: data?.payload ?? null,
      copy_and_paste: data?.copy_and_paste ?? data?.payload ?? null,
      encodedImage: data?.encodedImage ?? null,
      image_url: data?.image_url ?? data?.encodedImage ?? null,
    };

    return json({
      success: true,
      trip_id: entityId,
      entity_type: effectiveType,
      amount: data?.amount ?? expectedAmount,
      resolved_amount: data?.amount ?? expectedAmount,
      status: data?.status ?? "PENDING",
      payment_stage_requested: requestedPaymentStage || null,
      payment_stage_effective: paymentStage,
      reused_existing_payment: false,
      reused_payment_id: null,
      trace_id: clean(data?.trace_id) || traceId,
      pix: {
        payload: pix?.payload ?? pix?.copy_and_paste ?? null,
        copy_and_paste: pix?.copy_and_paste ?? pix?.payload ?? null,
        encodedImage: pix?.encodedImage ?? pix?.image_url ?? null,
        image_url: pix?.image_url ?? pix?.encodedImage ?? null,
      },
    });
  } catch (error: any) {
    return edgeError({
      error: error?.message ?? "Falha técnica ao gerar PIX",
      step: "internal_error",
      reason_code: "UNHANDLED_EXCEPTION",
      trace_id: traceId,
      status_code: 500,
    });
  }
});
