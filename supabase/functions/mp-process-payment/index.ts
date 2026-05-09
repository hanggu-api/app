import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

function clean(v: unknown): string {
  return String(v ?? "").trim();
}

function lower(v: unknown): string {
  return clean(v).toLowerCase();
}

function toIntId(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  const s = clean(v);
  if (!/^\d+$/.test(s)) return null;
  return Number(s);
}

function digits(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "");
}

function round2(v: number): number {
  return Number((Number(v) || 0).toFixed(2));
}

function amount(v: unknown): number {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return 0;
  return round2(n);
}

function mapMpStatus(status: string): string {
  const s = lower(status);
  if (s === "approved") return "paid";
  if (
    s === "cancelled" || s === "rejected" || s === "refunded" ||
    s === "charged_back"
  ) return "cancelled";
  return "pending";
}

function normalizeUpstreamStatus(status: number): number {
  if (!Number.isFinite(status) || status <= 0) return 502;
  if (status >= 500) return 502;
  if ([400, 401, 402, 403, 404, 409, 422].includes(status)) return status;
  return 400;
}

function maskFingerprint(value: string): string {
  const v = clean(value);
  if (!v) return "";
  return v.length <= 12 ? v : `${v.slice(0, 8)}...${v.slice(-4)}`;
}

function resolvePaymentStageFromRow(row: any): string {
  return lower(
    row?.metadata?.payment_stage ??
      row?.mp_response?.metadata?.payment_stage,
  );
}

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

interface UserProfile {
  id_int: number | null;
  uid: string | null;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  document_value: string | null;
}

interface CanonicalResource {
  id: string;
  source:
    | "trips"
    | "service_requests"
    | "agendamento_servico"
    | "fixed_booking_pix_intents";
  is_service: boolean;
  is_agendamento: boolean;
  client: UserProfile;
  provider: UserProfile;
  amount_total: number;
  amount_deposit: number;
  amount_for_stage: number;
  status?: string | null;
  payment_remaining_status?: string | null;
  pickup_address: string;
  dropoff_address: string;
  pending_fees_included: unknown[];
}

function paymentServiceFkEligible(source: CanonicalResource["source"]): boolean {
  return source === "service_requests";
}

const TRIP_RUNTIME_ENABLED = false;

function buildEmptyProfile(): UserProfile {
  return {
    id_int: null,
    uid: null,
    email: null,
    full_name: null,
    phone: null,
    document_value: null,
  };
}

async function loadUserById(
  admin: any,
  id: number | null,
): Promise<UserProfile> {
  if (id == null) return buildEmptyProfile();
  const { data } = await admin
    .from("users")
    .select("id, supabase_uid, email, full_name, phone, document_value")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    return {
      ...buildEmptyProfile(),
      id_int: id,
    };
  }

  return {
    id_int: toIntId(data.id),
    uid: clean(data.supabase_uid) || null,
    email: clean(data.email) || null,
    full_name: clean(data.full_name) || null,
    phone: clean(data.phone) || null,
    document_value: clean(data.document_value) || null,
  };
}

async function loadUserByUid(
  admin: any,
  uid: string | null,
): Promise<UserProfile> {
  const normalized = clean(uid);
  if (!normalized) return buildEmptyProfile();

  const { data } = await admin
    .from("users")
    .select("id, supabase_uid, email, full_name, phone, document_value")
    .eq("supabase_uid", normalized)
    .maybeSingle();

  if (!data) {
    return {
      ...buildEmptyProfile(),
      uid: normalized,
    };
  }

  return {
    id_int: toIntId(data.id),
    uid: clean(data.supabase_uid) || normalized,
    email: clean(data.email) || null,
    full_name: clean(data.full_name) || null,
    phone: clean(data.phone) || null,
    document_value: clean(data.document_value) || null,
  };
}

async function loadPaymentConfig(admin: any) {
  const { data } = await admin
    .from("system_settings")
    .select("key_name, value")
    .in("key_name", ["payment_proportions"]);

  const config = {
    mobile_upfront_percent: 0.3,
    fixed_upfront_percent: 0.3,
  };

  if (data) {
    const row = data.find((r: any) => r.key_name === "payment_proportions");
    if (row && typeof row.value === "object") {
      if (row.value.mobile_upfront_percent != null) {
        config.mobile_upfront_percent = Number(row.value.mobile_upfront_percent);
      }
      if (row.value.fixed_upfront_percent != null) {
        config.fixed_upfront_percent = Number(row.value.fixed_upfront_percent);
      }
    }
  }

  return config;
}

function computeServiceAmounts(
  total: number,
  upfront: number,
  paymentStage: string,
  config: { mobile_upfront_percent: number },
) {
  const safeTotal = round2(Math.max(total, 0));
  const safeUpfront = round2(Math.max(upfront, 0));
  // Se o serviço tiver um upfront específico (ex: negociado), usamos ele. 
  // Caso contrário, usamos a porcentagem da configuração (default 0.3).
  const deposit = safeUpfront > 0 ? safeUpfront : round2(safeTotal * config.mobile_upfront_percent);
  const stageAmount = paymentStage === "remaining"
    ? round2(Math.max(safeTotal - deposit, 0))
    : round2(deposit > 0 ? deposit : safeTotal);

  return {
    total: safeTotal,
    deposit,
    stageAmount,
  };
}

async function loadCanonicalResource(
  admin: any,
  entityId: string,
  paymentStage: string,
  paymentConfig: any,
): Promise<CanonicalResource | null> {
  if (TRIP_RUNTIME_ENABLED) {
    const { data: trip } = await admin
      .from("trips")
      .select(
        "id, client_id, driver_id, pickup_address, dropoff_address, fare_estimated, fare_final, pending_fees_included",
      )
      .eq("id", entityId)
      .maybeSingle();

    if (trip) {
      const client = await loadUserById(admin, toIntId(trip.client_id));
      const provider = await loadUserById(admin, toIntId(trip.driver_id));
      const total = amount(trip.fare_final ?? trip.fare_estimated);

      return {
        id: clean(trip.id) || entityId,
        source: "trips",
        is_service: false,
        is_agendamento: false,
        client,
        provider,
        amount_total: total,
        amount_deposit: total,
        amount_for_stage: total,
        pickup_address: clean(trip.pickup_address),
        dropoff_address: clean(trip.dropoff_address),
        pending_fees_included: Array.isArray(trip.pending_fees_included)
          ? trip.pending_fees_included
          : [],
      };
    }
  }

  const { data: srv } = await admin
    .from("service_requests")
    .select(
      "id, client_id, provider_id, address, price_estimated, price_upfront, status, payment_remaining_status",
    )
    .eq("id", entityId)
    .maybeSingle();

  if (srv) {
    const client = await loadUserById(admin, toIntId(srv.client_id));
    const provider = await loadUserById(admin, toIntId(srv.provider_id));
    const values = computeServiceAmounts(
      amount(srv.price_estimated ?? srv.price_upfront),
      amount(srv.price_upfront),
      paymentStage,
      paymentConfig,
    );

      return {
        id: clean(srv.id) || entityId,
        source: "service_requests",
        is_service: true,
        is_agendamento: false,
      client,
      provider,
        amount_total: values.total,
        amount_deposit: values.deposit,
        amount_for_stage: values.stageAmount,
        status: clean(srv.status) || null,
        payment_remaining_status: clean(srv.payment_remaining_status) || null,
        pickup_address: clean(srv.address),
        dropoff_address: "Local do Serviço",
        pending_fees_included: [],
      };
  }

  const { data: booking } = await admin
    .from("agendamento_servico")
    .select(
      "id, cliente_uid, prestador_uid, endereco_completo, preco_total, valor_entrada",
    )
    .eq("id", entityId)
    .maybeSingle();

  if (booking) {
    const client = await loadUserByUid(
      admin,
      clean(booking.cliente_uid) || null,
    );
    const provider = await loadUserByUid(
      admin,
      clean(booking.prestador_uid) || null,
    );
    const values = computeServiceAmounts(
      amount(booking.preco_total),
      amount(booking.valor_entrada),
      paymentStage,
      paymentConfig,
    );

    return {
      id: clean(booking.id) || entityId,
      source: "agendamento_servico",
      is_service: true,
      is_agendamento: true,
      client,
      provider,
      amount_total: values.total,
      amount_deposit: values.deposit,
      amount_for_stage: values.stageAmount,
      pickup_address: clean(booking.endereco_completo),
      dropoff_address: "Local do Serviço",
      pending_fees_included: [],
    };
  }

  const { data: pendingIntent } = await admin
    .from("fixed_booking_pix_intents")
    .select(
      "id, cliente_uid, prestador_uid, cliente_user_id, prestador_user_id, address, price_estimated, price_upfront",
    )
    .eq("id", entityId)
    .maybeSingle();

  if (!pendingIntent) return null;

  const clientById = await loadUserById(
    admin,
    toIntId(pendingIntent.cliente_user_id),
  );
  const providerById = await loadUserById(
    admin,
    toIntId(pendingIntent.prestador_user_id),
  );
  const client = clientById.id_int != null || clientById.uid != null
    ? clientById
    : await loadUserByUid(admin, clean(pendingIntent.cliente_uid) || null);
  const provider = providerById.id_int != null || providerById.uid != null
    ? providerById
    : await loadUserByUid(admin, clean(pendingIntent.prestador_uid) || null);
  const values = computeServiceAmounts(
    amount(pendingIntent.price_estimated),
    amount(pendingIntent.price_upfront),
    paymentStage,
    paymentConfig,
  );

  return {
    id: clean(pendingIntent.id) || entityId,
    source: "fixed_booking_pix_intents",
    is_service: true,
    is_agendamento: true,
    client,
    provider,
    amount_total: values.total,
    amount_deposit: values.deposit,
    amount_for_stage: values.stageAmount,
    pickup_address: clean(pendingIntent.address),
    dropoff_address: "Local do Serviço",
    pending_fees_included: [],
  };
}

function authorizeResourceAccess(appUser: any, resource: CanonicalResource) {
  const requesterDbId = toIntId(appUser?.id);
  const requesterUid = lower(appUser?.supabase_uid);
  const requesterRole = lower(appUser?.role);

  const isServiceRoleAdmin = clean(appUser?.id) === "service_role" ||
    requesterRole === "admin" || requesterRole === "service_role";

  const isClientById = requesterDbId != null &&
    resource.client.id_int === requesterDbId;
  const isProviderById = requesterDbId != null &&
    resource.provider.id_int === requesterDbId;
  const isClientByUid = requesterUid.length > 0 &&
    lower(resource.client.uid) === requesterUid;
  const isProviderByUid = requesterUid.length > 0 &&
    lower(resource.provider.uid) === requesterUid;

  const allowed = isServiceRoleAdmin || isClientById || isProviderById ||
    isClientByUid || isProviderByUid;

  return {
    allowed,
    details: {
      requester: {
        db_id: requesterDbId,
        uid: requesterUid || null,
        role: requesterRole || null,
      },
      resource: {
        source: resource.source,
        client_id_int: resource.client.id_int,
        client_uid: resource.client.uid,
        provider_id_int: resource.provider.id_int,
        provider_uid: resource.provider.uid,
      },
      match: {
        by_id: isClientById || isProviderById,
        by_uid: isClientByUid || isProviderByUid,
        is_service_role_admin: isServiceRoleAdmin,
      },
    },
  };
}

async function createMpPayment(
  payload: Record<string, unknown>,
  accessToken: string,
  idempotencyKey: string,
) {
  const res = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  return { res, data, token_source: "primary" as const };
}

function paymentMethodIdFrom(method: string): string {
  if (method === "pix") return "pix_app";
  if (method === "mercado_pago") return "wallet_app";
  return "card_app";
}

function billingTypeFrom(method: string): string {
  if (method === "pix") return "PIX";
  if (method === "mercado_pago") return "WALLET";
  return "CREDIT_CARD";
}

function settlementCategoryFromStatus(mpStatus: string): string {
  const s = lower(mpStatus);
  if (s === "approved") return "captured";
  if (s === "pending" || s === "in_process" || s === "authorized") return "pending";
  return "failed";
}

async function buildStableIdempotencyKey(params: {
  entityId: string;
  paymentMethod: string;
  paymentStage: string;
  amount: number;
  ruleVersion: string;
}): Promise<string> {
  const canonical = JSON.stringify({
    v: params.ruleVersion,
    entity_id: params.entityId,
    payment_method: params.paymentMethod,
    payment_stage: params.paymentStage,
    amount: Number(params.amount.toFixed(2)),
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Limite seguro para header X-Idempotency-Key sem colidir por prefixo textual.
  return hex.slice(0, 64);
}

async function loadMpCustomerId(
  admin: any,
  userId: number | null,
): Promise<string | null> {
  if (userId == null) return null;

  const { data } = await admin
    .from("payment_accounts")
    .select("external_id")
    .eq("user_id", userId)
    .eq("gateway_name", "mercado_pago")
    .maybeSingle();

  const customerId = clean(data?.external_id);
  return customerId || null;
}

async function processApprovedTripPendingFees(
  admin: any,
  resource: CanonicalResource,
  entityId: string,
) {
  const feeIds = Array.isArray(resource.pending_fees_included)
    ? resource.pending_fees_included
    : [];

  if (feeIds.length === 0) return;

  for (const feeId of feeIds) {
    const { data: fee } = await admin
      .from("trip_cancellation_fees")
      .select("victim_driver_id, amount")
      .eq("id", feeId)
      .eq("status", "pending")
      .maybeSingle();

    if (!fee) continue;

    await admin
      .from("trip_cancellation_fees")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        new_trip_id: entityId,
      })
      .eq("id", feeId);

    await admin.from("payments").insert({
      user_id: fee.victim_driver_id,
      trip_id: entityId,
      amount: fee.amount,
      status: "paid",
      payment_method_id: "CANCELLATION_CREDIT",
      provider: "platform",
      payment_type: "CREDIT",
      payout_status: "pending",
    });
  }
}

async function savePaymentAndBuildResponse(params: {
  admin: any;
  resource: CanonicalResource;
  entityId: string;
  paymentMethod: string;
  paymentStage: string;
  totalAmount: number;
  platformFee: number;
  commissionRate: number;
  driverAmount: number;
  mpData: any;
  traceId: string;
  tokenSource: string;
}) {
  const {
    admin,
    resource,
    entityId,
    paymentMethod,
    paymentStage,
    totalAmount,
    platformFee,
    commissionRate,
    driverAmount,
    mpData,
    traceId,
    tokenSource,
  } = params;

  const mpStatus = lower(mpData?.status);
  const localStatus = mapMpStatus(mpStatus);
  const pixPayload = clean(
    mpData?.point_of_interaction?.transaction_data?.qr_code,
  );
  const pixQr = clean(
    mpData?.point_of_interaction?.transaction_data?.qr_code_base64,
  );

  const paymentMethodId = paymentMethodIdFrom(paymentMethod);
  const billingType = billingTypeFrom(paymentMethod);

  const insertRes = await admin
    .from("payments")
    .insert({
      trip_id: resource.is_service ? null : entityId,
      service_id: resource.is_service && paymentServiceFkEligible(resource.source)
        ? entityId
        : null,
      user_id: resource.client.id_int,
      amount: totalAmount,
      commission_amount: platformFee,
      commission_rate: commissionRate,
      status: localStatus,
      payment_method: paymentMethodId,
      payment_method_id: paymentMethodId,
      provider: "mercado_pago",
      external_payment_id: clean(mpData?.id),
      payment_type: billingType,
      settlement_category: settlementCategoryFromStatus(mpStatus),
      mp_payment_id: clean(mpData?.id),
      pix_payload: pixPayload || null,
      pix_qr_code: pixQr || null,
      payout_status: mpStatus === "approved" ? "pending" : null,
      mp_response: mpData,
      metadata: {
        canonical_service_id: resource.is_service ? entityId : null,
        canonical_source: resource.source,
        payment_stage: paymentStage,
      },
    })
    .select("id")
    .maybeSingle();

  if (insertRes.error) {
    const dbErrorMessage = clean(insertRes.error.message);
    const isDuplicatePendingPix = dbErrorMessage.includes("ux_payments_service_pending_pix");
    if (isDuplicatePendingPix && resource.is_service) {
      const { data: existingPending } = await admin
        .from("payments")
        .select("id,status,amount,pix_payload,pix_qr_code,external_payment_id,mp_payment_id,metadata,mp_response")
        .eq("service_id", entityId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingPending) {
        await admin.from("payment_transaction_logs").insert({
          trace_id: traceId,
          trip_id: null,
          payment_id: existingPending.id ?? null,
          provider: "mercado_pago",
          channel: "edge",
          event: "create_payment_reused_after_duplicate_pending_constraint",
          status: clean(existingPending.status) || "pending",
          billing_type: billingType,
          amount: Number(existingPending.amount ?? totalAmount),
          payload: {
            service_id: entityId,
            payment_stage: paymentStage,
            duplicate_constraint: "ux_payments_service_pending_pix",
            external_payment_id: clean(existingPending.external_payment_id),
            mp_payment_id: clean(existingPending.mp_payment_id),
          },
        });

        return json({
          success: true,
          paymentId: clean(existingPending.external_payment_id) ||
            clean(existingPending.mp_payment_id) ||
            clean(mpData?.id),
          status: (clean(existingPending.status) || "pending").toUpperCase(),
          provider: "mercado_pago",
          trace_id: traceId,
          step: "completed",
          reused_existing_payment: true,
          amount: Number(existingPending.amount ?? totalAmount),
          resolved_amount: Number(existingPending.amount ?? totalAmount),
          payment_stage_requested: paymentStage,
          payment_stage_effective: paymentStage,
          pix: paymentMethod === "pix"
            ? {
              payload: clean(existingPending.pix_payload) || pixPayload || null,
              copy_and_paste: clean(existingPending.pix_payload) || pixPayload || null,
              encodedImage: clean(existingPending.pix_qr_code) || pixQr || null,
              image_url: clean(existingPending.pix_qr_code) || pixQr || null,
            }
            : null,
        });
      }
    }

    await admin.from("payment_transaction_logs").insert({
      trace_id: traceId,
      trip_id: resource.is_service ? null : entityId,
      payment_id: null,
      provider: "mercado_pago",
      channel: "edge",
      event: "create_payment_persist_failed",
      status: mpStatus || "unknown",
      billing_type: billingType,
      amount: totalAmount,
      payload: {
        external_payment_id: clean(mpData?.id),
        token_source: tokenSource || null,
        payment_method: paymentMethod,
        payment_stage: paymentStage,
        source: resource.source,
        error_message: insertRes.error.message,
      },
    });
    return edgeError({
      error: "Falha ao registrar pagamento em public.payments",
      step: "persist_payment",
      reason_code: "PAYMENT_PERSIST_FAILED",
      trace_id: traceId,
      status_code: 500,
      details: {
        service_id: resource.is_service ? entityId : null,
        trip_id: resource.is_service ? null : entityId,
        mp_payment_id: clean(mpData?.id),
        payment_stage: paymentStage,
        db_error: insertRes.error.message,
      },
    });
  }

  await admin.from("payment_transaction_logs").insert({
    trace_id: traceId,
    trip_id: resource.is_service ? null : entityId,
    payment_id: insertRes.data?.id ?? null,
    provider: "mercado_pago",
    channel: "edge",
    event: "create_payment_response",
    status: mpStatus || "unknown",
    billing_type: billingType,
    amount: totalAmount,
    payload: {
      external_payment_id: clean(mpData?.id),
      token_source: tokenSource || null,
      mp_status: mpStatus,
      payment_method: paymentMethod,
      payment_stage: paymentStage,
      source: resource.source,
    },
  });

  if (mpStatus === "approved" && !resource.is_service) {
    await admin
      .from("trips")
      .update({ payment_requires_cvv: false })
      .eq("id", entityId);

    await processApprovedTripPendingFees(admin, resource, entityId);
  }

  return json({
    success: true,
    paymentId: clean(mpData?.id),
    status: (mpStatus || "pending").toUpperCase(),
    provider: "mercado_pago",
    trace_id: traceId,
    step: "completed",
    silent_auth: false,
    invoiceUrl: mpData?.transaction_details?.external_resource_url ?? null,
    amount: totalAmount,
    pix: paymentMethod === "pix"
      ? {
        payload: pixPayload || null,
        copy_and_paste: pixPayload || null,
        encodedImage: pixQr || null,
        image_url: pixQr || null,
      }
      : null,
    settlement: {
      total_amount: totalAmount,
      platform_fee: platformFee,
      driver_amount: driverAmount,
    },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  let traceId = req.headers.get("x-trace-id") || crypto.randomUUID();

  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return auth.error ?? edgeError({
        error: "Falha de autenticação",
        step: "authenticate",
        reason_code: "AUTH_FAILED",
        trace_id: traceId,
        status_code: 401,
      });
    }
    const { admin, appUser } = auth;

    const body = await req.json().catch(() => ({}));
    traceId = clean(body?.trace_id) || traceId;

    const tripId = clean(body?.trip_id);
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

    const entityId = clean(body?.pending_fixed_booking_id) ||
      clean(body?.service_id) ||
      clean(body?.trip_id);
    const paymentMethod = lower(body?.payment_method) || "pix";
    const requestedPaymentStage = lower(body?.payment_stage) || "deposit";
    const creditCardToken = clean(body?.creditCardToken);

    if (!entityId) {
      return edgeError({
        error: "pending_fixed_booking_id, service_id ou trip_id obrigatório",
        step: "validate_input",
        reason_code: "ENTITY_ID_REQUIRED",
        trace_id: traceId,
        status_code: 400,
      });
    }

    const MP_ACCESS_TOKEN = clean(
      Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN") ??
        Deno.env.get("MP_ACCESS_TOKEN"),
    );
    if (!MP_ACCESS_TOKEN) {
      return edgeError({
        error: "MERCADO_PAGO_ACCESS_TOKEN/MP_ACCESS_TOKEN não configurado",
        step: "validate_env",
        reason_code: "MP_ACCESS_TOKEN_MISSING",
        trace_id: traceId,
        status_code: 500,
      });
    }

    const paymentConfig = await loadPaymentConfig(admin);

    const resource = await loadCanonicalResource(
      admin,
      entityId,
      requestedPaymentStage,
      paymentConfig,
    );
    if (!resource) {
      return edgeError({
        error: "Recurso não encontrado",
        step: "load_resource",
        reason_code: "RESOURCE_NOT_FOUND",
        trace_id: traceId,
        status_code: 404,
      });
    }

    const authz = authorizeResourceAccess(appUser, resource);
    if (!authz.allowed) {
      return edgeError({
        error: "Acesso negado",
        step: "authorize_access",
        reason_code: "ACCESS_DENIED",
        trace_id: traceId,
        status_code: 403,
        details: authz.details,
      });
    }

    const resourceStatus = lower(resource.status);
    const shouldForceRemaining =
      resource.is_service &&
      (resourceStatus === "waiting_remaining_payment" ||
        resourceStatus === "waiting_payment_remaining");
    const paymentStage = shouldForceRemaining
      ? "remaining"
      : requestedPaymentStage;

    if (
      resource.is_service &&
      requestedPaymentStage &&
      requestedPaymentStage !== paymentStage
    ) {
      await admin.from("payment_transaction_logs").insert({
        trace_id: traceId,
        trip_id: null,
        payment_id: null,
        provider: "mercado_pago",
        channel: "edge",
        event: "pix_stage_mismatch_blocked",
        status: "blocked",
        billing_type: billingTypeFrom(paymentMethod),
        amount: Number(resource.amount_total ?? 0),
        payload: {
          service_id: entityId,
          payment_stage_requested: requestedPaymentStage,
          payment_stage_effective: paymentStage,
          resource_status: resource.status ?? null,
          payment_remaining_status: resource.payment_remaining_status ?? null,
          reason: "requested_stage_differs_from_effective",
        },
      });
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

    const totalAmount = round2(
      resource.is_service
        ? (paymentStage === "remaining"
          ? Math.max(resource.amount_total - resource.amount_deposit, 0)
          : (resource.amount_deposit > 0
            ? resource.amount_deposit
            : resource.amount_total))
        : resource.amount_total,
    );

    if (totalAmount <= 0) {
      return edgeError({
        error: "Valor inválido para pagamento",
        step: "compute_amount",
        reason_code: "INVALID_AMOUNT",
        trace_id: traceId,
        status_code: 400,
        details: {
          source: resource.source,
          amount_total: resource.amount_total,
          amount_deposit: resource.amount_deposit,
          amount_for_stage: resource.amount_for_stage,
          payment_stage: paymentStage,
        },
      });
    }

    let commissionRate = 0.15;
    let platformFee = 0;

    if (resource.is_service || resource.is_agendamento) {
      // Fluxo de serviço: cobrança de sinal/taxa é tratada como receita de plataforma.
      commissionRate = 1.0;
      platformFee = totalAmount;
    } else {
      let feeRate = 0.15;
      if (paymentMethod === "pix") feeRate = 0.05;
      else if (
        paymentMethod === "credit_card" || paymentMethod === "mercado_pago"
      ) feeRate = 0.10;

      if (resource.provider.id_int != null) {
        const { data: driverUser } = await admin
          .from("users")
          .select("driver_payment_mode")
          .eq("id", resource.provider.id_int)
          .maybeSingle();

        const mode = lower(driverUser?.driver_payment_mode || "platform");
        if (mode === "fixed") {
          return edgeError({
            error:
              "Prestador em TAXA DIÁRIA: pagamentos pelo aplicativo estão desabilitados.",
            step: "validate_provider_mode",
            reason_code: "PROVIDER_FIXED_MODE_DISABLED",
            trace_id: traceId,
            status_code: 400,
          });
        }

        if (mode === "direct") {
          feeRate = 0;
        }
      }

      commissionRate = feeRate;
      platformFee = round2(totalAmount * feeRate);
    }

    const driverAmount = round2(totalAmount - platformFee);

    const payerDoc = digits(resource.client.document_value);
    const payerName = clean(resource.client.full_name);
    const payerFirstName = clean(payerName.split(" ")[0]) || "Cliente";
    const payerEmail = clean(resource.client.email) ||
      `user_${
        resource.client.id_int ?? resource.client.uid ?? "guest"
      }@example.com`;

    const description = `Pagamento Play101 ${
      resource.is_service ? "serviço" : "corrida"
    } ${entityId}`.slice(0, 255);
    const idempotencyKey = await buildStableIdempotencyKey({
      entityId,
      paymentMethod,
      paymentStage,
      amount: totalAmount,
      ruleVersion: "pix_stage_v2",
    });
    await admin.from("payment_transaction_logs").insert({
      trace_id: traceId,
      trip_id: resource.is_service ? null : entityId,
      payment_id: null,
      provider: "mercado_pago",
      channel: "edge",
      event: "pix_idempotency_key_built",
      status: "prepared",
      billing_type: billingTypeFrom(paymentMethod),
      amount: totalAmount,
      payload: {
        service_id: resource.is_service ? entityId : null,
        payment_stage_requested: requestedPaymentStage,
        payment_stage_effective: paymentStage,
        expected_amount: totalAmount,
        idempotency_key_fingerprint: maskFingerprint(idempotencyKey),
      },
    });
    console.log(
      "[mp-process-payment][PIX_STAGE_RESOLVED]",
      JSON.stringify({
        trace_id: traceId,
        service_id: resource.is_service ? entityId : null,
        payment_stage_requested: requestedPaymentStage,
        payment_stage_effective: paymentStage,
        expected_amount: totalAmount,
        idempotency_key_fingerprint: maskFingerprint(idempotencyKey),
      }),
    );

    // Anti-duplicidade: selecionar candidato compatível por estágio/valor evita reuso do PIX de 30% na fase de 70%.
    const entityColumn = resource.is_service ? "service_id" : "trip_id";
    const { data: existingPayments } = await admin
      .from("payments")
      .select("id,status,external_payment_id,mp_payment_id,pix_payload,pix_qr_code,amount,metadata,mp_response,created_at")
      .eq(entityColumn, entityId)
      .eq("payment_method", paymentMethodIdFrom(paymentMethod))
      .in("status", ["pending", "paid"])
      .order("created_at", { ascending: false })
      .limit(20);

    const paymentRows = Array.isArray(existingPayments) ? existingPayments : [];
    const existingPayment = paymentRows.find((row: any) => {
      const rowStage = resolvePaymentStageFromRow(row);
      const rowAmount = round2(Number(row?.amount ?? 0));
      const hasPix = clean(row?.pix_payload).length > 0 ||
        clean(row?.pix_qr_code).length > 0;
      if (paymentMethod !== "pix") return true;
      if (paymentStage === "remaining") {
        return rowStage === "remaining" && rowAmount === totalAmount && hasPix;
      }
      return (rowStage === "deposit" || rowStage.length === 0) &&
        rowAmount === totalAmount && hasPix;
    }) ?? paymentRows[0];

    if (existingPayment) {
      const existingStage = resolvePaymentStageFromRow(existingPayment);
      const existingAmount = round2(Number((existingPayment as any)?.amount ?? 0));
      const stageMatches = paymentMethod !== "pix"
        ? true
        : (paymentStage === "remaining"
            ? existingStage === "remaining"
            : (existingStage === "deposit" || existingStage.length === 0));
      const amountMatches = paymentMethod !== "pix" || existingAmount === totalAmount;
      const existingStatus = lower((existingPayment as any)?.status);
      const hasExistingPix = clean((existingPayment as any)?.pix_payload).length > 0 ||
        clean((existingPayment as any)?.pix_qr_code).length > 0;
      const existingMpTransactionAmount = round2(
        Number((existingPayment as any)?.mp_response?.transaction_amount ?? 0),
      );
      const mpAmountMatches = paymentMethod !== "pix" ||
        existingMpTransactionAmount <= 0 ||
        existingMpTransactionAmount === totalAmount;

      const allowReuseForStage = paymentStage !== "remaining" ||
        (paymentStage === "remaining" &&
          stageMatches &&
          amountMatches &&
          mpAmountMatches &&
          hasExistingPix);
      if (allowReuseForStage && stageMatches && amountMatches) {
        await admin.from("payment_transaction_logs").insert({
          trace_id: traceId,
          trip_id: resource.is_service ? null : entityId,
          payment_id: existingPayment.id ?? null,
          provider: "mercado_pago",
          channel: "edge",
          event: "create_payment_reused_existing",
          status: clean(existingPayment.status) || "unknown",
          billing_type: billingTypeFrom(paymentMethod),
          amount: totalAmount,
          payload: {
            entity_id: entityId,
            entity_column: entityColumn,
            payment_stage_requested: paymentStage,
            existing_stage: existingStage,
            existing_amount: existingAmount,
            existing_mp_transaction_amount: existingMpTransactionAmount,
            existing_external_payment_id: clean(existingPayment.external_payment_id),
            existing_mp_payment_id: clean(existingPayment.mp_payment_id),
          },
        });
        return json({
          success: true,
          reused_existing_payment: true,
          paymentId: clean(existingPayment.external_payment_id) || clean(existingPayment.mp_payment_id),
          status: (clean(existingPayment.status) || "pending").toUpperCase(),
          provider: "mercado_pago",
          trace_id: traceId,
          step: "completed",
          amount: Number(existingPayment.amount ?? totalAmount),
          resolved_amount: Number(existingPayment.amount ?? totalAmount),
          payment_stage_requested: requestedPaymentStage,
          payment_stage_effective: paymentStage,
          pix: paymentMethod === "pix"
            ? {
              payload: clean(existingPayment.pix_payload) || null,
              copy_and_paste: clean(existingPayment.pix_payload) || null,
              encodedImage: clean(existingPayment.pix_qr_code) || null,
              image_url: clean(existingPayment.pix_qr_code) || null,
            }
            : null,
        });
      }

      // Auto-heal robusto: cancelar TODOS os pendentes incompatíveis (stage/valor) 
      // para garantir que a constraint ux_payments_service_pending_pix não bloqueie a nova geração.
      if (paymentMethod === "pix") {
        const incompatiblePendingRows = paymentRows.filter((row: any) => {
          const s = lower(row?.status);
          if (s !== "pending") return false;
          
          const rowStage = resolvePaymentStageFromRow(row);
          const rowAmount = round2(Number(row?.amount ?? 0));
          const hasPix = clean(row?.pix_payload).length > 0 || clean(row?.pix_qr_code).length > 0;
          
          const stageMatches = paymentStage === "remaining"
            ? rowStage === "remaining"
            : (rowStage === "deposit" || rowStage.length === 0);
          const amountMatches = rowAmount === totalAmount;
          
          return !stageMatches || !amountMatches || !hasPix;
        });

        if (incompatiblePendingRows.length > 0) {
          const idsToCancel = incompatiblePendingRows.map((r: any) => r.id);
          await admin
            .from("payments")
            .update({
              status: "cancelled",
              metadata: {
                stale_for_new_attempt: true,
                stale_reason: "incompatible_pending_cleanup",
                stale_marked_at: new Date().toISOString(),
                trace_id: traceId
              },
            })
            .in("id", idsToCancel);

          for (const row of incompatiblePendingRows) {
            await admin.from("payment_transaction_logs").insert({
              trace_id: traceId,
              trip_id: resource.is_service ? null : entityId,
              payment_id: row.id,
              provider: "mercado_pago",
              channel: "edge",
              event: "pix_incompatible_cleanup",
              status: "cancelled",
              billing_type: billingTypeFrom(paymentMethod),
              amount: Number(row.amount ?? totalAmount),
              payload: {
                service_id: resource.is_service ? entityId : null,
                payment_stage_requested: paymentStage,
                expected_amount: totalAmount,
                existing_payment_id: row.id,
                existing_stage: resolvePaymentStageFromRow(row),
                existing_amount: row.amount
              },
            });
          }
          
          console.log(`[mp-process-payment][AUTO_HEAL] Cancelados ${idsToCancel.length} pagamentos pendentes incompatíveis para o serviço ${entityId}`);
        }
      }
    }

    const SUPABASE_URL = clean(
      Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL"),
    );
    const MP_WEBHOOK_URL = clean(Deno.env.get("MP_WEBHOOK_URL"));
    const notificationUrl = MP_WEBHOOK_URL ||
      (SUPABASE_URL
        ? `${SUPABASE_URL}/functions/v1/mp-pix-webhook`
        : "");

    console.log(`[mp-process-payment] notificationUrl: ${notificationUrl}`);

    const basePayload: Record<string, unknown> = {
      transaction_amount: totalAmount,
      description,
      external_reference: entityId,
      ...(notificationUrl ? { notification_url: notificationUrl } : {}),
      metadata: {
        service_id: entityId,
        trip_id: entityId,
        source: resource.source,
        payment_stage: paymentStage,
        platform_fee: platformFee,
        driver_amount: driverAmount,
        trace_id: traceId,
      },
    };

    if (paymentMethod === "pix") {
      const payer: Record<string, unknown> = {
        email: payerEmail,
        first_name: payerFirstName,
      };
      if (payerDoc.length >= 11) {
        payer.identification = {
          type: payerDoc.length > 11 ? "CNPJ" : "CPF",
          number: payerDoc,
        };
      }

      const pixPayload = {
        ...basePayload,
        payment_method_id: "pix",
        payer,
      };

      const mpAttempt = await createMpPayment(
        pixPayload,
        MP_ACCESS_TOKEN,
        idempotencyKey,
      );
      const mpRes = mpAttempt.res;
      const mpData = mpAttempt.data;

      if (!mpRes.ok) {
        return edgeError({
          error: "Erro MP PIX",
          step: "mp_pix_request",
          reason_code: "MP_PIX_API_ERROR",
          trace_id: traceId,
          status_code: normalizeUpstreamStatus(mpRes.status),
          details: {
            upstream_status: mpRes.status,
            token_source: mpAttempt.token_source,
            mp: mpData,
          },
        });
      }

      const mpTransactionAmount = round2(Number(mpData?.transaction_amount ?? 0));
      const mpMetadataStage = lower(mpData?.metadata?.payment_stage);
      const amountMatchesExpected = mpTransactionAmount > 0 &&
        mpTransactionAmount === totalAmount;
      const stageMatchesExpected = paymentStage !== "remaining" ||
        mpMetadataStage === "remaining";
      console.log(
        "[mp-process-payment][PIX_MP_RESPONSE]",
        JSON.stringify({
          trace_id: traceId,
          service_id: resource.is_service ? entityId : null,
          payment_stage_requested: requestedPaymentStage,
          payment_stage_effective: paymentStage,
          expected_amount: totalAmount,
          mp_transaction_amount: mpTransactionAmount,
          mp_metadata_payment_stage: mpMetadataStage || null,
          mp_payment_id: clean(mpData?.id) || null,
        }),
      );
      await admin.from("payment_transaction_logs").insert({
        trace_id: traceId,
        trip_id: resource.is_service ? null : entityId,
        payment_id: null,
        provider: "mercado_pago",
        channel: "edge",
        event: "pix_mp_response_validated",
        status: amountMatchesExpected && stageMatchesExpected ? "ok" : "invalid",
        billing_type: billingTypeFrom(paymentMethod),
        amount: totalAmount,
        payload: {
          service_id: resource.is_service ? entityId : null,
          payment_stage_requested: requestedPaymentStage,
          payment_stage_effective: paymentStage,
          expected_amount: totalAmount,
          mp_transaction_amount: mpTransactionAmount,
          mp_metadata_payment_stage: mpMetadataStage || null,
          mp_payment_id: clean(mpData?.id) || null,
        },
      });
      if (!amountMatchesExpected || !stageMatchesExpected) {
        await admin.from("payment_transaction_logs").insert({
          trace_id: traceId,
          trip_id: resource.is_service ? null : entityId,
          payment_id: null,
          provider: "mercado_pago",
          channel: "edge",
          event: "pix_stage_mismatch_blocked",
          status: "blocked",
          billing_type: billingTypeFrom(paymentMethod),
          amount: totalAmount,
          payload: {
            service_id: resource.is_service ? entityId : null,
            payment_stage_requested: requestedPaymentStage,
            payment_stage_effective: paymentStage,
            expected_amount: totalAmount,
            mp_transaction_amount: mpTransactionAmount,
            mp_metadata_payment_stage: mpMetadataStage || null,
            mp_payment_id: clean(mpData?.id) || null,
          },
        });
        return edgeError({
          error: "Resposta PIX incompatível com a etapa solicitada",
          step: "validate_mp_stage_amount",
          reason_code: "PIX_STAGE_AMOUNT_MISMATCH",
          trace_id: traceId,
          status_code: 409,
          details: {
            payment_stage_requested: requestedPaymentStage,
            payment_stage_effective: paymentStage,
            expected_amount: totalAmount,
            mp_transaction_amount: mpTransactionAmount,
            mp_metadata_payment_stage: mpMetadataStage || null,
            mp_payment_id: clean(mpData?.id) || null,
          },
        });
      }

      return await savePaymentAndBuildResponse({
        admin,
        resource,
        entityId,
        paymentMethod: "pix",
        paymentStage,
        totalAmount,
        platformFee,
        commissionRate,
        driverAmount,
        mpData,
        traceId,
        tokenSource: mpAttempt.token_source,
      });
    }

    if (paymentMethod === "mercado_pago") {
      const customerId = await loadMpCustomerId(admin, resource.client.id_int);
      if (!customerId) {
        return edgeError({
          error: "Cliente Mercado Pago não encontrado para o pagador.",
          step: "load_mp_customer",
          reason_code: "MP_CUSTOMER_NOT_FOUND",
          trace_id: traceId,
          status_code: 400,
          details: {
            client_id_int: resource.client.id_int,
            client_uid: resource.client.uid,
          },
        });
      }

      const walletPayload = {
        ...basePayload,
        payment_method_id: "account_money",
        payer: {
          type: "customer",
          id: customerId,
        },
      };

      const mpAttempt = await createMpPayment(
        walletPayload,
        MP_ACCESS_TOKEN,
        idempotencyKey,
      );
      const mpRes = mpAttempt.res;
      const mpData = mpAttempt.data;

      if (!mpRes.ok) {
        return edgeError({
          error: "Erro MP Wallet",
          step: "mp_wallet_request",
          reason_code: "MP_WALLET_API_ERROR",
          trace_id: traceId,
          status_code: normalizeUpstreamStatus(mpRes.status),
          details: {
            upstream_status: mpRes.status,
            token_source: mpAttempt.token_source,
            mp: mpData,
          },
        });
      }

      return await savePaymentAndBuildResponse({
        admin,
        resource,
        entityId,
        paymentMethod: "mercado_pago",
        paymentStage,
        totalAmount,
        platformFee,
        commissionRate,
        driverAmount,
        mpData,
        traceId,
        tokenSource: mpAttempt.token_source,
      });
    }

    if (paymentMethod === "credit_card") {
      const customerId = await loadMpCustomerId(admin, resource.client.id_int);
      if (!customerId) {
        return edgeError({
          error: "Cliente Mercado Pago não encontrado para o pagador.",
          step: "load_mp_customer",
          reason_code: "MP_CUSTOMER_NOT_FOUND",
          trace_id: traceId,
          status_code: 400,
          details: {
            client_id_int: resource.client.id_int,
            client_uid: resource.client.uid,
          },
        });
      }

      let cardToken = creditCardToken;
      if (!cardToken && resource.client.id_int != null) {
        const { data: methods } = await admin
          .from("user_payment_methods")
          .select("mp_card_id")
          .eq("user_id", resource.client.id_int)
          .eq("is_default", true)
          .maybeSingle();
        cardToken = clean(methods?.mp_card_id);
      }

      if (!cardToken) {
        return edgeError({
          error: "Cartão não encontrado",
          step: "validate_card_token",
          reason_code: "CARD_TOKEN_REQUIRED",
          trace_id: traceId,
          status_code: 400,
          details: {
            client_id_int: resource.client.id_int,
            client_uid: resource.client.uid,
          },
        });
      }

      const cardPayload = {
        ...basePayload,
        token: cardToken,
        installments: 1,
        payer: {
          type: "customer",
          id: customerId,
          email: payerEmail,
        },
      };

      const mpAttempt = await createMpPayment(
        cardPayload,
        MP_ACCESS_TOKEN,
        idempotencyKey,
      );
      const mpRes = mpAttempt.res;
      const mpData = mpAttempt.data;

      if (!mpRes.ok) {
        return edgeError({
          error: "Erro MP Card",
          step: "mp_card_request",
          reason_code: "MP_CARD_API_ERROR",
          trace_id: traceId,
          status_code: normalizeUpstreamStatus(mpRes.status),
          details: {
            upstream_status: mpRes.status,
            token_source: mpAttempt.token_source,
            mp: mpData,
          },
        });
      }

      return await savePaymentAndBuildResponse({
        admin,
        resource,
        entityId,
        paymentMethod: "credit_card",
        paymentStage,
        totalAmount,
        platformFee,
        commissionRate,
        driverAmount,
        mpData,
        traceId,
        tokenSource: "saved",
      });
    }

    return edgeError({
      error: "Método de pagamento inválido",
      step: "validate_payment_method",
      reason_code: "PAYMENT_METHOD_INVALID",
      trace_id: traceId,
      status_code: 400,
      details: { payment_method: paymentMethod },
    });
  } catch (error: any) {
    return edgeError({
      error: error?.message ?? "Falha ao processar pagamento",
      step: "internal_error",
      reason_code: "UNHANDLED_EXCEPTION",
      trace_id: traceId,
      status_code: 500,
    });
  }
});
