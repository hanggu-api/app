import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DISPATCH_MODE = "round_robin_by_distance";
const SEARCH_RADIUS_KM = 50;
const MAX_ATTEMPTS_PER_PROVIDER = 3;
const ONLINE_WINDOW_MINUTES = 15;
const NOTIF_TABLE_CANDIDATES = [
  "registro_de_notificações",
  "registro_de_notificacoes",
  "notificacao_de_servicos",
];
const DISPATCH_QUEUE_TABLE_CANDIDATES = [
  "service_dispatch_queue",
  "fila_de_despacho_de_servico",
];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const supabaseAdmin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("PROJECT_SERVICE_KEY") ??
      "",
  ) as any;

type DispatchServiceRecord = Record<string, unknown>;
type DispatchCandidateProvider = Record<string, unknown>;
type DispatchDiagnostic = {
  profession_id: number | null;
  provider_professions_count: number;
  users_found_count: number;
  with_location_count: number;
  blocked_offline_stale_count: number;
  blocked_no_fcm_count: number;
  blocked_invalid_coords_count: number;
  blocked_out_of_radius_count: number;
  eligible_count: number;
  mapped_uid_count: number;
  already_existing_count: number;
  inserted_count: number;
};

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthKm * c;
}

function enrichDispatchDetails(
  details: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    dispatch_mode: DISPATCH_MODE,
    ...details,
  };
}

function isRecentIso(
  raw: unknown,
  windowMinutes = ONLINE_WINDOW_MINUTES,
): boolean {
  const iso = String(raw ?? "").trim();
  if (!iso) return false;
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return false;
  const ageMs = Date.now() - ts;
  return ageMs >= 0 && ageMs <= windowMinutes * 60 * 1000;
}

async function logEvent(
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

async function resolveNotifTable(supabase: any): Promise<string> {
  for (const table of NOTIF_TABLE_CANDIDATES) {
    const probe = await supabase.from(table).select("id").limit(1);
    if (!probe.error) return table;
  }
  return "notificacao_de_servicos";
}

async function resolveDispatchQueueTable(supabase: any): Promise<string> {
  for (const table of DISPATCH_QUEUE_TABLE_CANDIDATES) {
    const probe = await supabase.from(table).select("id").limit(1);
    if (!probe.error) return table;
  }
  return "service_dispatch_queue";
}

async function upsertDispatchQueue(
  supabase: any,
  serviceId: string,
) {
  const dispatchQueueTable = await resolveDispatchQueueTable(supabase);
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from(dispatchQueueTable)
    .upsert(
      {
        service_id: serviceId,
        status: "pending",
        next_run_at: nowIso,
        attempts: 0,
        last_error: null,
        updated_at: nowIso,
      },
      { onConflict: "service_id" },
    );

  if (error) {
    console.warn("[dispatch] queue upsert failed", { serviceId, error });
  }
}

function isPaidStatus(paymentStatus: string): boolean {
  return ["paid", "partially_paid", "paid_manual"].includes(paymentStatus);
}

function isDispatchEligible(service: DispatchServiceRecord): boolean {
  const status = String(service.status ?? "").toLowerCase().trim();
  const paymentStatus = String(service.payment_status ?? "").toLowerCase()
    .trim();
  const statusEligible = [
    "pending",
    "searching",
    "open_for_schedule",
    "searching_provider",
  ].includes(status);
  const paidByStatusOnly = status === "searching_provider";
  return service.provider_id == null &&
    statusEligible &&
    (paidByStatusOnly || isPaidStatus(paymentStatus));
}

async function loadDispatchService(
  supabase: any,
  serviceId: string,
): Promise<
  { service: DispatchServiceRecord | null; diagnostic: Record<string, unknown> }
> {
  const diagnostic: Record<string, unknown> = {
    service_id: serviceId,
    source: null,
    service_requests_error: null,
    task_catalog_error: null,
  };

  const legacy = await supabase
    .from("service_requests")
    .select(
      "id,status,provider_id,task_id,category_id,profession,latitude,longitude,description,price_estimated",
    )
    .eq("id", serviceId)
    .maybeSingle();

  if (legacy.error) {
    diagnostic.service_requests_error = String(
      legacy.error.message ?? JSON.stringify(legacy.error),
    );
    console.warn("[dispatch] service_requests lookup failed", {
      serviceId,
      error: legacy.error,
    });
    return { service: null, diagnostic };
  }
  if (!legacy.data) {
    diagnostic.service_requests_error = "not_found";
    return { service: null, diagnostic };
  }
  let resolvedProfessionId: number | null = null;
  const taskId = Number(legacy.data.task_id ?? 0);
  if (Number.isFinite(taskId) && taskId > 0) {
    const taskLookup = await supabase
      .from("task_catalog")
      .select("profession_id")
      .eq("id", taskId)
      .maybeSingle();
    if (taskLookup.error) {
      diagnostic.task_catalog_error = String(
        taskLookup.error.message ?? JSON.stringify(taskLookup.error),
      );
    }
    const profFromTask = Number(taskLookup.data?.profession_id ?? 0);
    if (Number.isFinite(profFromTask) && profFromTask > 0) {
      resolvedProfessionId = profFromTask;
    }
  }

  diagnostic.source = "service_requests";
  return {
    service: {
      ...legacy.data,
      profession_id: resolvedProfessionId,
      payment_status: "paid",
    } as DispatchServiceRecord,
    diagnostic,
  };
}

async function loadNearbyProviders(
  supabase: any,
  serviceId: string,
  lat: number,
  lon: number,
  professionId: number | null,
): Promise<{
  rows: DispatchCandidateProvider[];
  counters: Pick<
    DispatchDiagnostic,
    | "blocked_offline_stale_count"
    | "blocked_no_fcm_count"
    | "blocked_invalid_coords_count"
    | "blocked_out_of_radius_count"
  >;
}> {
  const counters = {
    blocked_offline_stale_count: 0,
    blocked_no_fcm_count: 0,
    blocked_invalid_coords_count: 0,
    blocked_out_of_radius_count: 0,
  };
  if (professionId == null) {
    await logEvent(supabase, serviceId, "DISPATCH_PROFESSION_ID_MISSING", {
      service_id: serviceId,
    });
    return { rows: [], counters };
  }

  const pp = await supabase
    .from("provider_professions")
    .select("provider_user_id,provider_uid")
    .eq("profession_id", professionId);

  if (pp.error) {
    await logEvent(
      supabase,
      serviceId,
      "DISPATCH_PROVIDER_PROFESSION_QUERY_ERROR",
      {
        error: pp.error,
        profession_id: professionId,
      },
    );
    return { rows: [], counters };
  }

  const providerUserIds = ((pp.data ?? []) as Array<Record<string, unknown>>)
    .map((r) => Number(r.provider_user_id ?? 0))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (providerUserIds.length === 0) return { rows: [], counters };

  const usersRes = await supabase
    .from("users")
    .select("id,supabase_uid,fcm_token,is_online,updated_at")
    .in("id", providerUserIds);

  if (usersRes.error) {
    await logEvent(supabase, serviceId, "DISPATCH_PROVIDER_USERS_QUERY_ERROR", {
      error: usersRes.error,
      profession_id: professionId,
    });
    return { rows: [], counters };
  }

  const locRes = await supabase
    .from("provider_locations")
    .select("provider_id,provider_uid,latitude,longitude,updated_at")
    .in("provider_id", providerUserIds);

  const driverLocRes = await supabase
    .from("driver_locations")
    .select("driver_id,latitude,longitude,updated_at")
    .in("driver_id", providerUserIds);

  if (locRes.error && driverLocRes.error) {
    await logEvent(
      supabase,
      serviceId,
      "DISPATCH_PROVIDER_LOCATIONS_QUERY_ERROR",
      {
        provider_locations_error: locRes.error,
        driver_locations_error: driverLocRes.error,
        profession_id: professionId,
      },
    );
    return { rows: [], counters };
  }

  const usersById = new Map<number, Record<string, unknown>>();
  for (const user of (usersRes.data ?? []) as Array<Record<string, unknown>>) {
    const id = Number(user.id ?? 0);
    if (id > 0) usersById.set(id, user);
  }

  const bestLocByProvider = new Map<number, Record<string, unknown>>();
  for (const loc of (locRes.data ?? []) as Array<Record<string, unknown>>) {
    const providerId = Number(loc.provider_id ?? 0);
    if (!providerId) continue;
    const prev = bestLocByProvider.get(providerId);
    if (!prev) {
      bestLocByProvider.set(providerId, loc);
      continue;
    }
    const prevTime = new Date(String(prev.updated_at ?? 0)).getTime();
    const curTime = new Date(String(loc.updated_at ?? 0)).getTime();
    if (curTime >= prevTime) bestLocByProvider.set(providerId, loc);
  }

  for (
    const loc of (driverLocRes.data ?? []) as Array<Record<string, unknown>>
  ) {
    const providerId = Number(loc.driver_id ?? 0);
    if (!providerId) continue;
    const normalized = {
      provider_id: providerId,
      provider_uid: null,
      latitude: loc.latitude,
      longitude: loc.longitude,
      updated_at: loc.updated_at,
    } as Record<string, unknown>;
    const prev = bestLocByProvider.get(providerId);
    if (!prev) {
      bestLocByProvider.set(providerId, normalized);
      continue;
    }
    const prevTime = new Date(String(prev.updated_at ?? 0)).getTime();
    const curTime = new Date(String(normalized.updated_at ?? 0)).getTime();
    if (curTime >= prevTime) bestLocByProvider.set(providerId, normalized);
  }

  const rows: DispatchCandidateProvider[] = [];
  for (const providerId of providerUserIds) {
    const user = usersById.get(providerId);
    const loc = bestLocByProvider.get(providerId);
    if (!user || !loc) continue;

    const isOnlineFlag = Boolean(user.is_online === true);
    const hasRecentLoc = isRecentIso(loc.updated_at);
    const hasRecentUserPing = isRecentIso(user.updated_at);
    if (!isOnlineFlag && !hasRecentLoc && !hasRecentUserPing) {
      counters.blocked_offline_stale_count += 1;
      continue;
    }

    const fcmToken = String(user.fcm_token ?? "").trim();
    if (!fcmToken) {
      counters.blocked_no_fcm_count += 1;
      continue;
    }

    const pLat = Number(loc.latitude ?? 0);
    const pLon = Number(loc.longitude ?? 0);
    if (!Number.isFinite(pLat) || !Number.isFinite(pLon)) {
      counters.blocked_invalid_coords_count += 1;
      continue;
    }

    const distanceKm = haversineKm(lat, lon, pLat, pLon);
    if (distanceKm > SEARCH_RADIUS_KM) {
      counters.blocked_out_of_radius_count += 1;
      continue;
    }

    rows.push({
      id: String(user.supabase_uid ?? loc.provider_uid ?? "").trim(),
      fcm_token: fcmToken,
      distance_km: distanceKm,
      provider_user_id: providerId,
      latitude: pLat,
      longitude: pLon,
    });
  }

  rows.sort((a, b) =>
    Number(a.distance_km ?? 999999) - Number(b.distance_km ?? 999999)
  );
  return { rows, counters };
}

async function loadProviderUserIdMap(
  supabase: any,
  providerRows: DispatchCandidateProvider[],
): Promise<Map<string, number>> {
  const providerUidList = providerRows
    .map((p) => String(p.id ?? "").trim())
    .filter((v) => v.length > 0);

  const providerUserIdByUid = new Map<string, number>();
  if (providerUidList.length === 0) return providerUserIdByUid;

  const { data, error } = await supabase
    .from("users")
    .select("id,supabase_uid")
    .in("supabase_uid", providerUidList);

  if (error) {
    console.warn("[dispatch] failed to map provider uid -> user id", error);
    return providerUserIdByUid;
  }

  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const uid = String(row.supabase_uid ?? "").trim();
    const idNum = Number(row.id ?? 0);
    if (uid && Number.isFinite(idNum) && idNum > 0) {
      providerUserIdByUid.set(uid, idNum);
    }
  }

  return providerUserIdByUid;
}

async function loadExistingProviderIds(
  supabase: any,
  notifTable: string,
  serviceId: string,
): Promise<Set<number>> {
  const { data } = await supabase
    .from(notifTable)
    .select("provider_user_id")
    .eq("service_id", serviceId);

  return new Set(
    ((data ?? []) as Array<Record<string, unknown>>)
      .map((row) => Number(row.provider_user_id ?? 0))
      .filter((id) => Number.isFinite(id) && id > 0),
  );
}

async function loadMaxQueueOrder(
  supabase: any,
  notifTable: string,
  serviceId: string,
): Promise<number> {
  const { data } = await supabase
    .from(notifTable)
    .select("queue_order")
    .eq("service_id", serviceId)
    .order("queue_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  return Number(data?.queue_order ?? 0) || 0;
}

function buildDispatchQueueRow(
  serviceId: string,
  serviceName: string,
  provider: DispatchCandidateProvider,
  providerUserId: number,
  professionId: number | null,
  priceTotal: number,
  priceProvider: number | null,
  commissionRate: number,
  lat: number,
  lon: number,
  queueOrder: number,
) {
  return {
    service_id: serviceId,
    provider_user_id: providerUserId,
    fcm_token: (provider.fcm_token as string | null)?.trim() || null,
    status: "queued",
    last_notified_at: null,
    response_deadline_at: null,
    answered_at: null,
    skip_reason: null,
    service_name: serviceName,
    profession_id: professionId,
    price_total: priceTotal > 0 ? priceTotal : null,
    price_provider: priceProvider,
    commission_rate: commissionRate,
    distance: Number(provider.distance_km ?? 0) || null,
    service_latitude: lat,
    service_longitude: lon,
    provider_latitude: null,
    provider_longitude: null,
    notification_count: 0,
    queue_order: queueOrder,
    ciclo_atual: 1,
    attempt_no: 1,
    max_attempts: MAX_ATTEMPTS_PER_PROVIDER,
    push_status: null,
    push_error_code: null,
    push_error_type: null,
    locked_at: null,
    locked_by_run: null,
  };
}

async function materializeQueue(
  supabase: any,
  service: DispatchServiceRecord,
  options: { reason?: string; logAction?: string } = {},
): Promise<{ queuedCount: number; diagnostic: DispatchDiagnostic }> {
  const notifTable = await resolveNotifTable(supabase);
  const serviceId = String(service.id ?? "");
  const lat = Number(service.latitude ?? 0);
  const lon = Number(service.longitude ?? 0);
  const professionId = Number(service.profession_id ?? 0) || null;

  const diagnostic: DispatchDiagnostic = {
    profession_id: professionId,
    provider_professions_count: 0,
    users_found_count: 0,
    with_location_count: 0,
    blocked_offline_stale_count: 0,
    blocked_no_fcm_count: 0,
    blocked_invalid_coords_count: 0,
    blocked_out_of_radius_count: 0,
    eligible_count: 0,
    mapped_uid_count: 0,
    already_existing_count: 0,
    inserted_count: 0,
  };

  if (!serviceId || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    await logEvent(supabase, serviceId, "DISPATCH_INVALID_COORDS", {
      service_id: serviceId,
      latitude: lat,
      longitude: lon,
    });
    return { queuedCount: 0, diagnostic };
  }

  const ppRes = await supabase
    .from("provider_professions")
    .select("provider_user_id", { count: "exact", head: true })
    .eq("profession_id", professionId);
  diagnostic.provider_professions_count = Number(ppRes.count ?? 0);

  const providerUserIdsRes = await supabase
    .from("provider_professions")
    .select("provider_user_id")
    .eq("profession_id", professionId);
  const providerUserIds =
    ((providerUserIdsRes.data ?? []) as Array<Record<string, unknown>>)
      .map((r) => Number(r.provider_user_id ?? 0))
      .filter((id) => Number.isFinite(id) && id > 0);

  if (providerUserIds.length > 0) {
    const usersCountRes = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .in("id", providerUserIds);
    diagnostic.users_found_count = Number(usersCountRes.count ?? 0);

    const locCountRes = await supabase
      .from("provider_locations")
      .select("provider_id", { count: "exact", head: true })
      .in("provider_id", providerUserIds);
    diagnostic.with_location_count = Number(locCountRes.count ?? 0);
  }

  const nearby = await loadNearbyProviders(
    supabase,
    serviceId,
    lat,
    lon,
    professionId,
  );
  diagnostic.blocked_offline_stale_count =
    nearby.counters.blocked_offline_stale_count;
  diagnostic.blocked_no_fcm_count = nearby.counters.blocked_no_fcm_count;
  diagnostic.blocked_invalid_coords_count =
    nearby.counters.blocked_invalid_coords_count;
  diagnostic.blocked_out_of_radius_count =
    nearby.counters.blocked_out_of_radius_count;
  const providerRows = nearby.rows;

  if (providerRows.length === 0) {
    await logEvent(supabase, serviceId, "PROVIDER_NOT_FOUND", {
      ...enrichDispatchDetails({
        service_id: serviceId,
        radius_km: SEARCH_RADIUS_KM,
        reason: "no_providers_in_radius",
        diagnostic,
      }),
    });
    return { queuedCount: 0, diagnostic };
  }
  diagnostic.eligible_count = providerRows.length;

  const providerUserIdByUid = await loadProviderUserIdMap(
    supabase,
    providerRows,
  );
  diagnostic.mapped_uid_count = providerUserIdByUid.size;
  const existingProviderIds = await loadExistingProviderIds(
    supabase,
    notifTable,
    serviceId,
  );
  diagnostic.already_existing_count = existingProviderIds.size;
  let queueOrder = await loadMaxQueueOrder(supabase, notifTable, serviceId);

  const serviceName =
    String(service.description ?? service.profession ?? "Serviço").trim() ||
    "Serviço";
  const priceTotal =
    Number(service.price_estimated ?? service.total_price ?? 0) || 0;
  const commissionRate = 0.15;
  const priceProvider = priceTotal > 0
    ? Number((priceTotal * (1 - commissionRate)).toFixed(2))
    : null;

  let queuedCount = 0;

  for (const provider of providerRows) {
    const providerUid = String(provider.id ?? "").trim();
    if (!providerUid) continue;
    const providerUserId = providerUserIdByUid.get(providerUid);
    if (!providerUserId) continue;
    if (existingProviderIds.has(providerUserId)) continue;

    queueOrder += 1;
    const row = buildDispatchQueueRow(
      serviceId,
      serviceName,
      provider,
      providerUserId,
      professionId,
      priceTotal,
      priceProvider,
      commissionRate,
      lat,
      lon,
      queueOrder,
    );

    const { error } = await supabase
      .from(notifTable)
      .insert(row);

    if (error) {
      console.warn("[dispatch] notificacao_de_servicos insert failed", {
        serviceId,
        providerUserId,
        error,
      });
      queueOrder -= 1;
      continue;
    }

    existingProviderIds.add(providerUserId);
    queuedCount += 1;
  }
  diagnostic.inserted_count = queuedCount;

  await logEvent(
    supabase,
    serviceId,
    options.logAction ?? "DISPATCH_QUEUE_MATERIALIZED",
    {
      ...enrichDispatchDetails({
        service_id: serviceId,
        radius_km: SEARCH_RADIUS_KM,
        queued_count: queuedCount,
        max_attempts_per_provider: MAX_ATTEMPTS_PER_PROVIDER,
        reason: options.reason ?? "start_dispatch",
      }),
    },
  );

  return { queuedCount, diagnostic };
}

async function markServiceSearching(
  supabase: any,
  serviceId: string,
  existingStartedAt: unknown,
) {
  await supabase
    .from("service_requests")
    .update({ status: "searching_provider" })
    .eq("id", serviceId)
    .is("provider_id", null);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const headerSecret = req.headers.get("x-cron-secret") || "";
  const authHeader = req.headers.get("authorization") || "";
  const apiKeyHeader = req.headers.get("apikey") || "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim();
  const serviceKey = Deno.env.get("PROJECT_SERVICE_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    "";
  const okByCronSecret = cronSecret.length > 0 && headerSecret === cronSecret;
  const okByServiceRole = Boolean(
    serviceKey && (token === serviceKey || apiKeyHeader === serviceKey),
  );

  if (!okByCronSecret && !okByServiceRole) {
    return json(
      {
        error: "Unauthorized",
        hint:
          "Send header x-cron-secret matching CRON_SECRET or Authorization/apikey with the service role key.",
        debug: {
          has_cron_secret: cronSecret.length > 0,
          has_project_service_key: Boolean(
            Deno.env.get("PROJECT_SERVICE_KEY")?.trim(),
          ),
          has_supabase_service_role_key: Boolean(
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim(),
          ),
          token_prefix: token.slice(0, 8),
          apikey_prefix: apiKeyHeader.slice(0, 8),
        },
      },
      401,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const serviceId = String(body.serviceId ?? "").trim();
  const action = String(body.action ?? "start_dispatch").trim().toLowerCase();
  if (!serviceId) return json({ error: "serviceId é obrigatório" }, 400);

  const supabase = supabaseAdmin();
  const loaded = await loadDispatchService(supabase, serviceId);
  const service = loaded.service;
  if (service == null) {
    await logEvent(
      supabase,
      serviceId,
      "DISPATCH_SERVICE_LOOKUP_FAILED",
      loaded.diagnostic,
    );
    return json({
      error: "Serviço não encontrado",
      serviceId,
      diagnostic: loaded.diagnostic,
    }, 404);
  }

  if (action === "next_round") {
    await upsertDispatchQueue(supabase, serviceId);
    await logEvent(supabase, serviceId, "DISPATCH_WAKEUP_REQUESTED", {
      ...enrichDispatchDetails({ service_id: serviceId }),
    });
    return json({ success: true, action, queued: true });
  }

  if (!isDispatchEligible(service)) {
    await logEvent(supabase, serviceId, "DISPATCH_SKIPPED_NOT_ELIGIBLE", {
      service_id: serviceId,
      status: service.status,
      payment_status: service.payment_status,
      provider_id: service.provider_id,
    });
    return json({ success: true, skipped: true, reason: "not_eligible" });
  }

  if (action === "refresh_queue") {
    const { queuedCount: queued, diagnostic } = await materializeQueue(
      supabase,
      service,
      {
        reason: "late_online_provider_refresh",
        logAction: "DISPATCH_QUEUE_REFRESHED",
      },
    );
    if (queued > 0) {
      await upsertDispatchQueue(supabase, serviceId);
    }
    return json({
      success: true,
      action,
      dispatch_mode: DISPATCH_MODE,
      radius_km: SEARCH_RADIUS_KM,
      max_attempts_per_provider: MAX_ATTEMPTS_PER_PROVIDER,
      queued,
      diagnostic,
    });
  }

  await markServiceSearching(supabase, serviceId, service.dispatch_started_at);
  await logEvent(supabase, serviceId, "DISPATCH_STARTED", {
    ...enrichDispatchDetails({
      service_id: serviceId,
      radius_km: SEARCH_RADIUS_KM,
      max_attempts_per_provider: MAX_ATTEMPTS_PER_PROVIDER,
    }),
  });

  const { queuedCount: queued, diagnostic } = await materializeQueue(
    supabase,
    service,
    {
      reason: "start_dispatch",
    },
  );
  await upsertDispatchQueue(supabase, serviceId);

  return json({
    success: true,
    dispatch_mode: DISPATCH_MODE,
    radius_km: SEARCH_RADIUS_KM,
    max_attempts_per_provider: MAX_ATTEMPTS_PER_PROVIDER,
    queued,
    diagnostic,
  });
});
