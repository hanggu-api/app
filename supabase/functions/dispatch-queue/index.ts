import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DISPATCH_MODE = "round_robin_by_distance";
const PROVIDER_RESPONSE_TIMEOUT_SECONDS = 30;
const MAX_ATTEMPTS_PER_PROVIDER = 3;
const WORKER_RECHECK_SECONDS = 5;
const OFFER_RENOTIFY_GUARD_SECONDS = 35;
const PRESENTATION_ACK_TIMEOUT_SECONDS = 15;
const MAX_BATCH = 10;
const MAX_SKIP_CHAIN_PER_SERVICE = 12;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const supabaseAdmin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("PROJECT_SERVICE_KEY") ??
      Deno.env.get("SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      "",
  ) as any;

type PushOutcome = {
  fcmOk: boolean;
  errorCode: string | null;
  errorType: "permanent" | "transient" | null;
};

type QueueRow = Record<string, unknown>;

function plusSecondsIso(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function enrichDispatchDetails(
  details: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    dispatch_mode: DISPATCH_MODE,
    ...details,
  };
}

async function logService(
  supabase: any,
  serviceId: string,
  action: string,
  details: unknown,
) {
  try {
    await supabase.from("service_logs").insert({
      service_id: serviceId,
      action,
      details: typeof details === "string" ? details : JSON.stringify(details),
      created_at: new Date().toISOString(),
    });
  } catch {
    // ignore logging failures
  }
}

function estimateTravelMinutes(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 3;
  return Math.max(3, Math.ceil(distanceKm * 3));
}

function formatMoney(value: number | null): string | null {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) return null;
  return Number(value).toFixed(2).replace(".", ",");
}

function parsePushOutcome(httpOk: boolean, rawBody: string): PushOutcome {
  let parsed: any = null;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    parsed = null;
  }

  const fcmOk = parsed?.fcm_ok === true ||
    (httpOk && parsed?.result?.fcm_ok === true);
  const errorCode = parsed?.error_code ?? parsed?.result?.error_code ?? null;
  const errorType = parsed?.error_type ?? parsed?.result?.error_type ?? null;

  if (fcmOk) return { fcmOk: true, errorCode: null, errorType: null };
  return {
    fcmOk: false,
    errorCode: typeof errorCode === "string" ? errorCode : null,
    errorType: errorType === "permanent" || errorType === "transient"
      ? errorType
      : "transient",
  };
}

function buildServiceOfferCopy(nextRow: QueueRow): {
  distanceKm: number;
  estimatedMinutes: number;
  providerAmount: string | null;
  serviceName: string;
  title: string;
  bodyLines: string[];
} {
  const distanceKm = Number(nextRow.distance ?? 0) || 0;
  const estimatedMinutes = estimateTravelMinutes(distanceKm);
  const providerAmount = formatMoney(
    Number(nextRow.price_provider ?? nextRow.price_total ?? 0) || 0,
  );
  const serviceName = String(nextRow.service_name ?? "").trim();
  const distanceLabel = `${
    (Math.round(distanceKm * 10) / 10).toFixed(1).replace(".", ",")
  } km`;
  const attemptNo = Number(nextRow.attempt_no ?? 1) || 1;
  const maxAttempts =
    Number(nextRow.max_attempts ?? MAX_ATTEMPTS_PER_PROVIDER) ||
    MAX_ATTEMPTS_PER_PROVIDER;
  const title = serviceName.length > 0
    ? serviceName
    : "Nova oportunidade perto de voce";
  const bodyLines = [
    providerAmount ? `Ganhe R$ ${providerAmount}` : "Nova oferta disponivel",
    `Chegada em ~${estimatedMinutes} min • ${distanceLabel}`,
    `Tentativa ${attemptNo}/${maxAttempts}`,
    "Toque para aceitar agora",
  ];

  return {
    distanceKm,
    estimatedMinutes,
    providerAmount,
    serviceName,
    title,
    bodyLines,
  };
}

function buildServiceOfferPushPayload(
  serviceId: string,
  nextRow: QueueRow,
  copy: ReturnType<typeof buildServiceOfferCopy>,
) {
  const providerUserId = String(nextRow.provider_user_id ?? "").trim();
  const responseDeadlineAt = plusSecondsIso(PROVIDER_RESPONSE_TIMEOUT_SECONDS);
  const offerFingerprint = [
    serviceId,
    providerUserId,
    responseDeadlineAt,
  ].join("|");
  return {
    token: String(nextRow.fcm_token ?? "").trim(),
    title: copy.title,
    body: copy.bodyLines.join("\n"),
    data: {
      type: "service_offer",
      service_id: serviceId,
      serviceId,
      id: serviceId,
      service_name: copy.serviceName,
      price_provider: copy.providerAmount ?? "",
      estimated_minutes: String(copy.estimatedMinutes),
      distance_km: copy.distanceKm.toFixed(1),
      queue_order: String(nextRow.queue_order ?? ""),
      attempt_no: String(nextRow.attempt_no ?? ""),
      max_attempts: String(nextRow.max_attempts ?? MAX_ATTEMPTS_PER_PROVIDER),
      response_timeout_seconds: String(PROVIDER_RESPONSE_TIMEOUT_SECONDS),
      response_deadline_at: responseDeadlineAt,
      provider_user_id: providerUserId,
      correlation_id: crypto.randomUUID(),
      offer_fingerprint: offerFingerprint,
      offer_cycle_key: offerFingerprint,
    },
  };
}

async function sendServiceOfferPush(
  serviceKey: string,
  payload: ReturnType<typeof buildServiceOfferPushPayload>,
) {
  const pushUrl = `${
    Deno.env.get("SUPABASE_URL") ?? ""
  }/functions/v1/push-notifications`;
  const pushResp = await fetch(pushUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify(payload),
  });

  const pushRaw = await pushResp.text();
  const pushOutcome = parsePushOutcome(pushResp.ok, pushRaw);
  return { pushOutcome };
}

async function scheduleQueuePending(
  supabase: any,
  serviceId: string,
  nextRunAt: string,
  nowIso: string,
  attempts?: number,
  lastError?: string | null,
) {
  const update: Record<string, unknown> = {
    status: "pending",
    next_run_at: nextRunAt,
    last_error: lastError ?? null,
    updated_at: nowIso,
  };

  if (attempts !== undefined) {
    update.attempts = attempts;
  }

  await supabase
    .from("service_dispatch_queue")
    .update(update)
    .eq("service_id", serviceId);
}

async function markQueueDone(
  supabase: any,
  serviceId: string,
  nowIso: string,
) {
  await supabase
    .from("service_dispatch_queue")
    .update({
      status: "done",
      next_run_at: nowIso,
      last_error: null,
      updated_at: nowIso,
    })
    .eq("service_id", serviceId);
}

async function loadActivePresentationRows(
  supabase: any,
  serviceId: string,
): Promise<QueueRow[]> {
  const { data } = await supabase
    .from("notificacao_de_servicos")
    .select(
      "id,provider_user_id,last_notified_at,locked_at,queue_order,attempt_no,max_attempts,notification_count",
    )
    .eq("service_id", serviceId)
    .eq("status", "sending")
    .order("last_notified_at", { ascending: false });

  return (data ?? []) as QueueRow[];
}

async function loadActiveNotifiedRows(
  supabase: any,
  serviceId: string,
): Promise<QueueRow[]> {
  const { data } = await supabase
    .from("notificacao_de_servicos")
    .select(
      "id,provider_user_id,response_deadline_at,last_notified_at,queue_order,attempt_no,max_attempts,notification_count",
    )
    .eq("service_id", serviceId)
    .eq("status", "notified")
    .order("last_notified_at", { ascending: false });

  return (data ?? []) as QueueRow[];
}

function presentationAckDeadline(row: QueueRow): Date | null {
  const sentRaw = String(
    row.last_notified_at ?? row.locked_at ?? "",
  ).trim();
  if (!sentRaw) return null;
  const sentMs = Date.parse(sentRaw);
  if (!Number.isFinite(sentMs)) return null;
  return new Date(sentMs + PRESENTATION_ACK_TIMEOUT_SECONDS * 1000);
}

async function advanceStalePresentationRows(
  supabase: any,
  serviceId: string,
  rows: QueueRow[],
): Promise<void> {
  for (const row of rows) {
    const rowId = Number(row.id ?? 0);
    if (!rowId) continue;

    const deadline = presentationAckDeadline(row);
    const expired = deadline == null || deadline.getTime() <= Date.now();
    if (!expired) continue;

    const notificationCount = Number(row.notification_count ?? 0) || 0;
    const maxAttempts = Number(row.max_attempts ?? MAX_ATTEMPTS_PER_PROVIDER) ||
      MAX_ATTEMPTS_PER_PROVIDER;
    const attemptNo = Number(row.attempt_no ?? notificationCount ?? 1) || 1;
    const exhausted = notificationCount >= maxAttempts ||
      attemptNo >= maxAttempts;
    const nextAttemptNo = Math.min(attemptNo + 1, maxAttempts);
    const nowIso = new Date().toISOString();

    const { data: updated } = await supabase
      .from("notificacao_de_servicos")
      .update({
        status: exhausted ? "timeout_exhausted" : "retry_ready",
        answered_at: nowIso,
        skip_reason: "presentation_timeout",
        push_status: "presentation_timeout",
        response_deadline_at: null,
        attempt_no: exhausted ? attemptNo : nextAttemptNo,
        ciclo_atual: exhausted ? attemptNo : nextAttemptNo,
        locked_at: null,
        locked_by_run: null,
      })
      .eq("id", rowId)
      .eq("status", "sending")
      .select(
        "provider_user_id,queue_order,attempt_no,max_attempts,notification_count",
      )
      .maybeSingle();

    if (updated == null) continue;

    await logService(
      supabase,
      serviceId,
      "QUEUE_PRESENTATION_TIMEOUT_ADVANCE",
      enrichDispatchDetails({
        provider_user_id: Number(updated.provider_user_id ?? 0) || null,
        queue_order: Number(updated.queue_order ?? 0) || null,
        attempt_no: Number(updated.attempt_no ?? 0) || null,
        max_attempts: Number(updated.max_attempts ?? 0) || null,
        exhausted,
        ack_timeout_seconds: PRESENTATION_ACK_TIMEOUT_SECONDS,
      }),
    );
  }
}

async function expireActiveRows(
  supabase: any,
  serviceId: string,
  rows: QueueRow[],
): Promise<void> {
  for (const row of rows) {
    const rowId = Number(row.id ?? 0);
    if (!rowId) continue;
    const deadlineRaw = String(row.response_deadline_at ?? "").trim();
    const deadlineMs = Date.parse(deadlineRaw);
    const expired = !deadlineRaw ||
      (Number.isFinite(deadlineMs) && deadlineMs <= Date.now());
    if (!expired) continue;

    const notificationCount = Number(row.notification_count ?? 0) || 0;
    const maxAttempts = Number(row.max_attempts ?? MAX_ATTEMPTS_PER_PROVIDER) ||
      MAX_ATTEMPTS_PER_PROVIDER;
    const attemptNo = Number(
      row.attempt_no ?? notificationCount ?? 1,
    ) || 1;
    const exhausted = notificationCount >= maxAttempts ||
      attemptNo >= maxAttempts;
    const nextAttemptNo = Math.min(attemptNo + 1, maxAttempts);
    const nowIso = new Date().toISOString();

    const { data: updated } = await supabase
      .from("notificacao_de_servicos")
      .update({
        status: exhausted ? "timeout_exhausted" : "retry_ready",
        answered_at: nowIso,
        skip_reason: "offer_timeout",
        push_status: "timeout",
        response_deadline_at: null,
        attempt_no: exhausted ? attemptNo : nextAttemptNo,
        ciclo_atual: exhausted ? attemptNo : nextAttemptNo,
      })
      .eq("id", rowId)
      .eq("status", "notified")
      .select(
        "provider_user_id,queue_order,attempt_no,max_attempts,notification_count",
      )
      .maybeSingle();

    if (updated == null) continue;

    await logService(
      supabase,
      serviceId,
      "QUEUE_TIMEOUT_ADVANCE",
      enrichDispatchDetails({
        provider_user_id: Number(updated.provider_user_id ?? 0) || null,
        queue_order: Number(updated.queue_order ?? 0) || null,
        attempt_no: Number(updated.attempt_no ?? 0) || null,
        max_attempts: Number(updated.max_attempts ?? 0) || null,
        exhausted,
      }),
    );
  }
}

function pickActivePresentationRow(rows: QueueRow[]): QueueRow | null {
  return rows.find((row) => {
    const deadline = presentationAckDeadline(row);
    return deadline == null || deadline.getTime() > Date.now();
  }) ?? null;
}

function pickActiveNotifiedRow(rows: QueueRow[]): QueueRow | null {
  const now = Date.now();
  return rows.find((row) => {
    const deadlineRaw = String(row.response_deadline_at ?? "").trim();
    if (!deadlineRaw) return true;
    const deadlineMs = Date.parse(deadlineRaw);
    return !Number.isFinite(deadlineMs) || deadlineMs > now;
  }) ?? null;
}

async function loadNextEligibleRow(
  supabase: any,
  serviceId: string,
): Promise<QueueRow | null> {
  const { data } = await supabase
    .from("notificacao_de_servicos")
    .select(
      "id,provider_user_id,fcm_token,queue_order,attempt_no,max_attempts,notification_count,distance,price_provider,price_total,service_name",
    )
    .eq("service_id", serviceId)
    .in("status", ["queued", "retry_ready"])
    .order("attempt_no", { ascending: true })
    .order("queue_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data ?? null) as QueueRow | null;
}

async function refreshLateOnlineCandidates(
  serviceKey: string,
  serviceId: string,
): Promise<number> {
  const dispatchUrl = `${
    Deno.env.get("SUPABASE_URL") ?? ""
  }/functions/v1/dispatch`;
  const response = await fetch(dispatchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify({
      serviceId,
      action: "refresh_queue",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `dispatch_refresh_failed:${response.status}:${await response.text()}`,
    );
  }

  const payload = await response.json().catch(() => ({}));
  return Number(payload?.queued ?? 0) || 0;
}

async function finalizeAsOpenForSchedule(
  supabase: any,
  serviceId: string,
  nowIso: string,
) {
  await supabase
    .from("service_requests")
    .update({
      status: "open_for_schedule",
      status_updated_at: nowIso,
    })
    .eq("id", serviceId)
    .is("provider_id", null)
    .in("status", ["searching", "searching_provider", "open_for_schedule"]);

  await logService(
    supabase,
    serviceId,
    "OPEN_FOR_SCHEDULE",
    enrichDispatchDetails({
      reason: "all_attempts_exhausted",
      max_attempts_per_provider: MAX_ATTEMPTS_PER_PROVIDER,
    }),
  );

  await markQueueDone(supabase, serviceId, nowIso);
}

function isQueueEligibleService(service: any): boolean {
  const status = String(service?.status ?? "").toLowerCase().trim();
  const paymentStatus = String(
    service?.payment_status ?? service?.payment_remaining_status ?? "",
  ).toLowerCase().trim();
  const statusEligible = [
    "pending",
    "searching",
    "open_for_schedule",
    "searching_provider",
  ].includes(status);
  const paidByStatusOnly = status === "searching_provider";
  const paymentEligible = paidByStatusOnly ||
    ["paid", "partially_paid", "paid_manual"].includes(paymentStatus);
  return Boolean(
    service && service.provider_id == null && statusEligible && paymentEligible,
  );
}

async function loadCanonicalServiceForQueue(
  supabase: any,
  serviceId: string,
): Promise<any | null> {
  const primary = await supabase
    .from("service_requests")
    .select("id,status,payment_remaining_status,provider_id")
    .eq("id", serviceId)
    .maybeSingle();
  return primary?.data ?? null;
}

async function processNextRow(
  supabase: any,
  serviceId: string,
  serviceKey: string,
  row: QueueRow,
  nowIso: string,
): Promise<"sent" | "skipped"> {
  const rowId = Number(row.id ?? 0);
  const providerUserId = Number(row.provider_user_id ?? 0);
  const tokenValue = String(row.fcm_token ?? "").trim();
  const copy = buildServiceOfferCopy(row);
  const attemptNo = Number(row.attempt_no ?? 1) || 1;
  const lockId = crypto.randomUUID();

  // DB has unique guard for one active offer row per service.
  const { data: blockingNotifiedRows } = await supabase
    .from("notificacao_de_servicos")
    .select("id,provider_user_id,status,last_notified_at,response_deadline_at")
    .eq("service_id", serviceId)
    .in("status", ["sending", "notified"])
    .neq("id", rowId)
    .limit(1);
  if ((blockingNotifiedRows ?? []).isNotEmpty) {
    const blocking = (blockingNotifiedRows ?? [])[0] ?? {};
    await logService(
      supabase,
      serviceId,
      "PROVIDER_NOTIFY_BLOCKED_ACTIVE_NOTIFIED",
      enrichDispatchDetails({
        provider_user_id: providerUserId,
        queue_order: Number(row.queue_order ?? 0) || null,
        blocking_notified_id: Number(blocking.id ?? 0) || null,
        blocking_provider_user_id: Number(blocking.provider_user_id ?? 0) ||
          null,
        blocking_status: String(blocking.status ?? "") || null,
        blocking_last_notified_at: String(
          blocking.last_notified_at ?? "",
        ) || null,
        blocking_response_deadline_at: String(
          blocking.response_deadline_at ?? "",
        ) || null,
      }),
    );
    return "skipped";
  }

  // Strong server-side dedupe guard:
  // if this provider already received a recent offer for the same service,
  // skip re-send even if row persistence got stale in a prior cycle.
  const recentThresholdIso = new Date(
    Date.now() - OFFER_RENOTIFY_GUARD_SECONDS * 1000,
  ).toISOString();
  const { data: recentRows } = await supabase
    .from("notificacao_de_servicos")
    .select("id,status,last_notified_at,response_deadline_at")
    .eq("service_id", serviceId)
    .eq("provider_user_id", providerUserId)
    .in("status", ["notified", "accepted", "queued", "retry_ready", "sending"])
    .gte("last_notified_at", recentThresholdIso)
    .order("last_notified_at", { ascending: false })
    .limit(1);
  if ((recentRows ?? []).length > 0) {
    await logService(
      supabase,
      serviceId,
      "PROVIDER_NOTIFY_SKIPPED_DUPLICATE_GUARD",
      enrichDispatchDetails({
        provider_user_id: providerUserId,
        queue_order: Number(row.queue_order ?? 0) || null,
        attempt_no: attemptNo,
        reason: "recent_last_notified_at_guard",
        guard_seconds: OFFER_RENOTIFY_GUARD_SECONDS,
      }),
    );
    return "skipped";
  }

  const { data: claimedRows, error: claimErr } = await supabase
    .from("notificacao_de_servicos")
    .update({
      status: "sending",
      last_notified_at: nowIso,
      response_deadline_at: null,
      notification_count: attemptNo,
      push_status: "push_sending",
      push_error_code: null,
      push_error_type: null,
      locked_at: nowIso,
      locked_by_run: lockId,
      ciclo_atual: attemptNo,
    })
    .eq("id", rowId)
    .eq("service_id", serviceId)
    .eq("provider_user_id", providerUserId)
    .in("status", ["queued", "retry_ready"])
    .select("id");

  if (claimErr || (claimedRows ?? []).length === 0) {
    await logService(
      supabase,
      serviceId,
      "PROVIDER_NOTIFY_STATE_PERSIST_FAILED",
      enrichDispatchDetails({
        provider_user_id: providerUserId,
        queue_order: Number(row.queue_order ?? 0) || null,
        attempt_no: attemptNo,
        max_attempts: Number(row.max_attempts ?? MAX_ATTEMPTS_PER_PROVIDER) ||
          MAX_ATTEMPTS_PER_PROVIDER,
        reason: "presentation_claim_failed",
        update_error: claimErr ? String(claimErr.message ?? claimErr) : null,
      }),
    );
    return "skipped";
  }

  if (!tokenValue) {
    await supabase
      .from("notificacao_de_servicos")
      .update({
        status: "skipped_permanent_push",
        answered_at: nowIso,
        skip_reason: "missing_fcm_token",
        push_status: "undeliverable",
        push_error_code: "missing_fcm_token",
        push_error_type: "permanent",
        locked_at: null,
        locked_by_run: null,
      })
      .eq("id", rowId)
      .eq("status", "sending")
      .eq("locked_by_run", lockId);

    await logService(
      supabase,
      serviceId,
      "PROVIDER_SKIPPED_UNDELIVERABLE",
      enrichDispatchDetails({
        provider_user_id: providerUserId,
        queue_order: Number(row.queue_order ?? 0) || null,
        attempt_no: attemptNo,
        max_attempts: Number(row.max_attempts ?? 0) || null,
        reason: "missing_fcm_token",
      }),
    );
    return "skipped";
  }

  const pushPayload = buildServiceOfferPushPayload(serviceId, row, copy);
  const { pushOutcome } = await sendServiceOfferPush(serviceKey, pushPayload);

  if (pushOutcome.errorType === "permanent") {
    await supabase
      .from("notificacao_de_servicos")
      .update({
        status: "skipped_permanent_push",
        answered_at: nowIso,
        skip_reason: "permanent_push_failure",
        push_status: "undeliverable",
        push_error_code: pushOutcome.errorCode ?? "permanent_push_failure",
        push_error_type: "permanent",
        locked_at: null,
        locked_by_run: null,
      })
      .eq("id", rowId)
      .eq("status", "sending")
      .eq("locked_by_run", lockId);

    await logService(
      supabase,
      serviceId,
      "PROVIDER_SKIPPED_UNDELIVERABLE",
      enrichDispatchDetails({
        provider_user_id: providerUserId,
        queue_order: Number(row.queue_order ?? 0) || null,
        attempt_no: attemptNo,
        max_attempts: Number(row.max_attempts ?? 0) || null,
        reason: "permanent_push_failure",
        error_code: pushOutcome.errorCode,
      }),
    );
    return "skipped";
  }

  if (!pushOutcome.fcmOk) {
    await supabase
      .from("notificacao_de_servicos")
      .update({
        status: "retry_ready",
        push_status: "transient_push_failure",
        push_error_code: pushOutcome.errorCode ?? "transient_push_failure",
        push_error_type: "transient",
        locked_at: null,
        locked_by_run: null,
      })
      .eq("id", rowId)
      .eq("status", "sending")
      .eq("locked_by_run", lockId);

    await logService(
      supabase,
      serviceId,
      "PROVIDER_NOTIFIED_TRANSIENT_PUSH",
      enrichDispatchDetails({
        provider_user_id: providerUserId,
        queue_order: Number(row.queue_order ?? 0) || null,
        attempt_no: attemptNo,
        max_attempts: Number(row.max_attempts ?? MAX_ATTEMPTS_PER_PROVIDER) ||
          MAX_ATTEMPTS_PER_PROVIDER,
        error_code: pushOutcome.errorCode,
      }),
    );
    return "skipped";
  }

  await supabase
    .from("notificacao_de_servicos")
    .update({
      push_status: "sent",
      push_error_code: null,
      push_error_type: null,
    })
    .eq("id", rowId)
    .eq("status", "sending")
    .eq("locked_by_run", lockId);

  await logService(
    supabase,
    serviceId,
    "PROVIDER_PRESENTATION_WAITING",
    enrichDispatchDetails({
      provider_user_id: providerUserId,
      queue_order: Number(row.queue_order ?? 0) || null,
      attempt_no: attemptNo,
      max_attempts: Number(row.max_attempts ?? MAX_ATTEMPTS_PER_PROVIDER) ||
        MAX_ATTEMPTS_PER_PROVIDER,
      presentation_deadline_at: plusSecondsIso(
        PRESENTATION_ACK_TIMEOUT_SECONDS,
      ),
      distance_km: copy.distanceKm,
      ack_timeout_seconds: PRESENTATION_ACK_TIMEOUT_SECONDS,
    }),
  );

  return "sent";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const headerSecret = req.headers.get("x-cron-secret") || "";
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const serviceKey = Deno.env.get("PROJECT_SERVICE_KEY") ??
    Deno.env.get("SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    "";

  const okByCronSecret = cronSecret.length > 0 && headerSecret === cronSecret;
  const okByServiceRole = Boolean(token && serviceKey && token === serviceKey);

  if (!okByCronSecret && !okByServiceRole) {
    return json(
      {
        error: "Unauthorized",
        hint:
          "Send header x-cron-secret matching CRON_SECRET (recommended) or Authorization: Bearer <service_role_key>.",
      },
      401,
    );
  }

  const supabase = supabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data: candidates, error: candErr } = await supabase
    .from("service_dispatch_queue")
    .select("service_id, attempts")
    .in("status", ["pending", "error"])
    .lte("next_run_at", nowIso)
    .order("next_run_at", { ascending: true })
    .limit(MAX_BATCH);

  if (candErr) {
    return json({ error: "Failed to read queue", details: candErr }, 500);
  }

  const candidateIds = ((candidates ?? []) as Array<{ service_id: string }>)
    .map((item) => item.service_id)
    .filter(Boolean);
  if (candidateIds.length === 0) {
    return json({ ok: true, processed: 0 });
  }

  const { data: locked, error: lockErr } = await supabase
    .from("service_dispatch_queue")
    .update({ status: "running", updated_at: nowIso })
    .in("service_id", candidateIds)
    .in("status", ["pending", "error"])
    .lte("next_run_at", nowIso)
    .select("service_id, attempts");

  if (lockErr) {
    return json({ error: "Failed to lock queue", details: lockErr }, 500);
  }

  const items = (locked ?? []) as Array<
    { service_id: string; attempts: number }
  >;
  let processed = 0;

  for (const item of items) {
    const serviceId = item.service_id;
    const nextAttempts = Number(item.attempts ?? 0) + 1;

    try {
      const service = await loadCanonicalServiceForQueue(supabase, serviceId);
      const eligible = isQueueEligibleService(service);

      if (!eligible) {
        await markQueueDone(supabase, serviceId, nowIso);
        await logService(
          supabase,
          serviceId,
          "QUEUE_DONE",
          enrichDispatchDetails({
            reason: "not_eligible",
            status: service?.status ?? null,
            payment_status: service?.payment_status ??
              service?.payment_remaining_status ??
              null,
            provider_id: service?.provider_id ?? null,
          }),
        );
        processed++;
        continue;
      }

      const { data: acceptedRows } = await supabase
        .from("notificacao_de_servicos")
        .select("id,provider_user_id")
        .eq("service_id", serviceId)
        .eq("status", "accepted")
        .limit(1);

      if ((acceptedRows ?? []).length > 0) {
        await markQueueDone(supabase, serviceId, nowIso);
        await logService(
          supabase,
          serviceId,
          "QUEUE_DONE",
          enrichDispatchDetails({
            reason: "provider_accepted",
            provider_user_id: acceptedRows?.[0]?.provider_user_id ?? null,
          }),
        );
        processed++;
        continue;
      }

      const activePresentationRows = await loadActivePresentationRows(
        supabase,
        serviceId,
      );
      await advanceStalePresentationRows(
        supabase,
        serviceId,
        activePresentationRows,
      );
      const refreshedPresentationRows = await loadActivePresentationRows(
        supabase,
        serviceId,
      );
      const activePresentation = pickActivePresentationRow(
        refreshedPresentationRows,
      );

      if (activePresentation) {
        const deadline = presentationAckDeadline(activePresentation);
        const remainingSec = deadline != null
          ? Math.max(1, Math.ceil((deadline.getTime() - Date.now()) / 1000))
          : WORKER_RECHECK_SECONDS;
        const nextRunAt = plusSecondsIso(
          Math.min(WORKER_RECHECK_SECONDS, remainingSec),
        );
        await scheduleQueuePending(
          supabase,
          serviceId,
          nextRunAt,
          nowIso,
          nextAttempts,
          null,
        );
        processed++;
        continue;
      }

      const activeRows = await loadActiveNotifiedRows(supabase, serviceId);
      await expireActiveRows(supabase, serviceId, activeRows);
      const refreshedActiveRows = await loadActiveNotifiedRows(
        supabase,
        serviceId,
      );
      const activeNotified = pickActiveNotifiedRow(refreshedActiveRows);

      if (activeNotified) {
        const deadline = Date.parse(
          String(activeNotified.response_deadline_at ?? ""),
        );
        const remainingSec = Number.isFinite(deadline)
          ? Math.max(1, Math.ceil((deadline - Date.now()) / 1000))
          : WORKER_RECHECK_SECONDS;
        const nextRunAt = plusSecondsIso(
          Math.min(WORKER_RECHECK_SECONDS, remainingSec),
        );
        await scheduleQueuePending(
          supabase,
          serviceId,
          nextRunAt,
          nowIso,
          nextAttempts,
          null,
        );
        processed++;
        continue;
      }

      let sent = false;
      let chainSkips = 0;

      while (!sent && chainSkips < MAX_SKIP_CHAIN_PER_SERVICE) {
        const nextRow = await loadNextEligibleRow(supabase, serviceId);
        if (nextRow == null) break;

        const outcome = await processNextRow(
          supabase,
          serviceId,
          serviceKey,
          nextRow,
          nowIso,
        );
        if (outcome === "sent") {
          sent = true;
          break;
        }
        chainSkips += 1;
      }

      if (sent) {
        await scheduleQueuePending(
          supabase,
          serviceId,
          plusSecondsIso(WORKER_RECHECK_SECONDS),
          nowIso,
          nextAttempts,
          null,
        );
        processed++;
        continue;
      }

      const nextEligible = await loadNextEligibleRow(supabase, serviceId);
      if (nextEligible == null) {
        const refreshedQueued = await refreshLateOnlineCandidates(
          serviceKey,
          serviceId,
        );

        if (refreshedQueued > 0) {
          await logService(
            supabase,
            serviceId,
            "QUEUE_REFRESHED_LATE_ONLINE_PROVIDERS",
            enrichDispatchDetails({
              queued_count: refreshedQueued,
              reason: "no_eligible_rows_before_finalize",
            }),
          );
          await scheduleQueuePending(
            supabase,
            serviceId,
            plusSecondsIso(5),
            nowIso,
            nextAttempts,
            null,
          );
        } else {
          await finalizeAsOpenForSchedule(supabase, serviceId, nowIso);
        }
      } else {
        await scheduleQueuePending(
          supabase,
          serviceId,
          plusSecondsIso(5),
          nowIso,
          nextAttempts,
          null,
        );
      }
      processed++;
    } catch (e) {
      await supabase
        .from("service_dispatch_queue")
        .update({
          status: "error",
          next_run_at: plusSecondsIso(WORKER_RECHECK_SECONDS),
          attempts: nextAttempts,
          last_error: String(e),
          updated_at: new Date().toISOString(),
        })
        .eq("service_id", serviceId);

      await logService(
        supabase,
        serviceId,
        "QUEUE_WORKER_ERROR",
        enrichDispatchDetails({ error: String(e) }),
      );
    }
  }

  return json({
    ok: true,
    processed,
    dispatch_mode: DISPATCH_MODE,
    timeout_seconds: PROVIDER_RESPONSE_TIMEOUT_SECONDS,
    max_attempts_per_provider: MAX_ATTEMPTS_PER_PROVIDER,
  });
});
