import {
  corsHeaders,
  getAuthenticatedUser,
  json,
  supabaseAdmin,
} from "../_shared/auth.ts";
import { enforcePublicAbuseGuard } from "../_shared/public-security.ts";

type JsonMap = Record<string, unknown>;

function normalizePt(input: string): string {
  return input
    .toLowerCase()
    .replace(/[áàâãä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i")
    .replace(/[óòôõö]/g, "o")
    .replace(/[úùûü]/g, "u")
    .replace(/ç/g, "c")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP_WORDS = new Set([
  "eu",
  "quero",
  "preciso",
  "de",
  "um",
  "uma",
  "para",
  "com",
  "no",
  "na",
  "do",
  "da",
  "a",
  "o",
  "os",
  "as",
  "e",
  "ta",
  "esta",
  "meu",
  "minha",
  "seu",
  "sua",
]);

function tokens(s: string): string[] {
  return normalizePt(s)
    .split(" ")
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

function expandSynonyms(query: string): string {
  let out = normalizePt(query);
  out = out.replace(/\bpenu\b/g, "pneu");
  out = out.replace(/\braizes\b/g, "raiz");
  out = out.replace(/\b(corta|cortar)\b/g, "corte barbear");
  out = out.replace(/\b(pintar)\b/g, "pintura coloracao");
  out = out.replace(/\b(lava|lavar)\b/g, "lavagem limpeza");
  out = out.replace(/\b(fura|furar|furei)\b/g, "furo pneu borracheiro");
  out = out.replace(
    /\b(concerta|concertar|conserta|consertar)\b/g,
    "reparo manutencao conserto",
  );
  out = out.replace(/\b(limpa|limpar)\b/g, "limpeza faxina");
  out = out.replace(/\b(copia|copiaa|copiar)\b/g, "copia chave duplicar");
  out = out.replace(/\b(chave|chaves)\b/g, "chave chaveiro fechadura");
  return out;
}

function jaccardTokens(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  const inter = [...sa].filter((x) => sb.has(x)).length;
  const uni = new Set([...sa, ...sb]).size;
  return uni === 0 ? 0 : inter / uni;
}

function trigrams(s: string): Set<string> {
  const n = normalizePt(s);
  if (n.length < 3) return new Set([n]);
  const out = new Set<string>();
  for (let i = 0; i <= n.length - 3; i++) out.add(n.slice(i, i + 3));
  return out;
}

function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (!ta.size || !tb.size) return 0;
  const inter = [...ta].filter((x) => tb.has(x)).length;
  const uni = new Set([...ta, ...tb]).size;
  return uni === 0 ? 0 : inter / uni;
}

function scoreTask(
  task: JsonMap,
  queryNorm: string,
  qTokens: string[],
): number {
  const name = `${task["name"] ?? ""}`;
  const keywords = `${task["keywords"] ?? ""}`;
  const prof = `${task["profession_name"] ?? ""}`;

  const nameNorm = normalizePt(name);
  const kwNorm = normalizePt(keywords);
  const profNorm = normalizePt(prof);

  let score = 0;
  if (nameNorm === queryNorm) score += 5.0;
  if (nameNorm.startsWith(queryNorm)) score += 3.0;
  if (nameNorm.includes(queryNorm)) score += 1.5;

  score += 2.0 * jaccardTokens(qTokens, tokens(nameNorm));
  score += 1.0 * jaccardTokens(qTokens, tokens(kwNorm));
  score += 0.4 * jaccardTokens(qTokens, tokens(profNorm));
  score += 1.2 * trigramSimilarity(queryNorm, nameNorm);
  score += 0.5 * trigramSimilarity(queryNorm, kwNorm);

  return score;
}

function stripApiPrefix(pathname: string): string {
  const candidates = ["/api/v1", "/api"];
  let current = pathname;
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of candidates) {
      if (current === prefix) {
        current = "/";
        changed = true;
        break;
      }
      if (current.startsWith(`${prefix}/`)) {
        current = current.slice(prefix.length);
        changed = true;
        break;
      }
    }
  }
  return current;
}

function ok(data: unknown) {
  return json({ data }, 200);
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value);
}

function newUuidV4(): string {
  return crypto.randomUUID();
}

function extractMissingColumnFromPostgrestMessage(
  message: string,
): string | null {
  const patterns = [
    /Could not find the '([^']+)' column/i,
    /column\s+["']?([a-zA-Z0-9_]+)["']?\s+does not exist/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(message ?? "");
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function generateSixDigitCode(): string {
  const value = Math.floor(Math.random() * 900000) + 100000;
  return String(value);
}

function optionalTrimmedString(
  body: JsonMap,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    if (!(key in body)) continue;
    return `${body[key] ?? ""}`.trim();
  }
  return undefined;
}

function getEnv(name: string): string {
  return (Deno.env.get(name) ?? "").trim();
}

const NOTIF_TABLE_CANDIDATES = [
  "registro_de_notificações",
  "registro_de_notificacoes",
  "notificacao_de_servicos",
];
const DISPATCH_QUEUE_TABLE_CANDIDATES = [
  "service_dispatch_queue",
  "fila_de_despacho_de_servico",
];

async function resolveNotifTable(
  admin: ReturnType<typeof supabaseAdmin>,
): Promise<string> {
  for (const table of NOTIF_TABLE_CANDIDATES) {
    const probe = await admin.from(table).select("id").limit(1);
    if (!probe.error) return table;
  }
  return "notificacao_de_servicos";
}

async function resolveDispatchQueueTable(
  admin: ReturnType<typeof supabaseAdmin>,
): Promise<string> {
  for (const table of DISPATCH_QUEUE_TABLE_CANDIDATES) {
    const probe = await admin.from(table).select("id").limit(1);
    if (!probe.error) return table;
  }
  return "service_dispatch_queue";
}

interface DispatchStaleTtls {
  queueTtlSeconds: number;
  offerTtlSeconds: number;
}

interface DispatchActivitySnapshot {
  activeQueueRows: JsonMap[];
  activeNotifRows: JsonMap[];
  staleQueueRows: JsonMap[];
  staleNotifRows: JsonMap[];
}

function toFiniteNumber(raw: unknown): number | null {
  const n = Number(raw ?? NaN);
  return Number.isFinite(n) ? n : null;
}

function ageSecondsFromNow(isoLike: unknown): number | null {
  const text = `${isoLike ?? ""}`.trim();
  if (!text) return null;
  const ts = Date.parse(text);
  if (!Number.isFinite(ts)) return null;
  return Math.max(0, (Date.now() - ts) / 1000);
}

function configValueToBool(raw: unknown): boolean | null {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw !== 0;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (["true", "1", "yes", "sim", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "nao", "não", "off"].includes(normalized)) {
      return false;
    }
  }
  if (raw && typeof raw === "object") {
    const maybeMap = raw as JsonMap;
    if ("value" in maybeMap) {
      return configValueToBool(maybeMap["value"]);
    }
  }
  return null;
}

function parseIsoDateSafe(raw: unknown): Date | null {
  const text = `${raw ?? ""}`.trim();
  if (!text) return null;
  const ts = Date.parse(text);
  if (!Number.isFinite(ts)) return null;
  return new Date(ts);
}

function buildRegisterSessionExpiry(minutes = 5): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

async function readProviderRegistrationFlags(
  admin: ReturnType<typeof supabaseAdmin>,
): Promise<{ fixedEnabled: boolean; mobileEnabled: boolean }> {
  const defaults = {
    fixedEnabled: true,
    mobileEnabled: true,
  };
  try {
    const { data } = await admin
      .from("app_configs")
      .select("key,value,is_active")
      .in("key", [
        "provider.fixed.registration.enabled",
        "provider.mobile.registration.enabled",
      ]);
    const rows = (data ?? []) as JsonMap[];
    let fixedEnabled = defaults.fixedEnabled;
    let mobileEnabled = defaults.mobileEnabled;
    for (const row of rows) {
      if (row["is_active"] === false) continue;
      const key = `${row["key"] ?? ""}`.trim();
      const parsed = configValueToBool(row["value"]);
      if (parsed == null) continue;
      if (key === "provider.fixed.registration.enabled") fixedEnabled = parsed;
      if (key === "provider.mobile.registration.enabled") {
        mobileEnabled = parsed;
      }
    }
    return { fixedEnabled, mobileEnabled };
  } catch {
    return defaults;
  }
}

async function readDispatchStaleTtls(
  admin: ReturnType<typeof supabaseAdmin>,
): Promise<DispatchStaleTtls> {
  const defaults: DispatchStaleTtls = {
    queueTtlSeconds: 300,
    offerTtlSeconds: 120,
  };
  try {
    const { data } = await admin
      .from("app_configs")
      .select("key,value")
      .in("key", [
        "dispatch_queue_stale_ttl_seconds",
        "dispatch_offer_stale_ttl_seconds",
        "dispatch_notify_timeout_seconds",
      ]);
    const rows = (data ?? []) as JsonMap[];
    const byKey = new Map<string, string>();
    for (const row of rows) {
      byKey.set(`${row["key"] ?? ""}`.trim(), `${row["value"] ?? ""}`.trim());
    }
    const queueTtl =
      toFiniteNumber(byKey.get("dispatch_queue_stale_ttl_seconds")) ??
        defaults.queueTtlSeconds;
    const offerTtl =
      toFiniteNumber(byKey.get("dispatch_offer_stale_ttl_seconds")) ??
        toFiniteNumber(byKey.get("dispatch_notify_timeout_seconds")) ??
        defaults.offerTtlSeconds;
    return {
      queueTtlSeconds: Math.max(30, Math.floor(queueTtl)),
      offerTtlSeconds: Math.max(30, Math.floor(offerTtl)),
    };
  } catch {
    return defaults;
  }
}

function isQueueRowActive(row: JsonMap, ttls: DispatchStaleTtls): boolean {
  const status = `${row["status"] ?? ""}`.toLowerCase().trim();
  if (!["pending", "running", "error"].includes(status)) return false;
  const age = ageSecondsFromNow(
    row["updated_at"] ?? row["next_run_at"] ?? row["created_at"],
  );
  if (age == null) return true;
  return age <= ttls.queueTtlSeconds;
}

function isNotifRowActive(row: JsonMap, ttls: DispatchStaleTtls): boolean {
  const status = `${row["status"] ?? ""}`.toLowerCase().trim();
  if (
    ![
      "queued",
      "retry_ready",
      "sending",
      "notified",
      "accepted",
      "sent",
      "pending",
    ]
      .includes(status)
  ) {
    return false;
  }
  const deadlineAge = ageSecondsFromNow(row["response_deadline_at"]);
  if (deadlineAge != null && deadlineAge <= 0) return true;
  const notifiedAge = ageSecondsFromNow(
    row["last_notified_at"] ?? row["updated_at"] ?? row["created_at"],
  );
  if (notifiedAge == null) return true;
  return notifiedAge <= ttls.offerTtlSeconds;
}

async function evaluateDispatchActivity(
  admin: ReturnType<typeof supabaseAdmin>,
  notifTable: string,
  serviceIds: string[],
): Promise<DispatchActivitySnapshot> {
  if (serviceIds.length === 0) {
    return {
      activeQueueRows: [],
      activeNotifRows: [],
      staleQueueRows: [],
      staleNotifRows: [],
    };
  }
  const dispatchQueueTable = await resolveDispatchQueueTable(admin);
  const ttls = await readDispatchStaleTtls(admin);
  const [{ data: queueRows }, { data: notifRows }] = await Promise.all([
    admin
      .from(dispatchQueueTable)
      .select("id,service_id,status,next_run_at,attempts,updated_at,created_at")
      .in("service_id", serviceIds)
      .in("status", ["pending", "running", "error"]),
    admin
      .from(notifTable)
      .select(
        "id,service_id,provider_user_id,status,response_deadline_at,last_notified_at,updated_at,created_at",
      )
      .in("service_id", serviceIds)
      .in("status", [
        "queued",
        "retry_ready",
        "sending",
        "notified",
        "accepted",
        "sent",
        "pending",
      ]),
  ]);
  const queue = (queueRows ?? []) as JsonMap[];
  const notif = (notifRows ?? []) as JsonMap[];
  const activeQueueRows = queue.filter((row) => isQueueRowActive(row, ttls));
  const activeNotifRows = notif.filter((row) => isNotifRowActive(row, ttls));
  return {
    activeQueueRows,
    activeNotifRows,
    staleQueueRows: queue.filter((row) => !isQueueRowActive(row, ttls)),
    staleNotifRows: notif.filter((row) => !isNotifRowActive(row, ttls)),
  };
}

async function syncAgendamentoStatus(
  admin: ReturnType<typeof supabaseAdmin>,
  serviceId: string,
  status: string,
  extra: JsonMap = {},
): Promise<void> {
  const nowIso = new Date().toISOString();
  try {
    await admin
      .from("agendamento_servico")
      .update({
        status,
        updated_at: nowIso,
        ...extra,
      })
      .eq("id", serviceId);
  } catch (e) {
    console.error(`[sync/agendamento] Failed for ${serviceId}:`, e);
  }
}

async function processServicePayout(
  admin: ReturnType<typeof supabaseAdmin>,
  serviceId: string,
): Promise<void> {
  try {
    const { data: service, error: sErr } = await admin
      .from("service_requests")
      .select("id, provider_id, price_estimated, status")
      .eq("id", serviceId)
      .maybeSingle();

    if (sErr || !service || service.status !== "completed") return;

    const providerId = service.provider_id;
    if (!providerId) return;

    const { data: existing } = await admin
      .from("wallet_transactions")
      .select("id")
      .eq("service_id", serviceId)
      .eq("user_id", providerId)
      .eq("type", "credit")
      .maybeSingle();

    if (existing) return;

    const price = Number(service.price_estimated ?? 0);
    const providerAmount = Math.round(price * 0.85 * 100) / 100;
    if (providerAmount <= 0) return;

    const [{ data: pData }, { data: uData }] = await Promise.all([
      admin.from("providers").select("wallet_balance").eq("user_id", providerId)
        .maybeSingle(),
      admin.from("users").select("wallet_balance").eq("id", providerId)
        .maybeSingle(),
    ]);

    await Promise.all([
      admin
        .from("providers")
        .update({
          wallet_balance: Number(pData?.wallet_balance ?? 0) + providerAmount,
        })
        .eq("user_id", providerId),
      admin
        .from("users")
        .update({
          wallet_balance: Number(uData?.wallet_balance ?? 0) + providerAmount,
        })
        .eq("id", providerId),
      admin.from("wallet_transactions").insert({
        user_id: providerId,
        service_id: serviceId,
        amount: providerAmount,
        type: "credit",
        description: `Crédito automático pelo serviço #${
          serviceId.slice(0, 8)
        }`,
      }),
    ]);

    console.log(
      `[payout] Credited ${providerAmount} to provider ${providerId} for ${serviceId}`,
    );
  } catch (e) {
    console.error(`[payout] Error for ${serviceId}:`, e);
  }
}

async function autoHealStaleDispatchRows(
  admin: ReturnType<typeof supabaseAdmin>,
  notifTable: string,
  snapshot: DispatchActivitySnapshot,
): Promise<void> {
  const dispatchQueueTable = await resolveDispatchQueueTable(admin);
  const nowIso = new Date().toISOString();
  const staleQueueIds = snapshot.staleQueueRows
    .map((row) => `${row["id"] ?? ""}`.trim())
    .filter((id) => id.length > 0);
  const staleNotifIds = snapshot.staleNotifRows
    .map((row) => `${row["id"] ?? ""}`.trim())
    .filter((id) => id.length > 0);
  if (staleQueueIds.length > 0) {
    await admin
      .from(dispatchQueueTable)
      .update({ status: "done", updated_at: nowIso })
      .in("id", staleQueueIds);
  }
  if (staleNotifIds.length > 0) {
    await admin
      .from(notifTable)
      .update({
        status: "timeout_exhausted",
        answered_at: nowIso,
        skip_reason: "stale_housekeeping",
      })
      .in("id", staleNotifIds);
  }
}

function extractServiceIdFromPayment(payload: JsonMap): string {
  const direct = `${payload["external_reference"] ?? ""}`.trim();
  if (direct) return direct;

  const metadata = payload["metadata"];
  if (metadata && typeof metadata === "object") {
    const md = metadata as JsonMap;
    const serviceId = `${md["service_id"] ?? md["serviceId"] ?? ""}`.trim();
    if (serviceId) return serviceId;
  }
  return "";
}

async function resolveServiceIdFromLedger(
  admin: ReturnType<typeof supabaseAdmin>,
  paymentIdRaw: string,
): Promise<string> {
  const { data } = await admin
    .from("payments")
    .select("service_id, metadata")
    .or(
      `external_payment_id.eq.${paymentIdRaw},mp_payment_id.eq.${paymentIdRaw}`,
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const direct = `${data?.service_id ?? ""}`.trim();
  if (direct) return direct;
  const metadata = data?.metadata as JsonMap | null;
  const fromMeta = `${metadata?.["canonical_service_id"] ?? ""}`.trim();
  return fromMeta;
}

function mapMpStatusToLocalPaymentStatus(mpStatus: string): string {
  const s = mpStatus.toLowerCase().trim();
  if (s === "approved") return "paid";
  if (s === "pending" || s === "in_process" || s === "authorized") {
    return "pending";
  }
  if (
    s === "cancelled" || s === "rejected" || s === "refunded" ||
    s === "charged_back"
  ) return "cancelled";
  return "pending";
}

function toNonNegativeInt(raw: unknown): number {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function buildScheduleNegotiationState(service: JsonMap) {
  const clientRounds = toNonNegativeInt(service["schedule_client_rounds"]);
  const providerRounds = toNonNegativeInt(service["schedule_provider_rounds"]);
  const totalRounds = toNonNegativeInt(service["schedule_round"]);
  return {
    clientRounds,
    providerRounds,
    totalRounds,
    remainingClientRounds: Math.max(0, 5 - clientRounds),
    remainingProviderRounds: Math.max(0, 5 - providerRounds),
    remainingTotalRounds: Math.max(0, 10 - totalRounds),
  };
}

async function serviceIdExistsInServiceRequestsNew(
  admin: ReturnType<typeof supabaseAdmin>,
  serviceId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("service_requests")
    .select("id")
    .eq("id", serviceId)
    .maybeSingle();
  return Boolean(data?.id);
}

function notFound(path: string) {
  return json(
    {
      error: "route_not_found",
      message: `API route not found: ${path}`,
      statusCode: 404,
    },
    404,
  );
}

async function logServiceEvent(
  admin: ReturnType<typeof supabaseAdmin>,
  serviceId: string,
  action: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    await admin.from("service_logs").insert({
      service_id: serviceId,
      action,
      details: JSON.stringify(details),
      created_at: new Date().toISOString(),
    });
  } catch {
    // best effort only
  }
}

async function triggerDispatchForSearchingProviderService(
  admin: ReturnType<typeof supabaseAdmin>,
  serviceId: string,
): Promise<Record<string, unknown>> {
  const retriggerCooldownSeconds = Math.max(
    10,
    toFiniteNumber(getEnv("DISPATCH_RETRIGGER_COOLDOWN_SECONDS")) ?? 45,
  );
  const recentTriggerActions = [
    "DISPATCH_TRIGGER_REQUESTED",
    "DISPATCH_STARTED",
    "PROVIDER_NOTIFIED",
    "PROVIDER_NOTIFIED_TRANSIENT_PUSH",
  ];
  const cooldownThresholdIso = new Date(
    Date.now() - retriggerCooldownSeconds * 1000,
  ).toISOString();
  const { data: recentTriggerRows } = await admin
    .from("service_logs")
    .select("action,created_at")
    .eq("service_id", serviceId)
    .in("action", recentTriggerActions)
    .gte("created_at", cooldownThresholdIso)
    .order("created_at", { ascending: false })
    .limit(1);
  if ((recentTriggerRows ?? []).length > 0) {
    const latest = recentTriggerRows?.[0] as Record<string, unknown> | null;
    await logServiceEvent(admin, serviceId, "DISPATCH_TRIGGER_SKIPPED", {
      reason: "cooldown_recent_trigger_activity",
      cooldown_seconds: retriggerCooldownSeconds,
      last_action: latest?.["action"] ?? null,
      last_created_at: latest?.["created_at"] ?? null,
    });
    return {
      triggered: false,
      reason: "cooldown_recent_trigger_activity",
      cooldownSeconds: retriggerCooldownSeconds,
      lastAction: latest?.["action"] ?? null,
      lastCreatedAt: latest?.["created_at"] ?? null,
    };
  }

  const dispatchUrl = `${getEnv("SUPABASE_URL")}/functions/v1/dispatch`;
  const serviceKey = getEnv("PROJECT_SERVICE_KEY") ||
    getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!dispatchUrl || !serviceKey) {
    await logServiceEvent(admin, serviceId, "DISPATCH_TRIGGER_SKIPPED", {
      reason: "missing_supabase_env",
      has_supabase_url: Boolean(dispatchUrl),
      has_service_role_key: Boolean(getEnv("SUPABASE_SERVICE_ROLE_KEY")),
      has_project_service_key: Boolean(getEnv("PROJECT_SERVICE_KEY")),
    });
    return { triggered: false, reason: "missing_supabase_env" };
  }

  const notifTable = await resolveNotifTable(admin);
  const snapshot = await evaluateDispatchActivity(admin, notifTable, [
    serviceId,
  ]);
  if (
    snapshot.staleQueueRows.length > 0 || snapshot.staleNotifRows.length > 0
  ) {
    await autoHealStaleDispatchRows(admin, notifTable, snapshot);
    await logServiceEvent(admin, serviceId, "DISPATCH_AUTO_HEAL_STALE", {
      stale_queue_rows: snapshot.staleQueueRows.length,
      stale_notif_rows: snapshot.staleNotifRows.length,
      source: "trigger_dispatch_for_searching_provider_service",
    });
  }
  if (
    snapshot.activeQueueRows.length > 0 || snapshot.activeNotifRows.length > 0
  ) {
    await logServiceEvent(admin, serviceId, "DISPATCH_TRIGGER_SKIPPED", {
      reason: "already_active",
      queue_rows: snapshot.activeQueueRows.length,
      notif_rows: snapshot.activeNotifRows.length,
    });
    return {
      triggered: false,
      reason: "already_active",
      queueRows: snapshot.activeQueueRows.length,
      notifRows: snapshot.activeNotifRows.length,
    };
  }

  await logServiceEvent(admin, serviceId, "DISPATCH_TRIGGER_REQUESTED", {
    reason: "service_created_or_updated_searching_provider",
  });

  const dispatchRes = await fetch(dispatchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify({
      serviceId,
      action: "start_dispatch",
      reason: "service_created_searching_provider",
    }),
  });
  const dispatchBody = await dispatchRes.json().catch(() => null);
  return {
    triggered: dispatchRes.ok,
    status: dispatchRes.status,
    body: dispatchBody,
  };
}

async function resolveNumericUserId(
  admin: ReturnType<typeof supabaseAdmin>,
  appUser: any,
): Promise<number | null> {
  const direct = Number(appUser?.id ?? 0);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const supabaseUid = `${appUser?.supabaseUid ?? ""}`.trim();
  if (!supabaseUid) return null;

  const { data } = await admin
    .from("users")
    .select("id")
    .eq("supabase_uid", supabaseUid)
    .maybeSingle();
  const mapped = Number(data?.id ?? 0);
  if (Number.isFinite(mapped) && mapped > 0) return mapped;
  return null;
}

const ACTIVE_SERVICE_STATUSES = new Set([
  "waiting_payment",
  "pending_payment",
  "awaiting_payment",
  "waiting_remaining_payment",
  "waiting_payment_remaining",
  "open_for_schedule",
  "aguardando_resposta",
  "awaiting_provider_response",
  "searching",
  "search_provider",
  "waiting_provider",
  "searching_provider",
  "provider_assigned",
  "accepted",
  "scheduled",
  "provider_near",
  "arrived",
  "in_progress",
  "completion_requested",
  "awaiting_confirmation",
  "waiting_confirmation",
  "waiting_client_confirmation",
  "contested",
  "schedule_proposed",
]);

function normalizeStatus(value: unknown): string {
  return `${value ?? ""}`.toLowerCase().trim();
}

function isTerminalServiceStatus(value: unknown): boolean {
  const status = normalizeStatus(value);
  return [
    "completed",
    "cancelled",
    "canceled",
    "concluido",
    "cancelado",
    "refunded",
    "expired",
    "closed",
    "deleted",
    "finished",
  ].includes(status);
}

function buildClientWaitingUi(
  service: JsonMap | null,
): { headline: string; subtitle: string } | null {
  if (!service) return null;
  const status = normalizeStatus(service["status"]);
  const description = `${
    service["description"] ?? service["profession"] ?? "Serviço"
  }`
    .trim();
  const priceRaw = Number(
    service["price_estimated"] ?? service["price"] ?? NaN,
  );
  const hasPrice = Number.isFinite(priceRaw);
  const priceLabel = hasPrice
    ? `R$ ${priceRaw.toFixed(2).replace(".", ",")}`
    : "";

  if (
    [
      "open_for_schedule",
      "aguardando_resposta",
      "awaiting_provider_response",
    ].includes(status)
  ) {
    return {
      headline: "Serviço aguardando resposta de prestadores",
      subtitle:
        "Acompanhe respostas para agendamento ou cancele a solicitação quando quiser.",
    };
  }
  if (
    ["searching_provider", "search_provider", "waiting_provider", "searching"]
      .includes(status)
  ) {
    return {
      headline: "Buscando prestadores disponíveis",
      subtitle:
        "Estamos consultando os prestadores elegíveis por proximidade e disponibilidade.",
    };
  }
  if (status === "schedule_proposed") {
    const when = `${service["scheduled_at"] ?? ""}`.trim();
    return {
      headline: "Proposta de agendamento recebida",
      subtitle: when
        ? `O prestador propôs horário. Revise e decida no acompanhamento do serviço.`
        : "O prestador enviou proposta. Revise e decida no acompanhamento do serviço.",
    };
  }
  if (
    status === "waiting_remaining_payment" ||
    status === "waiting_payment_remaining"
  ) {
    return {
      headline: "Prestador chegou ao local!",
      subtitle:
        "Por favor, realize o pagamento restante para liberar o início do serviço.",
    };
  }
  if (description || priceLabel) {
    return {
      headline: description || "Serviço ativo",
      subtitle: priceLabel
        ? `Valor estimado: ${priceLabel}`
        : "Acompanhe os detalhes do serviço.",
    };
  }
  return null;
}

function formatSchedulePushDate(dateIso: string): string {
  const parsed = new Date(`${dateIso ?? ""}`.trim());
  if (Number.isNaN(parsed.getTime())) return "horario a definir";
  return parsed.toLocaleString("pt-BR", {
    timeZone: "America/Araguaina",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).replace(",", " as");
}

function buildSchedulePushLabel(service: JsonMap | null): string {
  if (!service) return "Servico";
  const description = `${service["description"] ?? ""}`.trim();
  if (description) return description;
  const profession = `${service["profession"] ?? ""}`.trim();
  if (profession) return profession;
  return "Servico";
}

async function pushUserNotification(
  userId: number,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (!Number.isFinite(userId) || userId <= 0) return;

  const baseUrl = getEnv("SUPABASE_URL") || getEnv("PROJECT_URL");
  const serviceKey = getEnv("PROJECT_SERVICE_KEY") ||
    getEnv("SERVICE_ROLE_KEY") ||
    getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!baseUrl || !serviceKey) return;

  try {
    await fetch(`${baseUrl}/functions/v1/push-notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
      },
      body: JSON.stringify({
        user_id: userId,
        title,
        body,
        data: {
          ...data,
          type: "schedule_proposal",
        },
      }),
    });
  } catch (error) {
    console.error("[api/push] Failed to notify user:", error);
  }
}

function extractEffectiveCompletionCode(service: JsonMap): string {
  const candidates = [
    "completion_code",
    "verification_code",
    "proof_code",
    "validation_code",
  ];
  for (const key of candidates) {
    const value = `${service[key] ?? ""}`.trim();
    if (value) return value;
  }
  return "";
}

async function fetchLatestActiveServiceForUser(
  admin: ReturnType<typeof getAuthenticatedUser> extends Promise<infer R>
    ? R extends { admin: infer A } ? A
    : never
    : never,
  userId: number,
): Promise<JsonMap | null> {
  const { data, error } = await admin
    .from("service_requests")
    .select("*")
    .eq("client_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return null;
  const rows = (data ?? []) as JsonMap[];
  for (const row of rows) {
    const status = `${row["status"] ?? ""}`.toLowerCase().trim();
    if (ACTIVE_SERVICE_STATUSES.has(status)) {
      return row;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  console.log(`[API][${req.method}] ${req.url}`);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = stripApiPrefix(url.pathname);

  // Webhook público do Mercado Pago: não exige JWT de usuário.
  if (
    (req.method === "POST" || req.method === "GET") &&
    path === "/payments/webhook/mercadopago"
  ) {
    const admin = supabaseAdmin();
    const traceId = req.headers.get("x-trace-id") || crypto.randomUUID();
    const body = req.method === "POST"
      ? await req.json().catch(() => ({} as JsonMap))
      : ({} as JsonMap);
    const data = body["data"];
    const paymentIdRaw = data && typeof data === "object"
      ? `${(data as JsonMap)["id"] ?? ""}`.trim()
      : `${
        body["id"] ?? url.searchParams.get("id") ??
          url.searchParams.get("data.id") ?? ""
      }`.trim();
    const topic = `${
      body["type"] ?? body["topic"] ?? url.searchParams.get("topic") ?? ""
    }`.toLowerCase().trim();
    const liveModeRaw = body["live_mode"];
    const liveMode = typeof liveModeRaw === "boolean"
      ? liveModeRaw
      : `${liveModeRaw ?? ""}`.toLowerCase().trim() === "true";

    if (!paymentIdRaw) {
      return json({
        error: "invalid_payload",
        message: "payment id missing",
        trace_id: traceId,
      }, 400);
    }

    // O simulador do painel costuma enviar ids fictícios (ex: 123456).
    // Para validar comunicação, respondemos 200 sem consultar a API externa.
    if (!liveMode && /^\d{1,10}$/.test(paymentIdRaw)) {
      return ok({
        received: true,
        simulated: true,
        ignored: true,
        reason: "test_notification",
        paymentId: paymentIdRaw,
        topic: topic || "payment",
      });
    }

    if (topic && topic !== "payment") {
      return ok({
        received: true,
        ignored: true,
        reason: "unsupported_topic",
        topic,
      });
    }

    const mpAccessToken = getEnv("MERCADO_PAGO_ACCESS_TOKEN") ||
      getEnv("MP_ACCESS_TOKEN");
    if (!mpAccessToken) {
      return json(
        {
          error: "misconfigured",
          message: "MERCADO_PAGO_ACCESS_TOKEN/MP_ACCESS_TOKEN not configured",
          trace_id: traceId,
        },
        500,
      );
    }

    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${
        encodeURIComponent(paymentIdRaw)
      }`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${mpAccessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!mpRes.ok) {
      const msg = await mpRes.text();
      return json(
        {
          error: "mercadopago_fetch_failed",
          message: `Mercado Pago returned ${mpRes.status}`,
          detail: msg.slice(0, 500),
          trace_id: traceId,
        },
        502,
      );
    }

    const payment = await mpRes.json() as JsonMap;
    const paymentStatus = `${payment["status"] ?? ""}`.toLowerCase().trim();
    const localPaymentStatus = mapMpStatusToLocalPaymentStatus(paymentStatus);
    let serviceId = extractServiceIdFromPayment(payment);
    if (!serviceId) {
      serviceId = await resolveServiceIdFromLedger(admin, paymentIdRaw);
    }
    const payer = payment["payer"] && typeof payment["payer"] === "object"
      ? payment["payer"] as JsonMap
      : null;
    const payerEmail = `${payer?.["email"] ?? ""}`.trim() || null;
    const methodId = `${payment["payment_method_id"] ?? ""}`.trim() || null;

    // Segurança financeira: webhook sempre reconcilia status no ledger de pagamentos.
    const paymentUpdatePayload: JsonMap = {
      status: localPaymentStatus,
      provider: "mercado_pago",
      payment_method_id: methodId,
      payment_method: methodId,
      external_payment_id: paymentIdRaw,
      mp_payment_id: paymentIdRaw,
      payer_email: payerEmail,
      mp_response: payment,
      raw_response: payment,
      updated_at: new Date().toISOString(),
    };
    let serviceFkEligible = false;
    if (serviceId) {
      serviceFkEligible = await serviceIdExistsInServiceRequestsNew(
        admin,
        serviceId,
      );
    }
    if (serviceId && serviceFkEligible) {
      paymentUpdatePayload["service_id"] = serviceId;
    }
    const { data: existingPaymentRow } = await admin
      .from("payments")
      .select("id,status,metadata")
      .or(
        `external_payment_id.eq.${paymentIdRaw},mp_payment_id.eq.${paymentIdRaw}`,
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const existingStatus = `${existingPaymentRow?.status ?? ""}`.toLowerCase()
      .trim();
    const shouldIgnoreRegression = existingStatus === "paid" &&
      localPaymentStatus !== "paid";

    if (!shouldIgnoreRegression) {
      await admin
        .from("payments")
        .update(paymentUpdatePayload)
        .or(
          `external_payment_id.eq.${paymentIdRaw},mp_payment_id.eq.${paymentIdRaw}`,
        );
    }

    if (!existingPaymentRow && serviceId) {
      await admin.from("payments").insert({
        service_id: serviceFkEligible ? serviceId : null,
        amount: Number(payment["transaction_amount"] ?? 0) || null,
        status: localPaymentStatus,
        provider: "mercado_pago",
        payment_method_id: methodId,
        payment_method: methodId,
        external_payment_id: paymentIdRaw,
        mp_payment_id: paymentIdRaw,
        payer_email: payerEmail,
        mp_response: payment,
        raw_response: payment,
        metadata: {
          canonical_service_id: serviceId,
          canonical_source: "service_requests",
        },
      });
    }

    if (!serviceId || paymentStatus !== "approved") {
      return ok({
        trace_id: traceId,
        received: true,
        ignored: true,
        reason: !serviceId ? "service_id_not_found" : "payment_not_approved",
        regressionIgnored: shouldIgnoreRegression,
        paymentId: paymentIdRaw,
        paymentStatus,
        serviceId: serviceId || null,
      });
    }

    const paymentMetadata =
      payment["metadata"] && typeof payment["metadata"] === "object"
        ? payment["metadata"] as JsonMap
        : {};
    const metadataStage = `${paymentMetadata["payment_stage"] ?? ""}`
      .toLowerCase().trim();
    const ledgerStage = `${
      (existingPaymentRow as any)?.metadata?.payment_stage ?? ""
    }`.toLowerCase().trim();
    const paymentStage = metadataStage || ledgerStage;
    const isRemainingPayment = paymentStage === "remaining";
    const nowIso = new Date().toISOString();
    const serviceUpdatePayload: JsonMap = {
      status_updated_at: nowIso,
    };
    if (isRemainingPayment) {
      serviceUpdatePayload["payment_remaining_status"] = "paid";
      serviceUpdatePayload["status"] = "in_progress";
      serviceUpdatePayload["arrived_at"] = nowIso;
    } else {
      serviceUpdatePayload["status"] = "searching_provider";
    }

    const { data: updated, error: updateErr } = await admin
      .from("service_requests")
      .update(serviceUpdatePayload)
      .eq("id", serviceId)
      .select(
        "id,status,payment_remaining_status,status_updated_at,provider_id",
      )
      .maybeSingle();

    if (updateErr) {
      return json(
        {
          error: "service_status_update_failed",
          message: updateErr.message,
          serviceId,
          trace_id: traceId,
        },
        500,
      );
    }

    let dispatchTriggered = false;
    let dispatchDetail: string | null = null;
    let dispatchDiagnostic: Record<string, unknown> | null = null;
    try {
      await admin.from("service_logs").insert({
        service_id: serviceId,
        event: "payment_approved_status_transition",
        payload: {
          trace_id: traceId,
          payment_id: paymentIdRaw,
          payment_status: paymentStatus,
          payment_stage: paymentStage || null,
          new_status: isRemainingPayment ? "in_progress" : "searching_provider",
        },
        created_at: nowIso,
      });
    } catch (_) {
      // noop: observability failure must not break webhook processing
    }
    if (!isRemainingPayment && updated && !updated.provider_id) {
      try {
        const baseUrl = getEnv("SUPABASE_URL");
        const serviceRole = getEnv("PROJECT_SERVICE_KEY") ||
          getEnv("SUPABASE_SERVICE_ROLE_KEY");
        if (baseUrl && serviceRole) {
          const dispatchRes = await fetch(`${baseUrl}/functions/v1/dispatch`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceRole}`,
              apikey: serviceRole,
            },
            body: JSON.stringify({
              action: "start_dispatch",
              serviceId,
              reason: "mp_webhook_payment_approved",
            }),
          });
          const dispatchBody = await dispatchRes.json().catch(() => null);
          dispatchTriggered = dispatchRes.ok;
          if (
            dispatchBody &&
            typeof dispatchBody === "object" &&
            "diagnostic" in (dispatchBody as Record<string, unknown>)
          ) {
            const maybeDiagnostic =
              (dispatchBody as Record<string, unknown>).diagnostic;
            if (maybeDiagnostic && typeof maybeDiagnostic === "object") {
              dispatchDiagnostic = maybeDiagnostic as Record<string, unknown>;
            }
          }
          if (!dispatchRes.ok) {
            dispatchDetail = `dispatch_http_${dispatchRes.status}`;
          } else if (
            dispatchBody &&
            typeof dispatchBody === "object" &&
            "queued" in (dispatchBody as Record<string, unknown>)
          ) {
            dispatchDetail = `dispatch_ok_queued_${
              String((dispatchBody as Record<string, unknown>).queued)
            }`;
          }
        } else {
          dispatchDetail = "missing_supabase_env";
        }
      } catch (e) {
        dispatchDetail = `dispatch_error:${String(e)}`;
      }
    }
    try {
      await admin.from("service_logs").insert({
        service_id: serviceId,
        event: dispatchTriggered
          ? "dispatch_triggered"
          : "dispatch_not_triggered",
        payload: {
          trace_id: traceId,
          payment_id: paymentIdRaw,
          payment_status: paymentStatus,
          dispatch_triggered: dispatchTriggered,
          dispatch_detail: dispatchDetail,
          dispatch_diagnostic: dispatchDiagnostic,
        },
        created_at: new Date().toISOString(),
      });
    } catch (_) {
      // noop: observability failure must not break webhook processing
    }

    return ok({
      trace_id: traceId,
      received: true,
      paymentId: paymentIdRaw,
      paymentStatus,
      serviceId,
      updatedService: updated ?? null,
      dispatchTriggered,
      dispatchDetail,
      dispatchDiagnostic,
    });
  }

  const auth = await getAuthenticatedUser(req, true);
  if ("error" in auth) return auth.error;
  const admin = auth.admin;

  if (req.method === "GET" && path === "/auth/bootstrap") {
    const appUser = "appUser" in auth ? auth.appUser : null;
    const authenticated = Boolean(appUser?.id);
    const role = appUser?.role?.toString() ?? null;
    const isFixedLocation = appUser?.is_fixed_location === true;
    const isMedical = appUser?.is_medical === true;
    let nextRoute = authenticated ? "/home" : "/login";
    if (authenticated && appUser?.id) {
      const activeService = await fetchLatestActiveServiceForUser(
        admin,
        appUser.id,
      );
      const activeServiceId = `${activeService?.["id"] ?? ""}`.trim();
      const activeServiceStatus = normalizeStatus(activeService?.["status"]);
      if (activeServiceId) {
        const keepClientOnHomeStatuses = new Set([
          "open_for_schedule",
          "aguardando_resposta",
          "awaiting_provider_response",
          "searching_provider",
          "search_provider",
          "waiting_provider",
          "searching",
          "schedule_proposed",
        ]);
        if (
          role === "client" && keepClientOnHomeStatuses.has(activeServiceStatus)
        ) {
          nextRoute = "/home";
        } else {
          nextRoute = `/service-tracking/${activeServiceId}`;
        }
      }
    }
    return ok({
      authenticated,
      userId: appUser?.id?.toString() ?? null,
      role,
      isMedical,
      isFixedLocation,
      registerStep: null,
      nextRoute,
    });
  }

  if (req.method === "POST" && path === "/auth/check-unique") {
    const body = await req.json().catch(() => ({} as JsonMap));
    const guard = await enforcePublicAbuseGuard(req, {
      action: "auth_check_unique",
      maxAttempts: 25,
      windowSeconds: 300,
      requireCaptchaForWeb: false,
      captchaToken: `${body["captcha_token"] ?? ""}`.trim(),
    });
    if ("error" in guard) return guard.error;
    const email = `${body["email"] ?? ""}`.trim().toLowerCase();
    const phone = `${body["phone"] ?? ""}`.trim();
    const document = `${body["document"] ?? ""}`.trim();

    if (!email && !phone && !document) {
      return json({ exists: false }, 200);
    }

    if (email) {
      const { data, error } = await admin
        .from("users")
        .select("id")
        .ilike("email", email)
        .limit(1);
      if (error) {
        return json(
          { error: "check_unique_failed", message: error.message },
          500,
        );
      }
      if ((data ?? []).length > 0) {
        return json({ exists: true, field: "email" }, 200);
      }
    }

    if (phone) {
      const { data, error } = await admin
        .from("users")
        .select("id")
        .or(`phone.eq.${phone},mobile_phone.eq.${phone}`)
        .limit(1);
      if (error) {
        return json(
          { error: "check_unique_failed", message: error.message },
          500,
        );
      }
      if ((data ?? []).length > 0) {
        return json({ exists: true, field: "phone" }, 200);
      }
    }

    if (document) {
      const { data, error } = await admin
        .from("users")
        .select("id")
        .eq("document_value", document)
        .limit(1);
      if (error) {
        return json(
          { error: "check_unique_failed", message: error.message },
          500,
        );
      }
      if ((data ?? []).length > 0) {
        return json({ exists: true, field: "document" }, 200);
      }
    }

    return json({ exists: false }, 200);
  }

  if (req.method === "POST" && path === "/auth/register-session") {
    const body = await req.json().catch(() => ({} as JsonMap));
    const guard = await enforcePublicAbuseGuard(req, {
      action: "auth_register_session",
      maxAttempts: 10,
      windowSeconds: 600,
      requireCaptchaForWeb: true,
      captchaToken: `${body["captcha_token"] ?? ""}`.trim(),
    });
    if ("error" in guard) return guard.error;
    const metadata = body["metadata"] && typeof body["metadata"] === "object"
      ? body["metadata"] as JsonMap
      : null;
    if (metadata?.["liveness_validated"] != true) {
      return json(
        {
          error: "liveness_not_verified",
          message:
            "A prova de vida precisa ser concluída antes de criar a sessão de cadastro.",
        },
        400,
      );
    }

    const selfiePath = `${metadata?.["selfie_path"] ?? ""}`.trim();
    if (!selfiePath) {
      return json(
        {
          error: "liveness_selfie_missing",
          message:
            "A selfie da prova de vida é obrigatória para abrir a sessão de cadastro.",
        },
        400,
      );
    }

    const authUser = "authUser" in auth ? auth.authUser : null;
    const sessionToken = newUuidV4();
    const expiresAt = buildRegisterSessionExpiry(5);
    const sessionMetadata: JsonMap = {
      liveness_validated: true,
      validated_at: metadata?.["validated_at"] ?? new Date().toISOString(),
      selfie_path: selfiePath,
    };

    const { data, error } = await admin
      .from("register_sessions")
      .insert({
        session_token: sessionToken,
        purpose: "provider_registration_liveness",
        status: "verified",
        auth_uid: authUser?.id ?? null,
        metadata: sessionMetadata,
        expires_at: expiresAt,
      })
      .select("id,session_token,expires_at,status")
      .single();

    if (error) {
      return json(
        { error: "register_session_create_failed", message: error.message },
        500,
      );
    }

    return ok(
      (data ?? {
        session_token: sessionToken,
        expires_at: expiresAt,
        status: "verified",
      }) as JsonMap,
    );
  }

  if (req.method === "POST" && path === "/auth/register") {
    const body = await req.json().catch(() => ({} as JsonMap));
    const guard = await enforcePublicAbuseGuard(req, {
      action: "auth_register",
      maxAttempts: 8,
      windowSeconds: 900,
      requireCaptchaForWeb: true,
      captchaToken: `${body["captcha_token"] ?? ""}`.trim(),
    });
    if ("error" in guard) return guard.error;
    const authUser = "authUser" in auth ? auth.authUser : null;
    const existingAppUser = "appUser" in auth ? auth.appUser : null;
    const supabaseUid = `${authUser?.id ?? body["supabase_uid"] ?? ""}`.trim();
    if (!supabaseUid) {
      return json(
        {
          error: "unauthorized",
          message: "Authenticated Supabase user required",
        },
        401,
      );
    }

    const role = `${body["role"] ?? "client"}`.trim().toLowerCase();
    if (!["client", "provider", "driver", "admin"].includes(role)) {
      return json({ error: "invalid_role", message: "Invalid role" }, 400);
    }

    const email = `${body["email"] ?? authUser?.email ?? ""}`.trim()
      .toLowerCase();
    const fullName = `${
      body["full_name"] ?? body["name"] ?? authUser?.user_metadata?.full_name ??
        ""
    }`
      .trim();
    if (!email || !fullName) {
      return json(
        { error: "invalid_payload", message: "Email e nome são obrigatórios." },
        400,
      );
    }

    const phone = `${body["phone"] ?? ""}`.trim();
    const birthDate = `${body["birth_date"] ?? ""}`.trim();
    const subRole = `${body["sub_role"] ?? ""}`.trim() || null;
    const pixKey = `${body["pix_key"] ?? ""}`.trim() || null;
    const address = `${body["address"] ?? ""}`.trim() || null;
    const documentType = `${body["document_type"] ?? ""}`.trim() || null;
    const documentValue = `${body["document_value"] ?? ""}`.trim() || null;
    const metadata = body["metadata"] && typeof body["metadata"] === "object"
      ? body["metadata"] as JsonMap
      : null;
    const registerSessionToken = `${metadata?.["register_session_token"] ?? ""}`
      .trim();
    const isFixedLocation = body["is_fixed_location"] === true;
    const latitude = Number(body["latitude"] ?? body["lat"] ?? NaN);
    const longitude = Number(body["longitude"] ?? body["lon"] ?? NaN);
    const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);
    const nowIso = new Date().toISOString();

    const rawProfessions = Array.isArray(body["professions"])
      ? body["professions"] as unknown[]
      : [];
    const professionIdsFromBody = rawProfessions
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);
    const professionNamesFromBody = rawProfessions
      .map((value) => `${value ?? ""}`.trim())
      .filter((value) => value.length > 0 && Number.isNaN(Number(value)));

    const resolvedProfessionIds = new Set<number>(professionIdsFromBody);
    if (professionNamesFromBody.length > 0) {
      const { data: professionRows, error: professionError } = await admin
        .from("professions")
        .select("id,name,service_type")
        .in("name", Array.from(new Set(professionNamesFromBody)));
      if (professionError) {
        return json(
          {
            error: "professions_lookup_failed",
            message: professionError.message,
          },
          500,
        );
      }
      for (const row of ((professionRows ?? []) as JsonMap[])) {
        const id = Number(row["id"] ?? 0);
        if (Number.isFinite(id) && id > 0) resolvedProfessionIds.add(id);
      }
    }

    if (
      role === "provider" &&
      rawProfessions.length > 0 &&
      resolvedProfessionIds.size === 0
    ) {
      return json(
        {
          error: "profession_not_found",
          message: "Nenhuma profissão válida foi encontrada para o cadastro.",
        },
        400,
      );
    }

    if (metadata?.["liveness_validated"] != true) {
      return json(
        {
          error: "liveness_required",
          message:
            "A prova de vida é obrigatória antes de continuar o cadastro.",
        },
        403,
      );
    }

    let resolvedProfessionRows: JsonMap[] = [];
    if (resolvedProfessionIds.size > 0) {
      const { data: professionRows, error: professionRowsError } = await admin
        .from("professions")
        .select("id,name,service_type")
        .in("id", Array.from(resolvedProfessionIds));
      if (professionRowsError) {
        return json(
          {
            error: "professions_lookup_failed",
            message: professionRowsError.message,
          },
          500,
        );
      }
      resolvedProfessionRows = (professionRows ?? []) as JsonMap[];
    }

    if (role === "provider") {
      const registrationFlags = await readProviderRegistrationFlags(admin);
      const hasFixedProfession = resolvedProfessionRows.some((row) => {
        const serviceType = `${row["service_type"] ?? ""}`.trim().toLowerCase();
        return ["salon", "beauty", "fixed"].includes(serviceType);
      });
      const effectiveProviderMode =
        isFixedLocation || subRole === "fixed" || hasFixedProfession
          ? "fixed"
          : "mobile";
      if (
        effectiveProviderMode === "fixed" &&
        !registrationFlags.fixedEnabled
      ) {
        return json(
          {
            error: "provider_fixed_registration_disabled",
            message:
              "O cadastro de prestador fixo está desabilitado no momento.",
          },
          403,
        );
      }
      if (
        effectiveProviderMode === "mobile" &&
        !registrationFlags.mobileEnabled
      ) {
        return json(
          {
            error: "provider_mobile_registration_disabled",
            message:
              "O cadastro de prestador móvel está desabilitado no momento.",
          },
          403,
        );
      }
    }

    const baseUserPayload: JsonMap = {
      supabase_uid: supabaseUid,
      email,
      full_name: fullName,
      role,
      phone: phone || null,
      mobile_phone: phone || null,
      birth_date: birthDate || null,
      sub_role: subRole,
      is_fixed_location: role === "provider" ? isFixedLocation : false,
      pix_key: pixKey,
      address,
      document_type: documentType,
      document_value: documentValue,
      accepts_services: role === "provider",
      accepts_rides: role === "driver",
      updated_at: nowIso,
    };

    if (!existingAppUser?.id) {
      baseUserPayload["created_at"] = nowIso;
    }

    const userPayloads: JsonMap[] = [
      { ...baseUserPayload },
      (() => {
        const copy = { ...baseUserPayload };
        delete copy["mobile_phone"];
        return copy;
      })(),
      (() => {
        const copy = { ...baseUserPayload };
        delete copy["mobile_phone"];
        delete copy["updated_at"];
        return copy;
      })(),
      (() => {
        const copy = { ...baseUserPayload };
        delete copy["mobile_phone"];
        delete copy["updated_at"];
        delete copy["accepts_services"];
        delete copy["accepts_rides"];
        return copy;
      })(),
    ];

    let savedUser: JsonMap | null = null;
    let userError: any = null;
    for (const candidate of userPayloads) {
      const mutablePayload: JsonMap = { ...candidate };
      for (let guard = 0; guard < 8; guard++) {
        const attempt = await admin
          .from("users")
          .upsert(mutablePayload, { onConflict: "supabase_uid" })
          .select(
            "id,supabase_uid,role,is_active,is_fixed_location,full_name,email,phone,avatar_url,address,document_type,document_value,sub_role,birth_date",
          )
          .single();
        if (!attempt.error) {
          savedUser = (attempt.data ?? null) as JsonMap | null;
          userError = null;
          break;
        }
        const missingColumn = extractMissingColumnFromPostgrestMessage(
          `${attempt.error.message ?? ""}`,
        );
        if (!missingColumn || !(missingColumn in mutablePayload)) {
          userError = attempt.error;
          break;
        }
        delete mutablePayload[missingColumn];
        userError = attempt.error;
      }
      if (savedUser && !userError) break;
    }

    if (userError || !savedUser) {
      return json(
        {
          error: "register_user_upsert_failed",
          message: userError?.message ?? "Falha ao salvar perfil do usuário.",
        },
        500,
      );
    }

    const userId = Number(savedUser["id"] ?? 0);
    if (!Number.isFinite(userId) || userId <= 0) {
      return json(
        {
          error: "register_invalid_user_id",
          message: "Não foi possível resolver o id do usuário cadastrado.",
        },
        500,
      );
    }

    if (role === "provider") {
      const providerPayloads: JsonMap[] = [
        {
          user_id: userId,
          address,
          latitude: hasCoords ? latitude : null,
          longitude: hasCoords ? longitude : null,
          document_type: documentType,
          document_value: documentValue,
          is_online: false,
        },
        {
          user_id: userId,
          address,
          latitude: hasCoords ? latitude : null,
          longitude: hasCoords ? longitude : null,
        },
        {
          user_id: userId,
        },
      ];

      let providerError: any = null;
      for (const candidate of providerPayloads) {
        const mutablePayload: JsonMap = { ...candidate };
        for (let guard = 0; guard < 8; guard++) {
          const providerAttempt = await admin
            .from("providers")
            .upsert(mutablePayload, { onConflict: "user_id" });
          if (!providerAttempt.error) {
            providerError = null;
            break;
          }
          const missingColumn = extractMissingColumnFromPostgrestMessage(
            `${providerAttempt.error.message ?? ""}`,
          );
          if (!missingColumn || !(missingColumn in mutablePayload)) {
            providerError = providerAttempt.error;
            break;
          }
          delete mutablePayload[missingColumn];
          providerError = providerAttempt.error;
        }
        if (!providerError) break;
      }

      if (providerError) {
        return json(
          {
            error: "provider_upsert_failed",
            message: providerError.message,
          },
          500,
        );
      }

      if (resolvedProfessionIds.size > 0) {
        const cleanupByUserId = await admin
          .from("provider_professions")
          .delete()
          .eq("provider_user_id", userId);
        if (cleanupByUserId.error) {
          return json(
            {
              error: "provider_professions_cleanup_failed",
              message: cleanupByUserId.error.message,
            },
            500,
          );
        }

        const cleanupByUid = await admin
          .from("provider_professions")
          .delete()
          .eq("provider_uid", supabaseUid);
        if (
          cleanupByUid.error &&
          extractMissingColumnFromPostgrestMessage(
              `${cleanupByUid.error.message ?? ""}`,
            ) !== "provider_uid"
        ) {
          return json(
            {
              error: "provider_professions_cleanup_failed",
              message: cleanupByUid.error.message,
            },
            500,
          );
        }

        const professionRows = Array.from(resolvedProfessionIds).map((id) => (
          {
            provider_user_id: userId,
            provider_uid: supabaseUid,
            profession_id: id,
          }
        ));
        const professionRowCandidates: JsonMap[][] = [
          professionRows,
          professionRows.map((row) => {
            const { provider_uid: _providerUid, ...copy } = row;
            void _providerUid;
            return copy as JsonMap;
          }),
        ];
        let insertError: any = null;
        for (const candidateRows of professionRowCandidates) {
          const insertLinks = await admin
            .from("provider_professions")
            .insert(candidateRows);
          if (!insertLinks.error) {
            insertError = null;
            break;
          }
          const missingColumn = extractMissingColumnFromPostgrestMessage(
            `${insertLinks.error.message ?? ""}`,
          );
          if (missingColumn !== "provider_uid") {
            insertError = insertLinks.error;
            break;
          }
          insertError = insertLinks.error;
        }
        if (insertError) {
          return json(
            {
              error: "provider_professions_insert_failed",
              message: insertError.message,
            },
            500,
          );
        }
      }

      if (hasCoords) {
        const locationPayload: JsonMap = {
          provider_id: userId,
          provider_uid: supabaseUid,
          latitude,
          longitude,
          updated_at: nowIso,
        };
        const mutablePayload: JsonMap = { ...locationPayload };
        for (let guard = 0; guard < 6; guard++) {
          const locationAttempt = await admin
            .from("provider_locations")
            .upsert(mutablePayload, { onConflict: "provider_id" });
          if (!locationAttempt.error) break;
          const missingColumn = extractMissingColumnFromPostgrestMessage(
            `${locationAttempt.error.message ?? ""}`,
          );
          if (!missingColumn || !(missingColumn in mutablePayload)) {
            return json(
              {
                error: "provider_location_upsert_failed",
                message: locationAttempt.error.message,
              },
              500,
            );
          }
          delete mutablePayload[missingColumn];
        }
      }
    }

    return json({
      success: true,
      user: savedUser,
      profession_ids: Array.from(resolvedProfessionIds),
    }, 200);
  }

  if (req.method === "GET" && path === "/home/client") {
    const appUser = "appUser" in auth ? auth.appUser : null;
    const { data, error } = await admin
      .from("task_catalog")
      .select(
        "id,name,unit_price,unit_name,pricing_type,active,keywords,profession_id,service_type,professions(name,service_type)",
      )
      .eq("active", true)
      .order("name", { ascending: true })
      .limit(2000);

    if (error) {
      return json(
        { error: "home_client_fetch_failed", message: error.message },
        500,
      );
    }

    const services = ((data ?? []) as JsonMap[]).map((row) => {
      const prof = row["professions"] as JsonMap | null;
      return {
        ...row,
        task_name: `${row["name"] ?? ""}`,
        profession_name: `${prof?.["name"] ?? ""}`,
        service_type: row["service_type"] ?? prof?.["service_type"] ?? null,
        professions: undefined,
      };
    });

    let activeService: JsonMap | null = null;
    let activeServiceUi: JsonMap | null = null;
    if (appUser?.id) {
      activeService = await fetchLatestActiveServiceForUser(admin, appUser.id);
      const ui = buildClientWaitingUi(activeService);
      activeServiceUi = ui ? { ...ui } : null;
    }

    return ok({
      snapshot: {
        services,
        activeService,
        activeServiceUi,
        pendingFixedPayment: null,
        upcomingAppointment: null,
      },
    });
  }

  if (req.method === "GET" && path === "/home/client/mobile-professions") {
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") ?? "12"), 1),
      50,
    );

    const { data: taskRows, error: taskError } = await admin
      .from("task_catalog")
      .select(
        "id,name,active,profession_id,service_type,professions(id,name,service_type)",
      )
      .eq("active", true)
      .order("name", { ascending: true })
      .limit(3000);

    if (taskError) {
      return json(
        {
          error: "home_client_mobile_professions_failed",
          message: taskError.message,
        },
        500,
      );
    }

    const mobileRows = ((taskRows ?? []) as JsonMap[]).filter((row) => {
      const prof = row["professions"] as JsonMap | null;
      const serviceType = `${
        row["service_type"] ?? prof?.["service_type"] ?? ""
      }`
        .trim()
        .toLowerCase();
      return serviceType === "on_site" || serviceType === "mobile";
    });

    const grouped = new Map<number, JsonMap>();
    for (const row of mobileRows) {
      const prof = row["professions"] as JsonMap | null;
      const professionId = Number(row["profession_id"] ?? prof?.["id"] ?? 0);
      const professionName = `${prof?.["name"] ?? ""}`.trim();
      if (
        !Number.isFinite(professionId) || professionId <= 0 || !professionName
      ) {
        continue;
      }

      const current = grouped.get(professionId) ?? {
        profession_id: professionId,
        profession_name: professionName,
        service_type: "on_site",
        task_count: 0,
        provider_count: 0,
        sample_task: "",
      };

      current["task_count"] = Number(current["task_count"] ?? 0) + 1;
      if (!`${current["sample_task"] ?? ""}`.trim()) {
        current["sample_task"] = `${row["name"] ?? ""}`.trim();
      }
      grouped.set(professionId, current);
    }

    const professionIds = Array.from(grouped.keys());
    if (professionIds.length > 0) {
      const { data: providerProfessionRows } = await admin
        .from("provider_professions")
        .select("provider_user_id,profession_id")
        .in("profession_id", professionIds);

      const providerRows = (providerProfessionRows ?? []) as JsonMap[];
      const providerIds = Array.from(
        new Set(
          providerRows
            .map((row) => Number(row["provider_user_id"] ?? 0))
            .filter((id) => Number.isFinite(id) && id > 0),
        ),
      );

      const mobileProviderIds = new Set<number>();
      if (providerIds.length > 0) {
        const { data: userRows } = await admin
          .from("users")
          .select("id,role,is_active,is_fixed_location,sub_role")
          .in("id", providerIds)
          .eq("role", "provider");

        for (const row of ((userRows ?? []) as JsonMap[])) {
          const id = Number(row["id"] ?? 0);
          if (!Number.isFinite(id) || id <= 0) continue;
          const isActive = row["is_active"] !== false;
          const isFixed = row["is_fixed_location"] === true ||
            `${row["sub_role"] ?? ""}`.trim().toLowerCase() === "fixed";
          if (isActive && !isFixed) {
            mobileProviderIds.add(id);
          }
        }
      }

      const countedProviders = new Map<number, Set<number>>();
      for (const row of providerRows) {
        const professionId = Number(row["profession_id"] ?? 0);
        const providerUserId = Number(row["provider_user_id"] ?? 0);
        if (!mobileProviderIds.has(providerUserId)) continue;
        if (!countedProviders.has(professionId)) {
          countedProviders.set(professionId, new Set<number>());
        }
        countedProviders.get(professionId)!.add(providerUserId);
      }

      for (const [professionId, providers] of countedProviders.entries()) {
        const current = grouped.get(professionId);
        if (current == null) continue;
        current["provider_count"] = providers.size;
      }
    }

    const items = Array.from(grouped.values())
      .sort((a, b) => {
        const byProviders = Number(b["provider_count"] ?? 0) -
          Number(a["provider_count"] ?? 0);
        if (byProviders !== 0) return byProviders;
        const byTasks = Number(b["task_count"] ?? 0) -
          Number(a["task_count"] ?? 0);
        if (byTasks !== 0) return byTasks;
        return `${a["profession_name"] ?? ""}`.localeCompare(
          `${b["profession_name"] ?? ""}`,
        );
      })
      .slice(0, limit);

    return ok({ items });
  }

  if (req.method === "GET" && path === "/tasks") {
    const activeEq = `${url.searchParams.get("active_eq") ?? "true"}`.trim();
    const onlyActive = activeEq !== "false";
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") ?? "2000"), 1),
      5000,
    );

    let query = admin
      .from("task_catalog")
      .select(
        "id,name,unit_price,unit_name,pricing_type,active,keywords,profession_id,service_type,professions(id,name,service_type)",
      )
      .order("name", { ascending: true })
      .limit(limit);
    if (onlyActive) query = query.eq("active", true);

    const { data, error } = await query;
    if (error) {
      return json({ error: "tasks_fetch_failed", message: error.message }, 500);
    }

    const normalized = ((data ?? []) as JsonMap[]).map((row) => {
      const prof = row["professions"] as JsonMap | null;
      return {
        ...row,
        task_name: `${row["name"] ?? ""}`,
        profession_name: `${prof?.["name"] ?? ""}`,
        service_type: row["service_type"] ?? prof?.["service_type"] ?? null,
        professions: prof ?? null,
      };
    });

    return ok(normalized);
  }

  if (req.method === "POST" && path === "/task-catalog") {
    const body = await req.json().catch(() => ({} as JsonMap));
    const professionId = Number(body["profession_id"] ?? 0);
    const name = `${body["name"] ?? ""}`.trim();
    const unitPrice = Number(body["unit_price"] ?? 0);
    const unitName = `${body["unit_name"] ?? "unidade"}`.trim() || "unidade";
    const pricingType = `${body["pricing_type"] ?? "fixed"}`.trim() || "fixed";
    const active = body["active"] !== false;
    const keywords = `${body["keywords"] ?? body["description"] ?? ""}`.trim();

    if (!Number.isFinite(professionId) || professionId <= 0 || !name) {
      return json(
        {
          error: "invalid_task_catalog_payload",
          message: "profession_id e name são obrigatórios.",
        },
        400,
      );
    }

    const payload: JsonMap = {
      profession_id: professionId,
      name,
      pricing_type: pricingType,
      unit_name: unitName,
      unit_price: Number.isFinite(unitPrice) ? unitPrice : 0,
      active,
      keywords: keywords || null,
    };

    const mutablePayload: JsonMap = { ...payload };
    for (let guard = 0; guard < 6; guard++) {
      const attempt = await admin
        .from("task_catalog")
        .insert(mutablePayload)
        .select("*")
        .single();
      if (!attempt.error) {
        return ok((attempt.data ?? {}) as JsonMap);
      }
      const missingColumn = extractMissingColumnFromPostgrestMessage(
        `${attempt.error.message ?? ""}`,
      );
      if (!missingColumn || !(missingColumn in mutablePayload)) {
        return json(
          {
            error: "task_catalog_create_failed",
            message: attempt.error.message,
          },
          500,
        );
      }
      delete mutablePayload[missingColumn];
    }

    return json(
      {
        error: "task_catalog_create_failed",
        message: "Falha inesperada ao criar item no catálogo.",
      },
      500,
    );
  }

  if (req.method === "GET" && path === "/tasks/autocomplete") {
    const q = `${url.searchParams.get("q") ?? ""}`.trim();
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") ?? "8"), 1),
      50,
    );
    if (q.length < 2) return json({ results: [] }, 200);

    const { data, error } = await admin
      .from("task_catalog")
      .select(
        "id,name,keywords,unit_price,pricing_type,unit_name,profession_id,service_type,professions(name,service_type)",
      )
      .eq("active", true)
      .order("name", { ascending: true })
      .limit(2000);
    if (error) {
      return json(
        { error: "tasks_autocomplete_fetch_failed", message: error.message },
        500,
      );
    }

    const catalog = ((data ?? []) as JsonMap[]).map((row) => {
      const prof = row["professions"] as JsonMap | null;
      return {
        ...row,
        profession_name: `${prof?.["name"] ?? ""}`,
        service_type: row["service_type"] ?? prof?.["service_type"] ?? null,
      };
    });

    const queryNorm = normalizePt(q);
    const qExpanded = expandSynonyms(q);
    const qTokens = tokens(qExpanded);
    if (!qTokens.length) return json({ results: [] }, 200);

    const seen = new Set<string>();
    const results = catalog
      .map((task) => ({ task, score: scoreTask(task, queryNorm, qTokens) }))
      .filter(({ score }) => score >= 0.45)
      .sort((a, b) => b.score - a.score)
      .reduce<JsonMap[]>((acc, { task }) => {
        const nameNorm = normalizePt(`${task["name"] ?? ""}`);
        if (!seen.has(nameNorm)) {
          seen.add(nameNorm);
          acc.push(task);
        }
        return acc;
      }, [])
      .slice(0, limit);

    return json({ results }, 200);
  }

  if (req.method === "GET" && path === "/professions") {
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") ?? "200"), 1),
      5000,
    );
    const idEq = (url.searchParams.get("id_eq") ?? "").trim();
    const idIn = (url.searchParams.get("id_in") ?? "").trim();
    const nameIlike = (url.searchParams.get("name_ilike") ?? "").trim();
    const serviceTypeEq = (url.searchParams.get("service_type_eq") ?? "")
      .trim();

    const ids = idIn
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);

    const runProfessionQuery = async (selectClause: string) => {
      let q = admin
        .from("professions")
        .select(selectClause)
        .order("name", { ascending: true })
        .limit(limit);

      if (idEq) {
        const parsed = Number(idEq);
        if (Number.isFinite(parsed) && parsed > 0) q = q.eq("id", parsed);
      }
      if (ids.length > 0) q = q.in("id", ids);
      if (nameIlike) q = q.ilike("name", `%${nameIlike}%`);
      if (serviceTypeEq) q = q.eq("service_type", serviceTypeEq);
      return await q;
    };

    let { data, error } = await runProfessionQuery(
      "id,name,service_type,keywords,category_id",
    );

    if (error) {
      const missingColumn = extractMissingColumnFromPostgrestMessage(
        error.message,
      );
      const normalizedMissingColumn = `${missingColumn ?? ""}`
        .split(".")
        .pop()
        ?.trim()
        .toLowerCase();
      if (normalizedMissingColumn === "keywords") {
        ({ data, error } = await runProfessionQuery(
          "id,name,service_type,category_id",
        ));
      }
    }

    if (error) {
      return json(
        { error: "professions_fetch_failed", message: error.message },
        500,
      );
    }

    const normalized = ((data ?? []) as JsonMap[]).map((row) => ({
      id: row["id"] ?? null,
      name: row["name"] ?? null,
      service_type: row["service_type"] ?? null,
      keywords: row["keywords"] ?? null,
      category_id: row["category_id"] ?? null,
    }));

    return ok(normalized);
  }

  if (req.method === "GET" && path === "/provider-professions") {
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") ?? "200"), 1),
      5000,
    );
    const providerUserIdEq = Number(
      (url.searchParams.get("provider_user_id_eq") ?? "").trim(),
    );
    const providerUserIdIn = (url.searchParams.get("provider_user_id_in") ?? "")
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);
    const professionIdIn = (url.searchParams.get("profession_id_in") ?? "")
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);

    let q = admin
      .from("provider_professions")
      .select("provider_user_id,profession_id")
      .limit(limit);

    if (Number.isFinite(providerUserIdEq) && providerUserIdEq > 0) {
      q = q.eq("provider_user_id", providerUserIdEq);
    }
    if (providerUserIdIn.length > 0) {
      q = q.in("provider_user_id", providerUserIdIn);
    }
    if (professionIdIn.length > 0) {
      q = q.in("profession_id", professionIdIn);
    }

    const { data, error } = await q;
    if (error) {
      return json(
        { error: "provider_professions_fetch_failed", message: error.message },
        500,
      );
    }

    const rows = (data ?? []) as JsonMap[];
    const providerIds = Array.from(
      new Set(
        rows
          .map((row) => Number(row["provider_user_id"] ?? 0))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    );
    const providerUidById = new Map<number, string>();
    if (providerIds.length > 0) {
      const { data: userRows } = await admin
        .from("users")
        .select("id,supabase_uid")
        .in("id", providerIds);
      for (const row of ((userRows ?? []) as JsonMap[])) {
        const id = Number(row["id"] ?? 0);
        const uid = `${row["supabase_uid"] ?? ""}`.trim();
        if (id > 0 && uid) providerUidById.set(id, uid);
      }
    }

    return ok(rows.map((row) => {
      const providerUserId = Number(row["provider_user_id"] ?? 0);
      return {
        provider_user_id: providerUserId > 0 ? providerUserId : null,
        profession_id: Number(row["profession_id"] ?? 0) || null,
        provider_uid: providerUidById.get(providerUserId) ?? null,
      };
    }));
  }

  if (req.method === "GET" && path === "/users") {
    const supabaseUidEq = (url.searchParams.get("supabase_uid_eq") ?? "")
      .trim();
    const idEq = (url.searchParams.get("id_eq") ?? "").trim();
    const emailEq = (url.searchParams.get("email_eq") ?? "").trim();
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") ?? "1"), 1),
      200,
    );

    let q = admin
      .from("users")
      .select(
        "id,supabase_uid,role,is_active,is_fixed_location,full_name,email,phone,avatar_url,address,document_type,document_value,sub_role,birth_date,driver_payment_mode,pix_key",
      )
      .limit(limit);

    if (supabaseUidEq) q = q.eq("supabase_uid", supabaseUidEq);
    if (idEq) {
      const parsed = Number(idEq);
      if (Number.isFinite(parsed)) q = q.eq("id", parsed);
    }
    if (emailEq) q = q.ilike("email", emailEq);

    const { data, error } = await q;
    if (error) {
      return json({ error: "users_fetch_failed", message: error.message }, 500);
    }
    return ok((data ?? []) as JsonMap[]);
  }

  if (req.method === "GET" && path === "/me") {
    const appUser = "appUser" in auth ? auth.appUser : null;
    if (!appUser?.id) {
      return json(
        { error: "unauthorized", message: "User not authenticated" },
        401,
      );
    }
    return ok(appUser as JsonMap);
  }

  if (req.method === "GET" && path === "/profile/me") {
    const appUser = "appUser" in auth ? auth.appUser : null;
    if (!appUser?.id) {
      return json(
        { error: "unauthorized", message: "User not authenticated" },
        401,
      );
    }

    const { data, error } = await admin
      .from("users")
      .select(
        "id,supabase_uid,role,is_active,is_fixed_location,full_name,email,phone,avatar_url,address",
      )
      .eq("id", appUser.id)
      .maybeSingle();

    if (error) {
      return json(
        { error: "profile_me_fetch_failed", message: error.message },
        500,
      );
    }
    return ok((data ?? appUser) as JsonMap);
  }

  if (req.method === "PUT" && path === "/profile/me") {
    const appUser = "appUser" in auth ? auth.appUser : null;
    if (!appUser?.id) {
      return json(
        { error: "unauthorized", message: "User not authenticated" },
        401,
      );
    }

    const body = await req.json().catch(() => ({} as JsonMap));
    const payload: JsonMap = {};

    const fullName = optionalTrimmedString(body, ["full_name", "name"]);
    if (fullName !== undefined) {
      if (!fullName) {
        return json(
          {
            error: "invalid_payload",
            message: "Nome não pode ficar vazio.",
          },
          400,
        );
      }
      payload["full_name"] = fullName;
    }

    const email = optionalTrimmedString(body, ["email"]);
    if (email !== undefined) {
      if (!email) {
        return json(
          {
            error: "invalid_payload",
            message: "E-mail não pode ficar vazio.",
          },
          400,
        );
      }
      payload["email"] = email.toLowerCase();
    }

    const phone = optionalTrimmedString(body, ["phone"]);
    if (phone !== undefined) {
      payload["phone"] = phone || null;
      payload["mobile_phone"] = phone || null;
    }

    const address = optionalTrimmedString(body, ["address"]);
    if (address !== undefined) payload["address"] = address || null;

    const birthDate = optionalTrimmedString(body, ["birth_date"]);
    if (birthDate !== undefined) payload["birth_date"] = birthDate || null;

    const documentType = optionalTrimmedString(body, ["document_type"]);
    if (documentType !== undefined) {
      payload["document_type"] = documentType.toLowerCase() || null;
    }

    const documentValue = optionalTrimmedString(body, ["document_value"]);
    if (documentValue !== undefined) {
      payload["document_value"] = documentValue || null;
    }

    const avatarUrl = optionalTrimmedString(body, ["avatar_url"]);
    if (avatarUrl !== undefined) payload["avatar_url"] = avatarUrl || null;

    const pixKey = optionalTrimmedString(body, ["pix_key"]);
    if (pixKey !== undefined) payload["pix_key"] = pixKey || null;

    const subRole = optionalTrimmedString(body, ["sub_role"]);
    if (subRole !== undefined) payload["sub_role"] = subRole || null;

    const driverPaymentMode = optionalTrimmedString(body, [
      "driver_payment_mode",
    ]);
    if (driverPaymentMode !== undefined) {
      payload["driver_payment_mode"] = driverPaymentMode || null;
    }

    if (Object.keys(payload).length === 0) {
      return json(
        {
          error: "invalid_payload",
          message: "Nenhum campo atualizável foi enviado.",
        },
        400,
      );
    }

    payload["updated_at"] = new Date().toISOString();

    const updateAttempts: JsonMap[] = [
      { ...payload },
      (() => {
        const copy = { ...payload };
        delete copy["mobile_phone"];
        return copy;
      })(),
    ];

    let savedUser: JsonMap | null = null;
    let updateError: { message?: string } | null = null;
    for (const candidate of updateAttempts) {
      const mutablePayload: JsonMap = { ...candidate };
      for (let guard = 0; guard < 8; guard++) {
        const attempt = await admin
          .from("users")
          .update(mutablePayload)
          .eq("id", appUser.id)
          .select(
            "id,supabase_uid,role,is_active,is_fixed_location,full_name,email,phone,avatar_url,address,document_type,document_value,sub_role,birth_date,driver_payment_mode,pix_key",
          )
          .maybeSingle();
        if (!attempt.error) {
          savedUser = (attempt.data ?? null) as JsonMap | null;
          updateError = null;
          break;
        }
        const missingColumn = extractMissingColumnFromPostgrestMessage(
          `${attempt.error.message ?? ""}`,
        );
        if (!missingColumn || !(missingColumn in mutablePayload)) {
          updateError = attempt.error;
          break;
        }
        delete mutablePayload[missingColumn];
        updateError = attempt.error;
      }
      if (savedUser && !updateError) break;
    }

    if (updateError || !savedUser) {
      return json(
        {
          error: "profile_me_update_failed",
          message: updateError?.message ??
            "Falha ao atualizar perfil do usuário.",
        },
        500,
      );
    }

    const confirmedFields = Object.keys(payload).filter((key) =>
      key !== "updated_at" && key !== "mobile_phone"
    );

    return json({
      success: true,
      confirmed_at: new Date().toISOString(),
      confirmed_fields: confirmedFields,
      data: savedUser,
    }, 200);
  }

  if (req.method === "GET" && path === "/app-configs") {
    const { data, error } = await admin
      .from("app_configs")
      .select("key,value,category")
      .order("key", { ascending: true });
    if (error) {
      return json(
        { error: "app_configs_fetch_failed", message: error.message },
        500,
      );
    }
    return ok((data ?? []) as JsonMap[]);
  }

  if (req.method === "GET" && path === "/tracking/active-service") {
    const appUser = "appUser" in auth ? auth.appUser : null;
    if (!appUser?.id) return ok({ activeService: null });

    const activeService = await fetchLatestActiveServiceForUser(
      admin,
      appUser.id,
    );
    const activeServiceUi = buildClientWaitingUi(activeService);
    return ok({
      activeService: activeService ?? null,
      activeServiceUi: activeServiceUi ?? null,
    });
  }

  if (req.method === "POST" && path === "/payments/pix/resolve") {
    const appUser = "appUser" in auth ? auth.appUser : null;
    if (!appUser?.id) {
      console.warn("[api/pix/resolve] Unauthorized: appUser missing from auth");
      return json(
        { error: "unauthorized", message: "User not authenticated" },
        401,
      );
    }
    const body = await req.json().catch(() => ({} as JsonMap));
    const serviceId = `${body["service_id"] ?? body["entity_id"] ?? ""}`.trim();
    console.log(
      `[api/pix/resolve] Resolving PIX for service: ${serviceId}, user: ${appUser.id}`,
    );

    if (!serviceId) {
      return json({
        error: "invalid_service_id",
        message: "service_id is required",
      }, 400);
    }

    const baseUrl = getEnv("SUPABASE_URL") || getEnv("PROJECT_URL");
    if (!baseUrl) {
      return json({
        error: "misconfigured",
        message: "SUPABASE_URL/PROJECT_URL not configured",
      }, 500);
    }
    console.log(
      `[api/pix/resolve] Forwarding to: ${baseUrl}/functions/v1/mp-get-pix-data`,
    );

    let upstream: Response;
    try {
      upstream = await fetch(`${baseUrl}/functions/v1/mp-get-pix-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": req.headers.get("Authorization") ?? "",
          "x-trace-id": req.headers.get("x-trace-id") ?? crypto.randomUUID(),
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      return json({
        error: "upstream_unreachable",
        message: String(e),
      }, 502);
    }

    const resText = await upstream.text();
    console.log(
      `[api/pix/resolve] Upstream response status: ${upstream.status}`,
    );

    try {
      const resData = JSON.parse(resText);
      return json(resData, upstream.status);
    } catch (e) {
      console.error(
        "[api/pix/resolve] Failed to parse upstream response:",
        resText,
      );
      return json({
        error: "upstream_error",
        message: "Invalid JSON from payment service",
        raw: resText.substring(0, 500),
      }, 502);
    }
  }

  if (
    req.method === "POST" &&
    /^\/tracking\/services\/[^/]+\/propose-schedule$/.test(path)
  ) {
    const appUser = "appUser" in auth ? auth.appUser : null;
    if (!appUser?.id) {
      return json(
        { error: "unauthorized", message: "User not authenticated" },
        401,
      );
    }

    const serviceId = decodeURIComponent(path.split("/")[3] ?? "").trim();
    if (!serviceId) {
      return json({
        error: "invalid_service_id",
        message: "Invalid service id",
      }, 400);
    }

    const body = await req.json().catch(() => ({} as JsonMap));
    const scheduledAtRaw = `${
      body["scheduledAt"] ?? body["scheduled_at"] ?? ""
    }`.trim();
    const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      return json({
        error: "invalid_scheduled_at",
        message: "Invalid scheduled date/time",
      }, 400);
    }

    const nowIso = new Date().toISOString();
    const scheduleExpiresAtIso = new Date(Date.now() + 30 * 60 * 1000)
      .toISOString();
    const { data: currentService, error: currentErr } = await admin
      .from("service_requests")
      .select(
        "id,provider_id,client_id,profession,description,location_type,status,scheduled_at,schedule_round,schedule_client_rounds,schedule_provider_rounds,schedule_proposed_by_user_id",
      )
      .eq("id", serviceId)
      .maybeSingle();
    if (currentErr) {
      return json(
        { error: "service_load_failed", message: currentErr.message },
        500,
      );
    }
    if (!currentService) {
      return json(
        { error: "service_not_found", message: "Service not found" },
        404,
      );
    }
    const callerRole = `${appUser.role ?? ""}`.toLowerCase().trim();
    const currentProviderId = Number(currentService["provider_id"] ?? 0);
    const currentClientId = Number(currentService["client_id"] ?? 0);
    const callerUserId = Number(appUser.id ?? 0);
    const canProviderClaimOpenSchedule = callerRole === "provider" &&
      Number.isFinite(callerUserId) &&
      callerUserId > 0 &&
      (!Number.isFinite(currentProviderId) || currentProviderId <= 0);
    const isProviderActor = Number.isFinite(callerUserId) &&
      callerUserId > 0 &&
      callerRole === "provider" &&
      (
        canProviderClaimOpenSchedule ||
        (Number.isFinite(currentProviderId) &&
          currentProviderId > 0 &&
          currentProviderId === callerUserId)
      );
    const isClientActor = Number.isFinite(currentClientId) &&
      currentClientId > 0 && currentClientId === callerUserId;
    if (!isProviderActor && !isClientActor) {
      return json(
        {
          error: "forbidden",
          message: "Only participants can propose schedule",
        },
        403,
      );
    }

    const currentStatus = `${currentService["status"] ?? ""}`.toLowerCase()
      .trim();
    if (
      ![
        "open_for_schedule",
        "schedule_proposed",
        "aguardando_resposta",
        "awaiting_provider_response",
      ].includes(currentStatus)
    ) {
      return json(
        {
          error: "invalid_schedule_state",
          message: "Service is not in a schedule negotiation state",
        },
        409,
      );
    }

    const negotiation = buildScheduleNegotiationState(
      currentService as JsonMap,
    );
    if (negotiation.totalRounds >= 10) {
      return json(
        {
          error: "schedule_negotiation_limit_reached",
          message: "Maximum schedule negotiation rounds reached",
          negotiation,
        },
        409,
      );
    }
    if (isClientActor && negotiation.clientRounds >= 5) {
      return json(
        {
          error: "schedule_negotiation_client_limit_reached",
          message: "Client reached schedule negotiation limit",
          negotiation,
        },
        409,
      );
    }
    if (isProviderActor && negotiation.providerRounds >= 5) {
      return json(
        {
          error: "schedule_negotiation_provider_limit_reached",
          message: "Provider reached schedule negotiation limit",
          negotiation,
        },
        409,
      );
    }

    const nextClientRounds = negotiation.clientRounds + (isClientActor ? 1 : 0);
    const nextProviderRounds = negotiation.providerRounds +
      (isProviderActor ? 1 : 0);
    const nextTotalRounds = negotiation.totalRounds + 1;

    const nextProviderId =
      callerRole === "provider" && Number.isFinite(callerUserId) &&
        callerUserId > 0
        ? callerUserId
        : (Number.isFinite(currentProviderId) && currentProviderId > 0
          ? currentProviderId
          : null);

    let updateFilter = admin
      .from("service_requests")
      .update({
        status: "schedule_proposed",
        scheduled_at: scheduledAt.toISOString(),
        status_updated_at: nowIso,
        provider_id: nextProviderId,
        schedule_proposed_by_user_id: callerUserId,
        schedule_expires_at: scheduleExpiresAtIso,
        schedule_client_rounds: nextClientRounds,
        schedule_provider_rounds: nextProviderRounds,
        schedule_round: nextTotalRounds,
      })
      .eq("id", serviceId)
      .eq("schedule_round", negotiation.totalRounds)
      .select("id");
    if (isProviderActor) {
      updateFilter = Number.isFinite(currentProviderId) && currentProviderId > 0
        ? updateFilter.eq("provider_id", callerUserId)
        : updateFilter.is("provider_id", null);
    } else {
      updateFilter = updateFilter.eq("client_id", callerUserId);
    }
    const { data: updatedRows, error: updateErr } = await updateFilter;
    if (updateErr) {
      return json(
        { error: "propose_schedule_failed", message: updateErr.message },
        500,
      );
    }
    if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
      return json(
        {
          error: "propose_schedule_conflict",
          message:
            "Service changed during schedule negotiation. Refresh and try again.",
        },
        409,
      );
    }

    // Sincroniza com agendamento_servico se existir
    await syncAgendamentoStatus(admin, serviceId, "schedule_proposed", {
      scheduled_at: scheduledAt.toISOString(),
    });

    await logServiceEvent(admin, serviceId, "SCHEDULE_PROPOSED", {
      scheduled_at: scheduledAt.toISOString(),
      schedule_expires_at: scheduleExpiresAtIso,
      proposed_by_user_id: appUser.id,
      proposed_by_role: callerRole,
      provider_id_after: nextProviderId,
      schedule_client_rounds: nextClientRounds,
      schedule_provider_rounds: nextProviderRounds,
      schedule_round: nextTotalRounds,
    });

    const notificationRecipientId = isProviderActor
      ? currentClientId
      : nextProviderId;
    const notificationTitle = isProviderActor
      ? "Proposta de agendamento"
      : "Cliente sugeriu outro horario";
    const notificationBody = isProviderActor
      ? `${buildSchedulePushLabel(currentService as JsonMap)} sugerido para ${
        formatSchedulePushDate(scheduledAt.toISOString())
      }. Responda ate ${formatSchedulePushDate(scheduleExpiresAtIso)}.`
      : `Novo horario sugerido para ${
        formatSchedulePushDate(scheduledAt.toISOString())
      }. Responda ate ${formatSchedulePushDate(scheduleExpiresAtIso)}.`;
    await pushUserNotification(
      Number(notificationRecipientId ?? 0),
      notificationTitle,
      notificationBody,
      {
        id: serviceId,
        service_id: serviceId,
        scheduled_at: scheduledAt.toISOString(),
        schedule_expires_at: scheduleExpiresAtIso,
        proposed_by_user_id: callerUserId,
        schedule_round: nextTotalRounds,
        schedule_client_rounds: nextClientRounds,
        schedule_provider_rounds: nextProviderRounds,
        location_type: `${currentService["location_type"] ?? ""}`.trim(),
      },
    );

    return ok({
      success: true,
      service_id: serviceId,
      status: "schedule_proposed",
      negotiation: {
        clientRounds: nextClientRounds,
        providerRounds: nextProviderRounds,
        totalRounds: nextTotalRounds,
        remainingClientRounds: Math.max(0, 5 - nextClientRounds),
        remainingProviderRounds: Math.max(0, 5 - nextProviderRounds),
        remainingTotalRounds: Math.max(0, 10 - nextTotalRounds),
      },
    });
  }

  if (
    req.method === "POST" &&
    /^\/tracking\/services\/[^/]+\/confirm-schedule$/.test(path)
  ) {
    const appUser = "appUser" in auth ? auth.appUser : null;
    if (!appUser?.id) {
      return json(
        { error: "unauthorized", message: "User not authenticated" },
        401,
      );
    }

    const serviceId = decodeURIComponent(path.split("/")[3] ?? "").trim();
    if (!serviceId) {
      return json({
        error: "invalid_service_id",
        message: "Invalid service id",
      }, 400);
    }

    const body = await req.json().catch(() => ({} as JsonMap));
    const scheduledAtRaw = `${
      body["scheduledAt"] ?? body["scheduled_at"] ?? ""
    }`.trim();
    const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      return json({
        error: "invalid_scheduled_at",
        message: "Invalid scheduled date/time",
      }, 400);
    }

    const nowIso = new Date().toISOString();
    const { data: currentService, error: currentErr } = await admin
      .from("service_requests")
      .select(
        "id,provider_id,client_id,status,scheduled_at,schedule_proposed_by_user_id,schedule_round,schedule_client_rounds,schedule_provider_rounds",
      )
      .eq("id", serviceId)
      .maybeSingle();
    if (currentErr) {
      return json(
        { error: "service_load_failed", message: currentErr.message },
        500,
      );
    }
    if (!currentService) {
      return json(
        { error: "service_not_found", message: "Service not found" },
        404,
      );
    }
    const callerUserId = Number(appUser.id ?? 0);
    const currentProviderId = Number(currentService["provider_id"] ?? 0);
    const currentClientId = Number(currentService["client_id"] ?? 0);
    const isProviderActor = Number.isFinite(currentProviderId) &&
      currentProviderId > 0 && currentProviderId === callerUserId;
    const isClientActor = Number.isFinite(currentClientId) &&
      currentClientId > 0 && currentClientId === callerUserId;
    if (!isProviderActor && !isClientActor) {
      return json(
        {
          error: "forbidden",
          message: "Only participants can confirm schedule",
        },
        403,
      );
    }
    const proposerId = Number(
      currentService["schedule_proposed_by_user_id"] ?? 0,
    );
    if (
      Number.isFinite(proposerId) && proposerId > 0 &&
      proposerId === callerUserId
    ) {
      return json(
        {
          error: "invalid_schedule_confirmation_actor",
          message: "User who proposed the schedule cannot confirm it",
        },
        409,
      );
    }

    const negotiation = buildScheduleNegotiationState(
      currentService as JsonMap,
    );

    const { error } = await admin
      .from("service_requests")
      .update({
        status: "scheduled",
        scheduled_at: scheduledAt.toISOString(),
        status_updated_at: nowIso,
        schedule_confirmed_at: nowIso,
      })
      .eq("id", serviceId);
    if (error) {
      return json(
        { error: "confirm_schedule_failed", message: error.message },
        500,
      );
    }

    // Sincroniza com agendamento_servico se existir
    await syncAgendamentoStatus(admin, serviceId, "scheduled", {
      scheduled_at: scheduledAt.toISOString(),
    });

    await logServiceEvent(admin, serviceId, "SCHEDULE_CONFIRMED", {
      scheduled_at: scheduledAt.toISOString(),
      confirmed_by_user_id: appUser.id,
      schedule_round: negotiation.totalRounds,
      schedule_client_rounds: negotiation.clientRounds,
      schedule_provider_rounds: negotiation.providerRounds,
    });

    return ok({
      success: true,
      service_id: serviceId,
      status: "scheduled",
      negotiation,
    });
  }

  if (req.method === "GET" && path === "/service-disputes") {
    const serviceIdEq = (url.searchParams.get("service_id_eq") ?? "").trim();
    const userIdEq = (url.searchParams.get("user_id_eq") ?? "").trim();
    const typeEq = (url.searchParams.get("type_eq") ?? "").trim();
    const statusEq = (url.searchParams.get("status_eq") ?? "").trim();
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") ?? "50"), 1),
      200,
    );

    let q = admin.from("service_disputes").select("*").limit(limit);
    if (serviceIdEq) {
      if (!isUuidLike(serviceIdEq)) return ok([]);
      q = q.eq("service_id", serviceIdEq);
    }
    if (userIdEq) {
      const parsed = Number(userIdEq);
      if (Number.isFinite(parsed)) q = q.eq("user_id", parsed);
    }
    if (typeEq) q = q.eq("type", typeEq);
    if (statusEq) q = q.eq("status", statusEq);

    const orderParam = (url.searchParams.get("order") ?? "").trim();
    if (orderParam.startsWith("created_at")) {
      q = q.order("created_at", { ascending: !orderParam.endsWith(".desc") });
    }

    const { data, error } = await q;
    if (error) {
      return json({
        error: "service_disputes_fetch_failed",
        message: error.message,
      }, 500);
    }
    return ok((data ?? []) as JsonMap[]);
  }

  if (req.method === "POST" && path === "/service-disputes") {
    const body = await req.json().catch(() => ({} as JsonMap));
    const payload: JsonMap = {
      service_id: `${body["service_id"] ?? ""}`.trim(),
      user_id: Number(body["user_id"] ?? 0),
      type: `${body["type"] ?? "complaint"}`.trim() || "complaint",
      reason: `${body["reason"] ?? ""}`.trim(),
      status: `${body["status"] ?? "open"}`.trim() || "open",
      evidence_url: `${body["evidence_url"] ?? ""}`.trim() || null,
      created_at: `${body["created_at"] ?? ""}`.trim() ||
        new Date().toISOString(),
    };

    if (
      !payload.service_id || !Number.isFinite(payload.user_id as number) ||
      (payload.user_id as number) <= 0
    ) {
      return json({
        error: "invalid_payload",
        message: "service_id and user_id are required",
      }, 400);
    }

    const { data, error } = await admin.from("service_disputes").insert(payload)
      .select("*").single();
    if (error) {
      return json({
        error: "service_disputes_create_failed",
        message: error.message,
      }, 500);
    }
    return ok((data ?? {}) as JsonMap);
  }

  if (req.method === "GET" && path === "/services") {
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") ?? "200"), 1),
      1000,
    );
    let q = admin.from("service_requests").select("*").limit(limit);
    const appUser = "appUser" in auth ? auth.appUser : null;
    const role = `${appUser?.role ?? ""}`.toLowerCase().trim();

    const userIdEq = (url.searchParams.get("user_id_eq") ?? "").trim();
    const providerIdEq = (url.searchParams.get("provider_id_eq") ?? "").trim();
    const statusIn = (url.searchParams.get("status_in") ?? "").trim();
    if (userIdEq) {
      const parsed = Number(userIdEq);
      if (Number.isFinite(parsed)) q = q.eq("client_id", parsed);
    }
    if (providerIdEq) {
      const parsed = Number(providerIdEq);
      if (Number.isFinite(parsed)) q = q.eq("provider_id", parsed);
    }
    if (!userIdEq && !providerIdEq && appUser?.id) {
      const idNum = Number(appUser.id);
      if (Number.isFinite(idNum) && idNum > 0) {
        if (role == "provider") {
          q = q.eq("provider_id", idNum);
        } else {
          q = q.eq("client_id", idNum);
        }
      }
    }

    const statusEq = (url.searchParams.get("status_eq") ?? "").trim();
    if (statusEq) q = q.eq("status", statusEq);
    if (statusIn) {
      const statuses = statusIn.split(",").map((s) => s.trim()).filter(Boolean);
      if (statuses.length > 0) q = q.in("status", statuses);
    }

    const orderParam = (url.searchParams.get("order") ?? "").trim();
    if (orderParam.startsWith("created_at")) {
      q = q.order("created_at", { ascending: !orderParam.endsWith(".desc") });
    } else {
      q = q.order("created_at", { ascending: false });
    }

    const { data, error } = await q;
    if (error) {
      return json(
        { error: "services_fetch_failed", message: error.message },
        500,
      );
    }
    const now = Date.now();
    const normalized = ((data ?? []) as JsonMap[]).map((row) => {
      const expiresAtRaw = `${row["schedule_expires_at"] ?? ""}`.trim();
      const expiresAtFallback = (() => {
        const scheduledRaw = `${row["scheduled_at"] ?? ""}`.trim();
        if (!scheduledRaw) return NaN;
        const ts = Date.parse(scheduledRaw);
        if (!Number.isFinite(ts)) return NaN;
        return ts + (30 * 60 * 1000);
      })();
      const expiresAt = expiresAtRaw
        ? Date.parse(expiresAtRaw)
        : expiresAtFallback;
      const expired = Number.isFinite(expiresAt) ? expiresAt < now : false;
      return {
        ...row,
        is_schedule_expired: expired,
      };
    });
    if (role === "provider") {
      for (const row of normalized) {
        const status = `${row["status"] ?? ""}`.toLowerCase().trim();
        if (status !== "schedule_proposed") continue;
        const serviceId = `${row["id"] ?? ""}`.trim();
        if (!serviceId) continue;
        const event = row["is_schedule_expired"] == true
          ? "SCHEDULE_EXPIRED_VISIBLE"
          : "SCHEDULE_VISIBLE_PROVIDER";
        await logServiceEvent(admin, serviceId, event, {
          provider_id: appUser?.id ?? null,
          status,
          scheduled_at: row["scheduled_at"] ?? null,
          schedule_expires_at: row["schedule_expires_at"] ?? null,
          is_schedule_expired: row["is_schedule_expired"] == true,
        });
      }
    }
    return ok(normalized as JsonMap[]);
  }

  if (req.method === "POST" && path === "/providers/heartbeat") {
    const appUser = "appUser" in auth ? auth.appUser : null;
    if (!appUser?.id) {
      return json(
        { error: "unauthorized", message: "User not authenticated" },
        401,
      );
    }

    let body: JsonMap = {};
    try {
      body = (await req.json()) as JsonMap;
    } catch {
      body = {};
    }

    const latitude = Number(body["latitude"] ?? body["lat"] ?? NaN);
    const longitude = Number(body["longitude"] ?? body["lon"] ?? NaN);
    const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);

    const nowIso = new Date().toISOString();
    await admin
      .from("users")
      .update({
        updated_at: nowIso,
        is_online: true,
        last_seen_at: nowIso,
      })
      .eq("id", appUser.id);

    if (hasCoords) {
      await admin
        .from("provider_locations")
        .upsert(
          {
            provider_id: appUser.id,
            provider_uid: appUser.supabaseUid ?? null,
            latitude,
            longitude,
            updated_at: nowIso,
          },
          { onConflict: "provider_id" },
        );

      // Compatibilidade com legado que ainda lê driver_locations.
      await admin
        .from("driver_locations")
        .upsert(
          {
            driver_id: appUser.id,
            latitude,
            longitude,
            updated_at: nowIso,
          },
          { onConflict: "driver_id" },
        );
    }

    return ok({ success: true, heartbeatAt: nowIso, hasCoords });
  }

  if (req.method === "GET" && path === "/providers/location") {
    const uid = (url.searchParams.get("uid") ?? "").trim();
    if (!uid) {
      return json({
        error: "invalid_uid",
        message: "uid query param is required",
      }, 400);
    }
    const { data, error } = await admin
      .from("provider_locations")
      .select("provider_id,provider_uid,latitude,longitude,updated_at")
      .eq("provider_uid", uid)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      return json({
        error: "provider_location_fetch_failed",
        message: error.message,
      }, 500);
    }
    if (!data) return ok(null);
    return ok(data as JsonMap);
  }

  if (req.method === "GET" && /^\/providers\/\d+\/location$/.test(path)) {
    const providerId = Number(path.split("/")[2] ?? "0");
    if (!Number.isFinite(providerId) || providerId <= 0) {
      return json({
        error: "invalid_provider_id",
        message: "Invalid provider id",
      }, 400);
    }
    const { data, error } = await admin
      .from("provider_locations")
      .select("provider_id,provider_uid,latitude,longitude,updated_at")
      .eq("provider_id", providerId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      return json({
        error: "provider_location_fetch_failed",
        message: error.message,
      }, 500);
    }
    if (!data) return ok(null);
    return ok(data as JsonMap);
  }

  if (req.method === "PUT" && path === "/users/me/last-seen") {
    const appUser = "appUser" in auth ? auth.appUser : null;
    if (!appUser?.id) {
      return json(
        { error: "unauthorized", message: "User not authenticated" },
        401,
      );
    }
    let body: JsonMap = {};
    try {
      body = (await req.json()) as JsonMap;
    } catch {
      body = {};
    }
    const nowIso = new Date().toISOString();
    const lastSeenAtRaw = `${body["last_seen_at"] ?? ""}`.trim();
    const lastSeenAt = lastSeenAtRaw || nowIso;
    const { error } = await admin
      .from("users")
      .update({ last_seen_at: lastSeenAt, updated_at: nowIso })
      .eq("id", appUser.id);
    if (error) {
      return json(
        { error: "last_seen_update_failed", message: error.message },
        500,
      );
    }
    return ok({ success: true, user_id: appUser.id, last_seen_at: lastSeenAt });
  }

  if (req.method === "PUT" && /^\/users\/\d+\/last-seen$/.test(path)) {
    const userId = Number(path.split("/")[2] ?? "0");
    if (!Number.isFinite(userId) || userId <= 0) {
      return json(
        { error: "invalid_user_id", message: "Invalid user id" },
        400,
      );
    }
    let body: JsonMap = {};
    try {
      body = (await req.json()) as JsonMap;
    } catch {
      body = {};
    }
    const nowIso = new Date().toISOString();
    const lastSeenAtRaw = `${body["last_seen_at"] ?? ""}`.trim();
    const lastSeenAt = lastSeenAtRaw || nowIso;
    const { error } = await admin
      .from("users")
      .update({ last_seen_at: lastSeenAt, updated_at: nowIso })
      .eq("id", userId);
    if (error) {
      return json(
        { error: "last_seen_update_failed", message: error.message },
        500,
      );
    }
    return ok({ success: true, user_id: userId, last_seen_at: lastSeenAt });
  }

  if (req.method === "GET" && path === "/services/available") {
    try {
      const appUser = "appUser" in auth ? auth.appUser : null;
      if (!appUser?.id) {
        return json({
          error: "unauthorized",
          message: "User not authenticated",
        }, 401);
      }
      const providerUserId = await resolveNumericUserId(admin, appUser);
      if (!providerUserId) return ok([]);

      const notifTable = await resolveNotifTable(admin);
      const { data: notifications, error } = await admin
        .from(notifTable)
        .select("*")
        .eq("provider_user_id", providerUserId)
        .in("status", [
          "queued",
          "sent",
          "pending",
          "retry_ready",
          "notified",
          "timeout_exhausted",
          "skipped_permanent_push",
          "rejected",
        ])
        .order("queue_order", { ascending: true })
        .limit(50);

      if (error) {
        return json({
          error: "available_services_fetch_failed",
          message: error.message,
        }, 500);
      }

      const rawNotifications = (notifications ?? []) as JsonMap[];
      const rawServiceIds = rawNotifications
        .map((row) => `${row["service_id"] ?? ""}`.trim())
        .filter((v) => v.length > 0);
      const dispatchSnapshot = await evaluateDispatchActivity(
        admin,
        notifTable,
        Array.from(new Set(rawServiceIds)),
      );
      if (
        dispatchSnapshot.staleQueueRows.length > 0 ||
        dispatchSnapshot.staleNotifRows.length > 0
      ) {
        await autoHealStaleDispatchRows(admin, notifTable, dispatchSnapshot);
      }
      const activeIds = new Set<string>([
        ...dispatchSnapshot.activeQueueRows.map((row) =>
          `${row["service_id"] ?? ""}`.trim()
        ).filter(Boolean),
        ...dispatchSnapshot.activeNotifRows.map((row) =>
          `${row["service_id"] ?? ""}`.trim()
        ).filter(Boolean),
      ]);
      const blockedStatuses = new Set([
        "queued",
        "sent",
        "pending",
        "retry_ready",
        "notified",
        "accepted",
      ]);
      const filteredNotifications = rawNotifications.filter((row) => {
        const serviceId = `${row["service_id"] ?? ""}`.trim();
        const status = `${row["status"] ?? ""}`.toLowerCase().trim();
        if (!serviceId) return false;
        // Enquanto houver ciclo ativo de notificação, não exibir em "Disponíveis".
        if (activeIds.has(serviceId)) return false;
        if (blockedStatuses.has(status)) return false;
        return true;
      });
      const serviceIds = Array.from(
        new Set(
          filteredNotifications
            .map((row) => `${row["service_id"] ?? ""}`.trim())
            .filter((id) => id.length > 0),
        ),
      );

      // Complemento: serviços em open_for_schedule elegíveis por profissão.
      const waitingIds = new Set<string>();
      try {
        const { data: providerProfRows } = await admin
          .from("provider_professions")
          .select("profession_id")
          .eq("provider_user_id", providerUserId);
        const professionIds = ((providerProfRows ?? []) as JsonMap[])
          .map((row) => Number(row["profession_id"] ?? 0))
          .filter((id) => Number.isFinite(id) && id > 0);

        if (professionIds.length > 0) {
          const { data: waitingRows } = await admin
            .from("service_requests")
            .select("id,task_id,status,provider_id")
            .in("status", ["open_for_schedule", "aguardando_resposta"])
            .is("provider_id", null)
            .order("created_at", { ascending: false })
            .limit(100);

          const taskIds = ((waitingRows ?? []) as JsonMap[])
            .map((row) => Number(row["task_id"] ?? 0))
            .filter((id) => Number.isFinite(id) && id > 0);
          const taskToProfession = new Map<number, number>();
          if (taskIds.length > 0) {
            const { data: taskRows } = await admin
              .from("task_catalog")
              .select("id,profession_id")
              .in("id", taskIds);
            for (const row of ((taskRows ?? []) as JsonMap[])) {
              const tid = Number(row["id"] ?? 0);
              const pid = Number(row["profession_id"] ?? 0);
              if (tid > 0 && pid > 0) taskToProfession.set(tid, pid);
            }
          }
          for (const row of ((waitingRows ?? []) as JsonMap[])) {
            const id = `${row["id"] ?? ""}`.trim();
            const tid = Number(row["task_id"] ?? 0);
            const profId = taskToProfession.get(tid);
            if (!id || profId == null) continue;
            if (professionIds.includes(profId)) waitingIds.add(id);
          }
        }
      } catch {
        // Non-blocking enrichment; keep base queue results.
      }

      for (const id of waitingIds) {
        if (!serviceIds.includes(id)) serviceIds.push(id);
      }

      if (serviceIds.length === 0) return ok([]);

      const { data: services } = await admin
        .from("service_requests")
        .select("*")
        .in("id", serviceIds);

      const serviceById = new Map<string, JsonMap>();
      for (const row of ((services ?? []) as JsonMap[])) {
        if (isTerminalServiceStatus(row["status"])) continue;
        serviceById.set(`${row["id"] ?? ""}`.trim(), row);
      }

      const result = filteredNotifications.map((n) => {
        const serviceId = `${n["service_id"] ?? ""}`.trim();
        const linked = serviceById.get(serviceId) ?? null;
        if (!linked) return null;
        return {
          ...n,
          service: linked,
        };
      }).filter((row) => row !== null) as JsonMap[];

      // Garante vitrine de agendamento mesmo sem linha ativa na fila runtime.
      for (const waitingId of waitingIds) {
        const linked = serviceById.get(waitingId);
        if (!linked) continue;
        const exists = result.some((row) =>
          `${row["service_id"] ?? ""}`.trim() === waitingId
        );
        if (exists) continue;
        result.push({
          id: null,
          service_id: waitingId,
          provider_user_id: providerUserId,
          status: "open_for_schedule",
          queue_order: null,
          attempt_no: null,
          max_attempts: null,
          response_deadline_at: null,
          service: linked,
        } as JsonMap);
      }
      console.info(
        JSON.stringify({
          event: "services_available_dispatch_filter",
          provider_user_id: providerUserId,
          active_ids: activeIds.size,
          stale_queue_rows: dispatchSnapshot.staleQueueRows.length,
          stale_notif_rows: dispatchSnapshot.staleNotifRows.length,
          notifications_input: rawNotifications.length,
          notifications_visible: filteredNotifications.length,
          waiting_ids: waitingIds.size,
        }),
      );
      return ok(result);
    } catch (e) {
      console.error(
        "[api/services/available] fallback due to unexpected error:",
        e,
      );
      return ok([]);
    }
  }

  if (req.method === "GET" && path === "/chat/participants") {
    const serviceIdEq = (url.searchParams.get("service_id_eq") ?? "").trim();
    if (!serviceIdEq) return ok([]);
    const { data, error } = await admin
      .from("service_chat_participants")
      .select(
        "service_id,role,user_id,display_name,avatar_url,phone,can_send,is_primary_operational_contact",
      )
      .eq("service_id", serviceIdEq)
      .order("is_primary_operational_contact", { ascending: false });
    if (error) {
      return json({
        error: "chat_participants_fetch_failed",
        message: error.message,
      }, 500);
    }
    return ok((data ?? []) as JsonMap[]);
  }

  if (req.method === "GET" && path === "/chat/conversations") {
    const appUser = "appUser" in auth ? auth.appUser : null;
    if (!appUser?.id) {
      return json(
        { error: "unauthorized", message: "User not authenticated" },
        401,
      );
    }
    const userId = await resolveNumericUserId(admin, appUser);
    if (!userId) return ok([]);

    const { data: participantRows, error: participantErr } = await admin
      .from("service_chat_participants")
      .select("service_id")
      .eq("user_id", userId);
    if (participantErr) {
      return json({
        error: "chat_conversations_fetch_failed",
        message: participantErr.message,
      }, 500);
    }
    const serviceIds = ((participantRows ?? []) as JsonMap[])
      .map((row) => `${row["service_id"] ?? ""}`.trim())
      .filter((id) => id.length > 0);
    if (serviceIds.length === 0) return ok([]);

    const { data: services, error: servicesErr } = await admin
      .from("service_requests")
      .select("*")
      .in("id", Array.from(new Set(serviceIds)))
      .order("created_at", { ascending: false });
    if (servicesErr) {
      return json({
        error: "chat_conversations_services_fetch_failed",
        message: servicesErr.message,
      }, 500);
    }
    return ok((services ?? []) as JsonMap[]);
  }

  if (req.method === "POST" && path === "/chat/participants/sync") {
    const appUser = "appUser" in auth ? auth.appUser : null;
    if (!appUser?.id) {
      return json(
        { error: "unauthorized", message: "User not authenticated" },
        401,
      );
    }
    const body = await req.json().catch(() => ({} as JsonMap));
    const serviceId = `${body["service_id"] ?? body["serviceId"] ?? ""}`.trim();
    if (!serviceId) {
      return json({ error: "missing_service_id" }, 400);
    }

    console.log(
      `[chat/sync] Request for serviceId: ${serviceId}, user: ${appUser?.id}`,
    );

    // 1. Resolve participants from service_requests or agendamento_servico
    let clientUserId: number | null = null;
    let providerUserId: number | null = null;

    // Check service_requests (mobile)
    const { data: sReq, error: sErr } = await admin
      .from("service_requests")
      .select("client_id, provider_id")
      .eq("id", serviceId)
      .maybeSingle();

    if (sReq) {
      console.log(
        `[chat/sync] Found in service_requests: client=${sReq.client_id}, provider=${sReq.provider_id}`,
      );
      clientUserId = Number(sReq.client_id);
      providerUserId = Number(sReq.provider_id);
    } else {
      console.log(
        `[chat/sync] Not in service_requests, checking agendamento_servico...`,
      );
      // Check agendamento_servico (fixed)
      const { data: aReq, error: aErr } = await admin
        .from("agendamento_servico")
        .select("cliente_uid, prestador_uid")
        .eq("id", serviceId)
        .maybeSingle();

      if (aReq) {
        console.log(
          `[chat/sync] Found in agendamento_servico: client_uid=${aReq.cliente_uid}, provider_uid=${aReq.prestador_uid}`,
        );
        // Need to resolve numeric IDs for agendamento participants if they are UIDs
        const [c, p] = await Promise.all([
          admin.from("users").select("id").eq("supabase_uid", aReq.cliente_uid)
            .maybeSingle(),
          admin.from("users").select("id").eq(
            "supabase_uid",
            aReq.prestador_uid,
          ).maybeSingle(),
        ]);
        clientUserId = c.data?.id ? Number(c.data.id) : null;
        providerUserId = p.data?.id ? Number(p.data.id) : null;
        console.log(
          `[chat/sync] Resolved numeric IDs: client=${clientUserId}, provider=${providerUserId}`,
        );
      } else if (aErr) {
        console.error(`[chat/sync] Error checking agendamento_servico:`, aErr);
      }
    }

    if (!clientUserId) {
      console.warn(
        `[chat/sync] Service not found or no participants resolved for ${serviceId}`,
      );
      return json({ error: "service_not_found_or_no_participants" }, 404);
    }

    // 2. Upsert participants
    const participantsToSync = [
      { id: clientUserId, role: "client" },
      { id: providerUserId, role: "provider" },
    ].filter((p) => p.id != null);

    for (const p of participantsToSync) {
      const { data: userData } = await admin
        .from("users")
        .select("id, full_name, avatar_url, phone")
        .eq("id", p.id)
        .maybeSingle();

      if (userData) {
        await admin.from("service_chat_participants").upsert({
          service_id: serviceId,
          user_id: userData.id,
          role: p.role,
          display_name: userData.full_name,
          avatar_url: userData.avatar_url,
          phone: userData.phone,
          can_send: true,
          is_primary_operational_contact: p.role === "provider",
        }, {
          onConflict: "service_id,user_id",
        });
      }
    }

    return ok({ success: true, service_id: serviceId });
  }

  if (req.method === "GET" && path === "/providers/schedule/available") {
    // Compatibilidade: mesmo contrato lógico de serviços disponíveis para prestador.
    const appUser = "appUser" in auth ? auth.appUser : null;
    if (!appUser?.id) {
      return json(
        { error: "unauthorized", message: "User not authenticated" },
        401,
      );
    }
    const providerUserId = await resolveNumericUserId(admin, appUser);
    if (!providerUserId) return ok([]);
    const notifTable = await resolveNotifTable(admin);
    const { data, error } = await admin
      .from(notifTable)
      .select("*")
      .eq("provider_user_id", providerUserId)
      .in("status", [
        "queued",
        "sent",
        "pending",
        "retry_ready",
        "sending",
        "notified",
      ])
      .order("queue_order", { ascending: true })
      .limit(50);
    if (error) {
      return json({
        error: "provider_schedule_available_fetch_failed",
        message: error.message,
      }, 500);
    }
    const queueRows = (data ?? []) as JsonMap[];

    // Complemento: status open_for_schedule elegível por profissão.
    const waitingServices: JsonMap[] = [];
    try {
      const { data: providerProfRows } = await admin
        .from("provider_professions")
        .select("profession_id")
        .eq("provider_user_id", providerUserId);
      const professionIds = ((providerProfRows ?? []) as JsonMap[])
        .map((row) => Number(row["profession_id"] ?? 0))
        .filter((id) => Number.isFinite(id) && id > 0);

      if (professionIds.length > 0) {
        const { data: waitingRows } = await admin
          .from("service_requests")
          .select(
            "id,task_id,status,provider_id,description,price_estimated,latitude,longitude,address,created_at",
          )
          .in("status", ["open_for_schedule", "aguardando_resposta"])
          .is("provider_id", null)
          .order("created_at", { ascending: false })
          .limit(100);

        const taskIds = ((waitingRows ?? []) as JsonMap[])
          .map((row) => Number(row["task_id"] ?? 0))
          .filter((id) => Number.isFinite(id) && id > 0);
        const taskToProfession = new Map<number, number>();
        if (taskIds.length > 0) {
          const { data: taskRows } = await admin
            .from("task_catalog")
            .select("id,profession_id")
            .in("id", taskIds);
          for (const row of ((taskRows ?? []) as JsonMap[])) {
            const tid = Number(row["id"] ?? 0);
            const pid = Number(row["profession_id"] ?? 0);
            if (tid > 0 && pid > 0) taskToProfession.set(tid, pid);
          }
        }

        for (const row of ((waitingRows ?? []) as JsonMap[])) {
          const sid = `${row["id"] ?? ""}`.trim();
          const tid = Number(row["task_id"] ?? 0);
          const profId = taskToProfession.get(tid);
          if (!sid || profId == null || !professionIds.includes(profId)) {
            continue;
          }
          waitingServices.push({
            service_id: sid,
            provider_user_id: providerUserId,
            status: "awaiting_provider_response",
            queue_order: 9999,
            attempt_no: null,
            max_attempts: 3,
            service_name: `${row["description"] ?? "Serviço"}`,
            profession_id: profId,
            price_total: row["price_estimated"] ?? null,
            price_provider: null,
            distance: null,
            created_at: row["created_at"] ?? null,
          });
        }
      }
    } catch {
      // Non-blocking enrichment; keep base queue results.
    }

    const queueServiceIds = Array.from(
      new Set(
        queueRows.map((row) => `${row["service_id"] ?? ""}`.trim()).filter(
          Boolean,
        ),
      ),
    );
    let queueServiceById = new Map<string, JsonMap>();
    if (queueServiceIds.length > 0) {
      const { data: queueServices } = await admin
        .from("service_requests")
        .select("*")
        .in("id", queueServiceIds);
      queueServiceById = new Map(
        ((queueServices ?? []) as JsonMap[])
          .filter((service) => !isTerminalServiceStatus(service["status"]))
          .map((service) => [`${service["id"] ?? ""}`.trim(), service]),
      );
    }

    const visibleQueueRows = queueRows
      .map((row) => {
        const serviceId = `${row["service_id"] ?? ""}`.trim();
        const linked = queueServiceById.get(serviceId);
        if (!linked) return null;
        return {
          ...row,
          service: linked,
        } as JsonMap;
      })
      .filter((row) => row !== null) as JsonMap[];

    return ok([...visibleQueueRows, ...waitingServices] as JsonMap[]);
  }

  if (req.method === "GET" && path === "/dispatch/offers/rejected") {
    const providerUserIdEq = (url.searchParams.get("provider_user_id_eq") ?? "")
      .trim();
    const serviceIdIn = (url.searchParams.get("service_id_in") ?? "").trim();
    if (!providerUserIdEq || !serviceIdIn) return ok([]);

    const providerUserId = Number(providerUserIdEq);
    if (!Number.isFinite(providerUserId) || providerUserId <= 0) return ok([]);
    const serviceIds = serviceIdIn.split(",").map((v) => v.trim()).filter(
      Boolean,
    );
    if (serviceIds.length === 0) return ok([]);

    const notifTable = await resolveNotifTable(admin);
    const { data, error } = await admin
      .from(notifTable)
      .select("service_id,provider_user_id,status,answered_at,skip_reason")
      .eq("provider_user_id", providerUserId)
      .in("service_id", serviceIds)
      .in("status", [
        "rejected",
        "timeout_exhausted",
        "skipped_permanent_push",
      ]);

    if (error) {
      return json({
        error: "dispatch_offers_rejected_fetch_failed",
        message: error.message,
      }, 500);
    }
    return ok((data ?? []) as JsonMap[]);
  }

  if (req.method === "GET" && path === "/dispatch/queue/active") {
    const serviceIdIn = (url.searchParams.get("service_id_in") ?? "").trim();
    if (!serviceIdIn) return ok([]);
    const serviceIds = serviceIdIn.split(",").map((v) => v.trim()).filter(
      Boolean,
    );
    if (serviceIds.length === 0) return ok([]);

    const notifTable = await resolveNotifTable(admin);
    const snapshot = await evaluateDispatchActivity(
      admin,
      notifTable,
      serviceIds,
    );
    if (
      snapshot.staleQueueRows.length > 0 || snapshot.staleNotifRows.length > 0
    ) {
      await autoHealStaleDispatchRows(admin, notifTable, snapshot);
    }
    console.info(
      JSON.stringify({
        event: "dispatch_queue_active_filtered",
        service_ids: serviceIds.length,
        active_queue_rows: snapshot.activeQueueRows.length,
        stale_queue_rows: snapshot.staleQueueRows.length,
      }),
    );
    return ok(snapshot.activeQueueRows);
  }

  if (req.method === "GET" && path === "/dispatch/offers/active") {
    const serviceIdIn = (url.searchParams.get("service_id_in") ?? "").trim();
    if (!serviceIdIn) return ok([]);
    const serviceIds = serviceIdIn.split(",").map((v) => v.trim()).filter(
      Boolean,
    );
    if (serviceIds.length === 0) return ok([]);

    const notifTable = await resolveNotifTable(admin);
    const snapshot = await evaluateDispatchActivity(
      admin,
      notifTable,
      serviceIds,
    );
    if (
      snapshot.staleQueueRows.length > 0 || snapshot.staleNotifRows.length > 0
    ) {
      await autoHealStaleDispatchRows(admin, notifTable, snapshot);
    }
    console.info(
      JSON.stringify({
        event: "dispatch_offers_active_filtered",
        service_ids: serviceIds.length,
        active_notif_rows: snapshot.activeNotifRows.length,
        stale_notif_rows: snapshot.staleNotifRows.length,
      }),
    );
    return ok(snapshot.activeNotifRows);
  }

  if (req.method === "GET" && path === "/home/provider") {
    const appUser = "appUser" in auth ? auth.appUser : null;
    if (!appUser?.id) {
      return json(
        { error: "unauthorized", message: "User not authenticated" },
        401,
      );
    }
    const notifTable = await resolveNotifTable(admin);
    const { data: available } = await admin
      .from(notifTable)
      .select("id")
      .eq("provider_user_id", appUser.id)
      .in("status", ["queued", "sent", "pending"])
      .limit(1);
    return ok({
      snapshot: {
        provider: appUser,
        availableCount: (available ?? []).length,
      },
    });
  }

  if (req.method === "POST" && path === "/remote-ui/get-screen") {
    // Compatibilidade mínima para runtime legado do app.
    return ok({
      screen: null,
      blocks: [],
      actions: [],
    });
  }

  if (req.method === "POST" && path === "/services") {
    const body = await req.json().catch(() => ({} as JsonMap));
    const generatedId = newUuidV4();
    const allowedCols = new Set([
      "id",
      "client_id",
      "category_id",
      "task_id",
      "profession",
      "provider_id",
      "description",
      "status",
      "latitude",
      "longitude",
      "address",
      "price_estimated",
      "price_upfront",
      "scheduled_at",
      "created_at",
      "location_type",
      "arrived_at",
      "payment_remaining_status",
      "contest_reason",
      "contest_status",
      "contest_evidence",
      "validation_code",
      "proof_photo",
      "proof_video",
      "proof_code",
      "status_updated_at",
      "completed_at",
    ]);

    const normalizedPayload: JsonMap = {
      id: `${(body["id"] as string | undefined) ?? generatedId}`,
      status: `${body["status"] ?? "waiting_payment"}`,
      created_at: `${body["created_at"] ?? new Date().toISOString()}`,
    };

    for (const [k, v] of Object.entries(body)) {
      if (!allowedCols.has(k)) continue;
      normalizedPayload[k] = v;
    }

    const { data, error } = await admin.from("service_requests").insert(
      normalizedPayload,
    ).select("*").single();
    if (error) {
      return json(
        { error: "services_create_failed", message: error.message },
        500,
      );
    }
    const service = (data ?? {}) as JsonMap;
    const normalizedStatus = `${service["status"] ?? ""}`.toLowerCase().trim();
    let dispatchTrigger: Record<string, unknown> | null = null;
    if (normalizedStatus === "searching_provider") {
      dispatchTrigger = await triggerDispatchForSearchingProviderService(
        admin,
        `${service["id"] ?? ""}`.trim(),
      );
    }
    return ok({
      ...service,
      dispatch_trigger: dispatchTrigger,
    } as JsonMap);
  }

  const trackingServiceSnapshotMatch = path.match(
    /^\/tracking\/services\/([^/]+)\/snapshot$/,
  );
  if (req.method === "GET" && trackingServiceSnapshotMatch) {
    const serviceId = decodeURIComponent(trackingServiceSnapshotMatch[1] ?? "")
      .trim();
    if (!serviceId) {
      return json({
        error: "invalid_service_id",
        message: "Invalid service id",
      }, 400);
    }

    const { data: serviceRow, error: serviceErr } = await admin
      .from("service_requests")
      .select("*")
      .eq("id", serviceId)
      .maybeSingle();

    if (serviceErr) {
      console.error(
        `[tracking/snapshot] DB error for ${serviceId}:`,
        serviceErr,
      );
      return json({
        error: "tracking_snapshot_fetch_failed",
        message: serviceErr.message,
      }, 500);
    }

    if (serviceRow) {
      console.log(
        `[tracking/snapshot] Found service ${serviceId} with status: ${serviceRow.status}`,
      );
    } else {
      console.warn(
        `[tracking/snapshot] Service ${serviceId} NOT FOUND in service_requests`,
      );
    }
    if (!serviceRow) {
      return json({
        error: "not_found",
        message: `Service not found: ${serviceId}`,
      }, 404);
    }

    const serviceMap = (serviceRow ?? {}) as JsonMap;
    const status = normalizeStatus(serviceMap["status"]);
    const providerId = Number(serviceMap["provider_id"] ?? 0);
    const taskId = Number(serviceMap["task_id"] ?? 0);

    let providerProfile: JsonMap | null = null;
    if (Number.isFinite(providerId) && providerId > 0) {
      const { data: providerRow } = await admin
        .from("users")
        .select(
          "id,full_name,commercial_name,avatar_url,profile_image_url,photo_url",
        )
        .eq("id", providerId)
        .maybeSingle();
      providerProfile = (providerRow ?? null) as JsonMap | null;
    }

    let taskMeta: JsonMap | null = null;
    if (Number.isFinite(taskId) && taskId > 0) {
      const { data: taskRow } = await admin
        .from("task_catalog")
        .select("id,name,profession_name")
        .eq("id", taskId)
        .maybeSingle();
      taskMeta = (taskRow ?? null) as JsonMap | null;
    }

    const enrichedService: JsonMap = {
      ...serviceMap,
      ...(providerProfile
        ? {
          provider: providerProfile,
          provider_name: `${
            providerProfile["commercial_name"] ??
              providerProfile["full_name"] ?? serviceMap["provider_name"] ??
              ""
          }`.trim() ||
            serviceMap["provider_name"],
          provider_avatar: `${
            providerProfile["avatar_url"] ??
              providerProfile["profile_image_url"] ??
              providerProfile["photo_url"] ?? serviceMap["provider_avatar"] ??
              ""
          }`.trim() ||
            serviceMap["provider_avatar"],
        }
        : {}),
      ...(taskMeta
        ? {
          task_name: taskMeta["name"] ?? serviceMap["task_name"],
          profession: taskMeta["profession_name"] ?? serviceMap["profession"],
          category_name: serviceMap["category_name"] ??
            taskMeta["profession_name"] ??
            taskMeta["name"],
        }
        : {}),
    };

    // Self-heal: when service is in searching_provider but runtime queue is empty,
    // trigger dispatch again to guarantee provider discovery flow continues.
    let dispatchTrigger: Record<string, unknown> | null = null;
    if (status === "searching_provider") {
      const notifTable = await resolveNotifTable(admin);
      const dispatchSnapshot = await evaluateDispatchActivity(
        admin,
        notifTable,
        [serviceId],
      );
      if (
        dispatchSnapshot.activeQueueRows.length === 0 &&
        dispatchSnapshot.activeNotifRows.length === 0
      ) {
        dispatchTrigger = await triggerDispatchForSearchingProviderService(
          admin,
          serviceId,
        );
        await logServiceEvent(
          admin,
          serviceId,
          "DISPATCH_TRIGGER_FROM_TRACKING_SNAPSHOT",
          {
            reason: "searching_provider_without_active_rows",
            triggered: dispatchTrigger?.triggered ?? false,
            dispatch_status: dispatchTrigger?.status ?? null,
          },
        );
      }
    }

    const paymentRemainingStatus = normalizeStatus(
      enrichedService["payment_remaining_status"],
    );
    const paymentStatus = normalizeStatus(enrichedService["payment_status"]);
    const remainingPaid = ["paid", "paid_manual", "approved"].includes(
      paymentRemainingStatus,
    );
    const entryPaid =
      ["paid", "partially_paid", "paid_manual"].includes(paymentStatus) ||
      [
        "searching_provider",
        "searching",
        "waiting_provider",
        "accepted",
        "provider_near",
        "arrived",
        "in_progress",
        "completion_requested",
        "waiting_client_confirmation",
        "awaiting_confirmation",
        "completed",
        "finished",
      ].includes(status);
    const completionCode = extractEffectiveCompletionCode(enrichedService);
    const isConcluding = [
      "completion_requested",
      "waiting_client_confirmation",
      "awaiting_confirmation",
    ].includes(status);

    const paymentSummary: JsonMap = {
      entryPaid,
      remainingPaid,
      showPayDeposit:
        ["waiting_payment", "awaiting_signal", "pending_payment"].includes(
          status,
        ) && !entryPaid,
      showPayRemaining:
        ["waiting_remaining_payment", "waiting_payment_remaining", "arrived"]
          .includes(status) && !remainingPaid,
      inSecurePaymentPhase:
        ["waiting_remaining_payment", "waiting_payment_remaining", "arrived"]
          .includes(status) && !remainingPaid,
      cancelBlockedByProximity: false,
      completionCode,
    };

    const finalActions: JsonMap = {
      showConfirm: isConcluding,
      showComplaint: isConcluding,
      showCompletionCode: completionCode.length > 0 &&
        (isConcluding || status === "in_progress"),
      completionCode,
      showCompletedMessage: status === "completed" || status === "finished",
      canCancel: ![
        "in_progress",
        "completion_requested",
        "waiting_client_confirmation",
        "awaiting_confirmation",
        "completed",
        "finished",
        "cancelled",
        "canceled",
      ].includes(status),
      headline: isConcluding ? "Prestador terminou o serviço" : null,
    };
    const callerRole = `${("appUser" in auth ? auth.appUser?.role : "") ?? ""}`
      .toLowerCase()
      .trim();
    const isProviderView = callerRole === "provider";
    const providerCanArrive = ["accepted", "provider_near", "scheduled"]
      .includes(status);
    const providerCanStart = (status === "waiting_remaining_payment" ||
      status === "waiting_payment_remaining") && remainingPaid;
    const providerCanRequestCompletion = status === "in_progress";
    const providerCanSubmitVideo = isConcluding || status === "in_progress";
    const providerCanUseNoCode = isConcluding || status === "in_progress";
    const providerCanConfirmFinal = isConcluding;
    const providerCanOpenComplaint = isConcluding;

    const stepperMode = status === "waiting_remaining_payment" ||
        status === "waiting_payment_remaining"
      ? "payment"
      : isConcluding
      ? "concluding"
      : "normal";

    const stepperStep = status === "accepted" || status === "provider_near" ||
        status === "scheduled"
      ? 1
      : status === "in_progress" || status === "waiting_remaining_payment" ||
          status === "waiting_payment_remaining"
      ? 2
      : isConcluding || status === "completed" || status === "finished"
      ? 3
      : 0;
    const ui: JsonMap = {
      role: isProviderView ? "provider" : "client",
      status,
      headline: isConcluding ? "Prestador terminou o serviço" : null,
      stage: status === "completed" || status === "finished"
        ? "completed"
        : isConcluding
        ? "awaiting_confirmation"
        : status === "in_progress"
        ? "in_progress"
        : "default",
      showConfirm: isConcluding,
      showComplaint: isConcluding,
      showCompletionCode: completionCode.length > 0 &&
        (isConcluding || status === "in_progress"),
      completionCode,
      showCompletedMessage: status === "completed" || status === "finished",
      canCancel: ![
        "in_progress",
        "completion_requested",
        "waiting_client_confirmation",
        "awaiting_confirmation",
        "completed",
        "finished",
        "cancelled",
        "canceled",
      ].includes(status),
      stepper: {
        step: stepperStep,
        mode: stepperMode,
      },
      actions: {
        arrive: {
          visible: isProviderView,
          enabled: providerCanArrive,
          reason: providerCanArrive ? null : "status_not_eligible",
        },
        start: {
          visible: isProviderView,
          enabled: providerCanStart,
          reason: providerCanStart ? null : "payment_or_status_not_ready",
        },
        request_completion: {
          visible: isProviderView,
          enabled: providerCanRequestCompletion,
          reason: providerCanRequestCompletion
            ? null
            : "status_not_in_progress",
        },
        submit_video: {
          visible: isProviderView,
          enabled: providerCanSubmitVideo,
          reason: providerCanSubmitVideo ? null : "status_not_eligible",
        },
        use_no_code_contingency: {
          visible: isProviderView,
          enabled: providerCanUseNoCode,
          reason: providerCanUseNoCode ? null : "status_not_eligible",
        },
        confirm_final: {
          visible: !isProviderView,
          enabled: providerCanConfirmFinal,
          reason: providerCanConfirmFinal ? null : "status_not_concluding",
        },
        open_complaint: {
          visible: !isProviderView,
          enabled: providerCanOpenComplaint,
          reason: providerCanOpenComplaint ? null : "status_not_concluding",
        },
      },
      proof: {
        proof_video: `${enrichedService["proof_video"] ?? ""}`.trim() || null,
        proof_code: `${enrichedService["proof_code"] ?? ""}`.trim() || null,
        validation_code: `${enrichedService["validation_code"] ?? ""}`.trim() ||
          null,
      },
    };

    const { data: openDispute } = await admin
      .from("service_disputes")
      .select("*")
      .eq("service_id", serviceId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: latestPrimaryDispute } = await admin
      .from("service_disputes")
      .select("*")
      .eq("service_id", serviceId)
      .eq("type", "complaint")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return ok({
      service: enrichedService,
      providerLocation: null,
      paymentSummary,
      finalActions,
      ui,
      dispatch_trigger: dispatchTrigger,
      openDispute: openDispute ?? null,
      latestPrimaryDispute: latestPrimaryDispute ?? null,
    });
  }

  const trackingServiceMatch = path.match(/^\/tracking\/services\/([^/]+)$/);
  if (req.method === "GET" && trackingServiceMatch) {
    const serviceId = decodeURIComponent(trackingServiceMatch[1] ?? "").trim();
    if (!serviceId) {
      return json({
        error: "invalid_service_id",
        message: "Invalid service id",
      }, 400);
    }

    const { data: serviceRow, error } = await admin
      .from("service_requests")
      .select("*")
      .eq("id", serviceId)
      .maybeSingle();

    if (error) {
      return json({
        error: "tracking_service_fetch_failed",
        message: error.message,
      }, 500);
    }
    if (!serviceRow) {
      return json({
        error: "not_found",
        message: `Service not found: ${serviceId}`,
      }, 404);
    }

    return ok({ service: serviceRow });
  }

  const trackingServiceCancelMatch = path.match(
    /^\/tracking\/services\/([^/]+)\/cancel$/,
  );
  if (req.method === "POST" && trackingServiceCancelMatch) {
    const serviceId = decodeURIComponent(trackingServiceCancelMatch[1] ?? "")
      .trim();
    if (!serviceId) {
      return json({
        error: "invalid_service_id",
        message: "Invalid service id",
      }, 400);
    }

    const appUser = "appUser" in auth ? auth.appUser : null;
    if (!appUser?.id) {
      return json(
        { error: "unauthorized", message: "User not authenticated" },
        401,
      );
    }

    const { data: existing, error: fetchErr } = await admin
      .from("service_requests")
      .select("id,client_id,status")
      .eq("id", serviceId)
      .maybeSingle();
    if (fetchErr) {
      return json({
        error: "tracking_service_fetch_failed",
        message: fetchErr.message,
      }, 500);
    }
    if (!existing) {
      return json({
        error: "not_found",
        message: `Service not found: ${serviceId}`,
      }, 404);
    }

    const clientId = Number(existing.client_id ?? 0);
    const callerUserId = Number(appUser.id ?? 0);
    if (
      !Number.isFinite(clientId) || clientId <= 0 || clientId !== callerUserId
    ) {
      return json({
        error: "forbidden",
        message: "Service does not belong to authenticated user",
      }, 403);
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: updateErr } = await admin
      .from("service_requests")
      .update({
        status: "cancelled",
        status_updated_at: nowIso,
      })
      .eq("id", serviceId)
      .select("*")
      .maybeSingle();

    if (updateErr) {
      return json({
        error: "tracking_service_cancel_failed",
        message: updateErr.message,
      }, 500);
    }
    if (!updated) {
      return json({
        error: "tracking_service_cancel_failed",
        message: "No row updated",
      }, 500);
    }
    return ok({ success: true, service: updated });
  }

  const trackingServiceStatusMatch = path.match(
    /^\/tracking\/services\/([^/]+)\/status$/,
  );
  if (req.method === "POST" && trackingServiceStatusMatch) {
    const serviceId = decodeURIComponent(trackingServiceStatusMatch[1] ?? "")
      .trim();
    if (!serviceId) {
      return json({
        error: "invalid_service_id",
        message: "Invalid service id",
      }, 400);
    }

    const appUser = "appUser" in auth ? auth.appUser : null;
    if (!appUser?.id) {
      return json(
        { error: "unauthorized", message: "User not authenticated" },
        401,
      );
    }

    const body = await req.json().catch(() => ({} as JsonMap));
    const targetStatus = `${body["status"] ?? ""}`.toLowerCase().trim();
    if (!targetStatus) {
      return json(
        { error: "invalid_status", message: "status is required" },
        400,
      );
    }
    const allowedStatuses = new Set([
      "accepted",
      "provider_near",
      "arrived",
      "in_progress",
      "completion_requested",
      "completed",
      "cancelled",
      "canceled",
      "waiting_remaining_payment",
      "waiting_payment_remaining",
    ]);
    if (!allowedStatuses.has(targetStatus)) {
      return json(
        {
          error: "invalid_status",
          message: `status not allowed: ${targetStatus}`,
        },
        400,
      );
    }

    const { data: existing, error: fetchErr } = await admin
      .from("service_requests")
      .select("id,client_id,provider_id")
      .eq("id", serviceId)
      .maybeSingle();
    if (fetchErr) {
      return json({
        error: "tracking_service_fetch_failed",
        message: fetchErr.message,
      }, 500);
    }
    if (!existing) {
      return json({
        error: "not_found",
        message: `Service not found: ${serviceId}`,
      }, 404);
    }
    const callerUserId = Number(appUser.id ?? 0);
    const ownerClientId = Number(existing["client_id"] ?? 0);
    const ownerProviderId = Number(existing["provider_id"] ?? 0);
    if (targetStatus === "cancelled" || targetStatus === "canceled") {
      if (!Number.isFinite(ownerClientId) || ownerClientId !== callerUserId) {
        return json({
          error: "forbidden",
          message: "Only client can cancel this service",
        }, 403);
      }
    } else {
      if (
        !Number.isFinite(ownerProviderId) || ownerProviderId !== callerUserId
      ) {
        return json({
          error: "forbidden",
          message: "Only provider can update this service status",
        }, 403);
      }
    }

    const nowIso = new Date().toISOString();
    const updatePayload: JsonMap = {
      status: targetStatus,
      status_updated_at: nowIso,
    };
    if (targetStatus === "arrived") {
      updatePayload["arrived_at"] = nowIso;
      updatePayload["payment_remaining_status"] = "pending";
      updatePayload["status"] = "waiting_remaining_payment";
    }

    const { data: updated, error: updateErr } = await admin
      .from("service_requests")
      .update(updatePayload)
      .eq("id", serviceId)
      .select("*")
      .maybeSingle();

    if (updateErr) {
      return json({
        error: "tracking_service_status_update_failed",
        message: updateErr.message,
      }, 500);
    }

    // Sincroniza com agendamento_servico se existir
    await syncAgendamentoStatus(
      admin,
      serviceId,
      updatePayload["status"] || targetStatus,
    );

    if (!updated) {
      return json({
        error: "not_found",
        message: `Service not found: ${serviceId}`,
      }, 404);
    }

    // Se completou, processa o pagamento
    if (
      targetStatus === "completed" || updatePayload["status"] === "completed"
    ) {
      await processServicePayout(admin, serviceId);
    }

    return ok({ success: true, service: updated });
  }

  const serviceStatusMatch = path.match(/^\/services\/([^/]+)\/status$/);
  if (req.method === "PUT" && serviceStatusMatch) {
    const serviceId = decodeURIComponent(serviceStatusMatch[1] ?? "").trim();
    if (!serviceId) {
      return json({
        error: "invalid_service_id",
        message: "Invalid service id",
      }, 400);
    }
    const body = await req.json().catch(() => ({} as JsonMap));
    const targetStatus = `${body["status"] ?? ""}`.toLowerCase().trim();
    if (!targetStatus) {
      return json(
        { error: "invalid_status", message: "status is required" },
        400,
      );
    }

    const nowIso = new Date().toISOString();
    const updatePayload: JsonMap = {
      status: targetStatus,
      status_updated_at: nowIso,
    };
    if (targetStatus === "arrived") {
      updatePayload["arrived_at"] = nowIso;
      updatePayload["payment_remaining_status"] = "pending";
      updatePayload["status"] = "waiting_remaining_payment";
    }

    const { data: updated, error: updateErr } = await admin
      .from("service_requests")
      .update(updatePayload)
      .eq("id", serviceId)
      .select("*")
      .maybeSingle();

    if (updateErr) {
      return json({
        error: "service_status_update_failed",
        message: updateErr.message,
      }, 500);
    }

    // Sincroniza com agendamento_servico se existir
    await syncAgendamentoStatus(
      admin,
      serviceId,
      updatePayload["status"] || targetStatus,
    );

    if (!updated) {
      return json({
        error: "not_found",
        message: `Service not found: ${serviceId}`,
      }, 404);
    }

    // Se completou, processa o pagamento
    if (
      targetStatus === "completed" || updatePayload["status"] === "completed"
    ) {
      await processServicePayout(admin, serviceId);
    }

    return ok({ success: true, service: updated });
  }

  const serviceArriveMatch = path.match(/^\/services\/([^/]+)\/arrive$/);
  if (req.method === "PUT" && serviceArriveMatch) {
    const serviceId = decodeURIComponent(serviceArriveMatch[1] ?? "").trim();
    if (!serviceId) {
      return json({
        error: "invalid_service_id",
        message: "Invalid service id",
      }, 400);
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: updateErr } = await admin
      .from("service_requests")
      .update({
        status: "waiting_remaining_payment",
        arrived_at: nowIso,
        payment_remaining_status: "pending",
        status_updated_at: nowIso,
      })
      .eq("id", serviceId)
      .select("*")
      .maybeSingle();

    if (updateErr) {
      return json({
        error: "service_arrive_update_failed",
        message: updateErr.message,
      }, 500);
    }

    // Sincroniza com agendamento_servico se existir
    await syncAgendamentoStatus(admin, serviceId, "waiting_remaining_payment");
    if (!updated) {
      return json({
        error: "not_found",
        message: `Service not found: ${serviceId}`,
      }, 404);
    }
    return ok({ success: true, service: updated });
  }

  const serviceStartMatch = path.match(/^\/services\/([^/]+)\/start$/);
  if (req.method === "POST" && serviceStartMatch) {
    const serviceId = decodeURIComponent(serviceStartMatch[1] ?? "").trim();
    if (!serviceId) {
      return json({
        error: "invalid_service_id",
        message: "Invalid service id",
      }, 400);
    }

    const { data: current, error: fetchErr } = await admin
      .from("service_requests")
      .select("id,status,payment_remaining_status")
      .eq("id", serviceId)
      .maybeSingle();
    if (fetchErr) {
      return json({
        error: "service_start_fetch_failed",
        message: fetchErr.message,
      }, 500);
    }
    if (!current) {
      return json({
        error: "not_found",
        message: `Service not found: ${serviceId}`,
      }, 404);
    }

    const currentStatus = `${current["status"] ?? ""}`.toLowerCase().trim();
    const remainingStatus = `${current["payment_remaining_status"] ?? ""}`
      .toLowerCase().trim();
    const remainingPaid = remainingStatus === "paid" ||
      remainingStatus === "paid_manual" ||
      remainingStatus === "approved";

    if (
      (currentStatus === "waiting_remaining_payment" ||
        currentStatus === "waiting_payment_remaining") &&
      !remainingPaid
    ) {
      return json(
        {
          error: "remaining_payment_not_confirmed",
          message: "Pagamento seguro (70%) ainda não confirmado.",
          service_id: serviceId,
          status: currentStatus,
          payment_remaining_status: remainingStatus,
        },
        409,
      );
    }

    if (currentStatus === "in_progress") {
      return ok({ success: true, service: current, idempotent: true });
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: updateErr } = await admin
      .from("service_requests")
      .update({
        status: "in_progress",
        status_updated_at: nowIso,
      })
      .eq("id", serviceId)
      .select("*")
      .maybeSingle();

    if (updateErr) {
      return json({
        error: "service_start_update_failed",
        message: updateErr.message,
      }, 500);
    }

    // Sincroniza com agendamento_servico se existir
    await syncAgendamentoStatus(admin, serviceId, "in_progress");
    if (!updated) {
      return json({
        error: "service_start_update_failed",
        message: "No row updated",
      }, 500);
    }

    await logServiceEvent(admin, serviceId, "SERVICE_STARTED", {
      source: "api_services_start",
      previous_status: currentStatus || null,
      payment_remaining_status: remainingStatus || null,
      started_at: nowIso,
    });

    return ok({ success: true, service: updated });
  }

  const serviceEnsureCompletionCodeMatch = path.match(
    /^\/services\/([^/]+)\/ensure-completion-code\/?$/,
  );
  if (req.method === "POST" && serviceEnsureCompletionCodeMatch) {
    const serviceId = decodeURIComponent(
      serviceEnsureCompletionCodeMatch[1] ?? "",
    ).trim();
    if (!serviceId) {
      return json({
        error: "invalid_service_id",
        message: "Invalid service id",
      }, 400);
    }

    const { data: current, error: fetchErr } = await admin
      .from("service_requests")
      .select("*")
      .eq("id", serviceId)
      .maybeSingle();
    if (fetchErr) {
      return json({
        error: "ensure_completion_code_fetch_failed",
        message: fetchErr.message,
      }, 500);
    }
    if (!current) {
      return json({
        error: "service_not_found",
        message: `Service not found: ${serviceId}`,
      }, 404);
    }

    const existingCode = `${
      current["proof_code"] ?? current["validation_code"] ??
        current["completion_code"] ?? current["verification_code"] ?? ""
    }`.trim();
    const code = existingCode || generateSixDigitCode();
    const nowIso = new Date().toISOString();

    const basePayload: JsonMap = {
      status: "waiting_client_confirmation",
      status_updated_at: nowIso,
      proof_code: code,
      validation_code: code,
      completion_code: code,
      verification_code: code,
    };

    const tryPayloads: JsonMap[] = [
      basePayload,
      { ...basePayload, proof_code: undefined },
      {
        status: "waiting_client_confirmation",
        status_updated_at: nowIso,
        verification_code: code,
      },
    ].map((payload) => {
      const sanitized: JsonMap = {};
      for (const [k, v] of Object.entries(payload)) {
        if (v !== undefined) sanitized[k] = v;
      }
      return sanitized;
    });

    let updated: JsonMap | null = null;
    let updateErr: any = null;
    for (const payload of tryPayloads) {
      const mutablePayload: JsonMap = { ...payload };
      for (let guard = 0; guard < 6; guard++) {
        const attempt = await admin
          .from("service_requests")
          .update(mutablePayload)
          .eq("id", serviceId)
          .select("*")
          .maybeSingle();
        if (!attempt.error) {
          updated = (attempt.data ?? null) as JsonMap | null;
          updateErr = null;
          break;
        }

        const missingColumn = extractMissingColumnFromPostgrestMessage(
          `${attempt.error.message ?? ""}`,
        );
        if (!missingColumn || !(missingColumn in mutablePayload)) {
          updateErr = attempt.error;
          break;
        }
        delete mutablePayload[missingColumn];
        updateErr = attempt.error;
      }
      if (updated != null && !updateErr) break;
    }

    if (updateErr) {
      return json({
        error: "ensure_completion_code_update_failed",
        message: updateErr.message,
      }, 500);
    }

    await logServiceEvent(admin, serviceId, "COMPLETION_CODE_REQUESTED", {
      source: "api_services_ensure_completion_code",
      status_after: "waiting_client_confirmation",
      has_existing_code: existingCode.length > 0,
    });

    return ok({
      ok: true,
      code: "ok",
      proof_code: code,
      validation_code: code,
      completion_code: code,
      verification_code: code,
      service: updated ?? current,
    });
  }

  const serviceAutoConfirmAfterGraceMatch = path.match(
    /^\/services\/([^/]+)\/auto-confirm-after-grace\/?$/,
  );
  if (req.method === "POST" && serviceAutoConfirmAfterGraceMatch) {
    const serviceId = decodeURIComponent(
      serviceAutoConfirmAfterGraceMatch[1] ?? "",
    ).trim();
    if (!serviceId) {
      return json({
        error: "invalid_service_id",
        message: "Invalid service id",
      }, 400);
    }
    const body = await req.json().catch(() => ({} as JsonMap));
    const graceMinutesRaw = Number(body["grace_minutes"] ?? 720);
    const graceMinutes = Number.isFinite(graceMinutesRaw) && graceMinutesRaw > 0
      ? Math.floor(graceMinutesRaw)
      : 720;

    const { data: current, error: fetchErr } = await admin
      .from("service_requests")
      .select("id,status,status_updated_at,completed_at")
      .eq("id", serviceId)
      .maybeSingle();
    if (fetchErr) {
      return json({
        error: "auto_confirm_fetch_failed",
        message: fetchErr.message,
      }, 500);
    }
    if (!current) {
      return json({
        error: "service_not_found",
        message: `Service not found: ${serviceId}`,
      }, 404);
    }

    const status = `${current["status"] ?? ""}`.toLowerCase().trim();
    if (
      ![
        "awaiting_confirmation",
        "waiting_client_confirmation",
        "completion_requested",
      ].includes(status)
    ) {
      return ok({ ok: false, reason: "status_not_eligible", status });
    }

    const statusUpdatedAt = `${current["status_updated_at"] ?? ""}`.trim();
    const updatedTs = statusUpdatedAt ? Date.parse(statusUpdatedAt) : NaN;
    if (!Number.isFinite(updatedTs)) {
      return ok({ ok: false, reason: "status_updated_at_missing" });
    }

    const elapsedMinutes = (Date.now() - updatedTs) / 60000;
    if (elapsedMinutes < graceMinutes) {
      return ok({
        ok: false,
        reason: "grace_not_elapsed",
        elapsed_minutes: Math.max(0, Math.floor(elapsedMinutes)),
        grace_minutes: graceMinutes,
      });
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: updateErr } = await admin
      .from("service_requests")
      .update({
        status: "completed",
        status_updated_at: nowIso,
        completed_at: current["completed_at"] ?? nowIso,
      })
      .eq("id", serviceId)
      .select("*")
      .maybeSingle();

    // Sincroniza com agendamento_servico se existir
    await syncAgendamentoStatus(admin, serviceId, "completed");
    if (updateErr) {
      return json({
        error: "auto_confirm_update_failed",
        message: updateErr.message,
      }, 500);
    }

    await logServiceEvent(admin, serviceId, "AUTO_CONFIRMED_AFTER_GRACE", {
      source: "api_services_auto_confirm_after_grace",
      grace_minutes: graceMinutes,
      previous_status: status,
    });

    return ok({ ok: true, service: updated ?? current });
  }

  const serviceCompleteMatch = path.match(
    /^\/services\/([^/]+)\/(complete|confirm-completion)\/?$/,
  );
  if (req.method === "POST" && serviceCompleteMatch) {
    const serviceId = decodeURIComponent(serviceCompleteMatch[1] ?? "").trim();
    if (!serviceId) {
      return json({
        error: "invalid_service_id",
        message: "Invalid service id",
      }, 400);
    }

    const body = await req.json().catch(() => ({} as JsonMap));
    const enteredCode = `${
      body["code"] ?? body["proof_code"] ?? body["verification_code"] ?? ""
    }`.trim();
    const proofVideo = `${body["proof_video"] ?? body["video"] ?? ""}`.trim();
    if (!proofVideo) {
      return json(
        {
          ok: false,
          code: "missing_proof_video",
          message: "Envie o vídeo do serviço antes de finalizar.",
        },
        409,
      );
    }

    const { data: current, error: fetchErr } = await admin
      .from("service_requests")
      .select("*")
      .eq("id", serviceId)
      .maybeSingle();
    if (fetchErr) {
      return json({
        error: "service_complete_fetch_failed",
        message: fetchErr.message,
      }, 500);
    }
    if (!current) {
      return json({
        error: "service_not_found",
        message: `Service not found: ${serviceId}`,
      }, 404);
    }

    const storedCode = `${
      current["proof_code"] ?? current["validation_code"] ??
        current["completion_code"] ?? current["verification_code"] ?? ""
    }`.trim();
    const hasStoredCode = storedCode.length > 0;
    const hasEnteredCode = enteredCode.length > 0;

    if (hasEnteredCode && hasStoredCode && enteredCode != storedCode) {
      return json(
        {
          ok: false,
          code: "invalid_completion_code",
          message: "Código de segurança inválido.",
        },
        409,
      );
    }

    const nowIso = new Date().toISOString();
    const immediateComplete = hasEnteredCode &&
      (!hasStoredCode || enteredCode == storedCode);
    const basePayload: JsonMap = {
      status: immediateComplete ? "completed" : "waiting_client_confirmation",
      status_updated_at: nowIso,
      completed_at: immediateComplete
        ? nowIso
        : (current["completed_at"] ?? null),
      proof_video: proofVideo,
      proof_photo: current["proof_photo"] ?? null,
    };
    if (hasEnteredCode) {
      basePayload["proof_code"] = enteredCode;
      basePayload["validation_code"] = enteredCode;
      basePayload["completion_code"] = enteredCode;
      basePayload["verification_code"] = enteredCode;
    }

    const tryPayloads: JsonMap[] = [
      basePayload,
      {
        ...basePayload,
        completion_code: undefined,
        verification_code: undefined,
      },
      {
        ...basePayload,
        completion_code: undefined,
        verification_code: undefined,
        validation_code: undefined,
      },
    ].map((payload) => {
      const sanitized: JsonMap = {};
      for (const [k, v] of Object.entries(payload)) {
        if (v !== undefined) sanitized[k] = v;
      }
      return sanitized;
    });

    let updated: JsonMap | null = null;
    let updateErr: any = null;
    for (const payload of tryPayloads) {
      const mutablePayload: JsonMap = { ...payload };
      for (let guard = 0; guard < 6; guard++) {
        const attempt = await admin
          .from("service_requests")
          .update(mutablePayload)
          .eq("id", serviceId)
          .select("*")
          .maybeSingle();
        if (!attempt.error) {
          updated = (attempt.data ?? null) as JsonMap | null;
          updateErr = null;
          break;
        }
        const missingColumn = extractMissingColumnFromPostgrestMessage(
          `${attempt.error.message ?? ""}`,
        );
        if (!missingColumn || !(missingColumn in mutablePayload)) {
          updateErr = attempt.error;
          break;
        }
        delete mutablePayload[missingColumn];
        updateErr = attempt.error;
      }
      if (updated != null && !updateErr) break;
    }

    if (updated != null && !updateErr) {
      // Sincroniza com agendamento_servico se existir
      await syncAgendamentoStatus(
        admin,
        serviceId,
        String(updated["status"] ?? targetStatus),
      );

      // Se completou imediatamente, processa o pagamento
      if (String(updated["status"] ?? targetStatus) === "completed") {
        await processServicePayout(admin, serviceId);
      }
    }

    if (updateErr) {
      return json({
        error: "service_complete_update_failed",
        message: updateErr.message,
      }, 500);
    }

    await logServiceEvent(
      admin,
      serviceId,
      immediateComplete ? "COMPLETED" : "AWAITING_CONFIRMATION",
      {
        source: "api_services_complete",
        immediate_complete: immediateComplete,
        has_entered_code: hasEnteredCode,
        has_stored_code: hasStoredCode,
      },
    );

    return ok({
      ok: true,
      requires_client_confirmation: !immediateComplete,
      service: updated ?? current,
    });
  }

  const fixedBookingByIdMatch = path.match(/^\/bookings\/fixed\/([^/]+)\/?$/);
  if (req.method === "GET" && fixedBookingByIdMatch) {
    const serviceId = decodeURIComponent(fixedBookingByIdMatch[1] ?? "").trim();
    if (!serviceId) {
      return json({
        error: "invalid_service_id",
        message: "Invalid service id",
      }, 400);
    }

    const { data, error } = await admin
      .from("service_requests")
      .select("*")
      .eq("id", serviceId)
      .maybeSingle();

    if (error) {
      return json({
        error: "fixed_booking_fetch_failed",
        message: error.message,
      }, 500);
    }
    if (!data) return ok(null);

    const locationType = `${data["location_type"] ?? ""}`.toLowerCase().trim();
    const serviceType = `${data["service_type"] ?? ""}`.toLowerCase().trim();
    const isFixedLike = locationType === "fixed" ||
      locationType === "at_provider" || serviceType === "at_provider";
    return ok(isFixedLike ? data : null);
  }

  const fixedBookingArtifactsMatch = path.match(
    /^\/bookings\/fixed\/([^/]+)\/artifacts\/?$/,
  );
  if (fixedBookingArtifactsMatch) {
    const serviceId = decodeURIComponent(fixedBookingArtifactsMatch[1] ?? "")
      .trim();
    if (!serviceId) {
      return json({
        error: "invalid_service_id",
        message: "Invalid service id",
      }, 400);
    }

    if (req.method === "GET") {
      const { data, error } = await admin
        .from("service_requests")
        .select(
          "id,status,proof_code,validation_code,proof_video,proof_photo,completed_at,status_updated_at",
        )
        .eq("id", serviceId)
        .maybeSingle();
      if (error) {
        return json({
          error: "fixed_artifacts_fetch_failed",
          message: error.message,
        }, 500);
      }
      if (!data) return ok(null);
      return ok(data);
    }

    if (req.method === "PUT") {
      const body = await req.json().catch(() => ({} as JsonMap));
      const nowIso = new Date().toISOString();
      const updatePayload: JsonMap = {
        status_updated_at: nowIso,
      };

      const completionCodeRaw = `${
        body["completion_code"] ?? body["verification_code"] ??
          body["proof_code"] ?? body["codigo_validacao"] ?? ""
      }`.trim();
      if (completionCodeRaw) {
        updatePayload["proof_code"] = completionCodeRaw;
        updatePayload["validation_code"] = completionCodeRaw;
      }
      const proofVideoRaw = `${body["proof_video"] ?? ""}`.trim();
      if (proofVideoRaw) updatePayload["proof_video"] = proofVideoRaw;
      const proofPhotoRaw = `${body["proof_photo"] ?? ""}`.trim();
      if (proofPhotoRaw) updatePayload["proof_photo"] = proofPhotoRaw;

      // Ao registrar artefatos/código de conclusão, força fase de confirmação
      // para refletir no cliente imediatamente.
      updatePayload["status"] = "waiting_client_confirmation";

      const { data, error } = await admin
        .from("service_requests")
        .update(updatePayload)
        .eq("id", serviceId)
        .select(
          "id,status,proof_code,validation_code,proof_video,proof_photo,completed_at,status_updated_at",
        )
        .maybeSingle();

      if (error) {
        return json({
          error: "fixed_artifacts_update_failed",
          message: error.message,
        }, 500);
      }
      if (!data) {
        return json({
          error: "service_not_found",
          message: `Service not found: ${serviceId}`,
        }, 404);
      }
      return ok(data);
    }
  }

  const dispatchOfferStateMatch = path.match(
    /^\/dispatch\/([^/]+)\/offer-state$/,
  );
  if (req.method === "GET" && dispatchOfferStateMatch) {
    const serviceId = decodeURIComponent(dispatchOfferStateMatch[1] ?? "")
      .trim();
    if (!serviceId) {
      return json({
        error: "invalid_service_id",
        message: "Invalid service id",
      }, 400);
    }
    const appUser = "appUser" in auth ? auth.appUser : null;
    if (!appUser?.id) {
      return json(
        { error: "unauthorized", message: "User not authenticated" },
        401,
      );
    }

    const notifTable = await resolveNotifTable(admin);
    const { data: userRow, error: userError } = await admin
      .from("users")
      .select("id")
      .eq("supabase_uid", appUser.id)
      .maybeSingle();

    if (userError) {
      console.error(
        `❌ [api/offer-state] Erro ao buscar userRow para UUID ${appUser.id}:`,
        userError,
      );
    }

    const providerUserId = userRow?.id;
    if (!providerUserId) {
      console.warn(
        `⚠️ [api/offer-state] ProviderUserId não encontrado para UUID ${appUser.id}`,
      );
      return ok(null);
    }

    const { data, error } = await admin
      .from(notifTable)
      .select(
        "id,status,response_deadline_at,notification_count,attempt_no,max_attempts,queue_order,ciclo_atual,last_notified_at,answered_at,skip_reason",
      )
      .eq("service_id", serviceId)
      .eq("provider_user_id", providerUserId)
      .in("status", ["sending", "notified", "retry_ready"])
      .order("last_notified_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return json({
        error: "dispatch_offer_state_fetch_failed",
        message: error.message,
      }, 500);
    }
    return ok(data ?? null);
  }

  const dispatchPresentedMatch = path.match(
    /^\/dispatch\/([^/]+)\/presented\/?$/,
  );
  if (req.method === "POST" && dispatchPresentedMatch) {
    const serviceId = decodeURIComponent(dispatchPresentedMatch[1] ?? "")
      .trim();
    if (!serviceId) {
      return json({
        error: "invalid_service_id",
        message: "Invalid service id",
      }, 400);
    }

    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;
    const appUser = auth.appUser;

    if (!appUser || !appUser.id) {
      return json({
        error: "unauthorized",
        message: "Perfil de usuário não encontrado para confirmação de oferta",
      }, 401);
    }

    const providerNumericId = appUser.id;
    const admin = auth.admin;
    const notifTable = await resolveNotifTable(admin);
    const nowIso = new Date().toISOString();
    const responseDeadlineAt = new Date(
      Date.now() + 30 * 1000,
    ).toISOString();

    const { data: currentRow, error: currentErr } = await admin
      .from(notifTable)
      .select(
        "id,status,last_notified_at,response_deadline_at,notification_count,attempt_no,max_attempts,queue_order,ciclo_atual,answered_at,skip_reason",
      )
      .eq("service_id", serviceId)
      .eq("provider_user_id", providerNumericId)
      .in("status", ["sending", "notified"])
      .order("last_notified_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentErr) {
      return json({
        error: "dispatch_presented_fetch_failed",
        message: currentErr.message,
      }, 500);
    }

    if (!currentRow) {
      return json({
        error: "offer_not_active",
        message:
          "Oferta não está mais aguardando apresentação para este prestador.",
      }, 409);
    }

    if (`${currentRow.status ?? ""}`.toLowerCase().trim() === "notified") {
      return ok({
        success: true,
        state: currentRow,
      });
    }

    const { data: updatedRow, error: updateErr } = await admin
      .from(notifTable)
      .update({
        status: "notified",
        response_deadline_at: responseDeadlineAt,
        push_status: "presented",
        push_error_code: null,
        push_error_type: null,
        locked_at: nowIso,
        locked_by_run: "provider_presented",
      })
      .eq("id", currentRow.id)
      .eq("service_id", serviceId)
      .eq("provider_user_id", providerNumericId)
      .eq("status", "sending")
      .select(
        "id,status,last_notified_at,response_deadline_at,notification_count,attempt_no,max_attempts,queue_order,ciclo_atual,answered_at,skip_reason",
      )
      .maybeSingle();

    if (updateErr) {
      return json({
        error: "dispatch_presented_update_failed",
        message: updateErr.message,
      }, 500);
    }

    if (!updatedRow) {
      const { data: fallbackRow } = await admin
        .from(notifTable)
        .select(
          "id,status,last_notified_at,response_deadline_at,notification_count,attempt_no,max_attempts,queue_order,ciclo_atual,answered_at,skip_reason",
        )
        .eq("service_id", serviceId)
        .eq("provider_user_id", providerNumericId)
        .eq("status", "notified")
        .order("last_notified_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackRow) {
        return ok({ success: true, state: fallbackRow });
      }

      return json({
        error: "offer_not_active",
        message: "Oferta não pôde ser confirmada para apresentação.",
      }, 409);
    }

    await logServiceEvent(admin, serviceId, "SERVICE_OFFER_PRESENTED", {
      source: "api_dispatch_presented",
      provider_user_id: providerNumericId,
      provider_uid: appUser.supabase_uid || appUser.id,
      response_deadline_at: responseDeadlineAt,
    });

    return ok({
      success: true,
      state: updatedRow,
    });
  }

  const dispatchAcceptMatch = path.match(/^\/dispatch\/([^/]+)\/accept\/?$/);
  if (req.method === "POST" && dispatchAcceptMatch) {
    const serviceId = decodeURIComponent(dispatchAcceptMatch[1] ?? "").trim();
    if (!serviceId) {
      return json({
        error: "invalid_service_id",
        message: "Invalid service id",
      }, 400);
    }

    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;
    const appUser = auth.appUser;

    if (!appUser || !appUser.id) {
      return json({
        error: "unauthorized",
        message: "Perfil de usuário não encontrado para aceite",
      }, 401);
    }

    const providerNumericId = appUser.id;
    const admin = auth.admin;
    const nowIso = new Date().toISOString();
    const notifTable = await resolveNotifTable(admin);

    const { data: offerRow, error: offerErr } = await admin
      .from(notifTable)
      .select(
        "id,status,last_notified_at,response_deadline_at,notification_count,attempt_no,max_attempts,queue_order,ciclo_atual,answered_at,skip_reason",
      )
      .eq("service_id", serviceId)
      .eq("provider_user_id", providerNumericId)
      .in("status", ["sending", "notified"])
      .order("last_notified_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (offerErr) {
      return json({
        error: "dispatch_accept_offer_fetch_failed",
        message: offerErr.message,
      }, 500);
    }

    if (!offerRow) {
      return json({
        error: "offer_not_active",
        message: "Oferta não está mais ativa para aceite.",
      }, 409);
    }

    const { data: updated, error: updateErr } = await admin
      .from("service_requests")
      .update({
        provider_id: providerNumericId,
        status: "accepted",
        status_updated_at: nowIso,
      })
      .eq("id", serviceId)
      .in("status", ["searching", "searching_provider", "open_for_schedule"])
      .select("*")
      .maybeSingle();

    if (updateErr) {
      return json({
        error: "service_accept_update_failed",
        message: updateErr.message,
      }, 500);
    }

    if (!updated) {
      return json({
        error: "service_not_eligible",
        message: "Este serviço não está mais disponível ou já foi aceito.",
      }, 409);
    }

    const { error: acceptNotifErr } = await admin
      .from(notifTable)
      .update({
        status: "accepted",
        answered_at: nowIso,
        response_deadline_at: null,
        locked_at: nowIso,
        locked_by_run: "provider_accepted",
        push_status: "accepted",
        push_error_code: null,
        push_error_type: null,
      })
      .eq("id", offerRow.id)
      .eq("service_id", serviceId)
      .eq("provider_user_id", providerNumericId)
      .in("status", ["sending", "notified"]);

    if (acceptNotifErr) {
      return json({
        error: "dispatch_accept_notif_update_failed",
        message: acceptNotifErr.message,
      }, 500);
    }

    await admin
      .from(notifTable)
      .update({
        status: "rejected",
        answered_at: nowIso,
        response_deadline_at: null,
        skip_reason: "accepted_by_other_provider",
        locked_at: null,
        locked_by_run: null,
      })
      .eq("service_id", serviceId)
      .neq("provider_user_id", providerNumericId)
      .in("status", ["sending", "notified"]);

    await logServiceEvent(admin, serviceId, "SERVICE_ACCEPTED", {
      source: "api_dispatch_accept",
      provider_user_id: providerNumericId,
      provider_uid: appUser.supabase_uid || appUser.id,
      offer_status_before_accept: `${offerRow.status ?? ""}`.toLowerCase()
        .trim(),
    });

    return ok({
      success: true,
      service: updated,
      provider_id: providerNumericId,
    });
  }

  const dispatchRejectMatch = path.match(/^\/dispatch\/([^/]+)\/reject\/?$/);
  if (req.method === "POST" && dispatchRejectMatch) {
    const serviceId = decodeURIComponent(dispatchRejectMatch[1] ?? "").trim();
    if (!serviceId) {
      return json({
        error: "invalid_service_id",
        message: "Invalid service id",
      }, 400);
    }

    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;
    const appUser = auth.appUser;

    if (!appUser || !appUser.id) {
      return json({
        error: "unauthorized",
        message: "Perfil de usuário não encontrado para recusa",
      }, 401);
    }

    const providerNumericId = appUser.id;
    const admin = auth.admin;

    // Marcar a notificação correspondente como rejeitada (status = rejected)
    const notifTable = await resolveNotifTable(admin);
    const { error: notifErr } = await admin
      .from(notifTable)
      .update({
        status: "rejected",
        answered_at: new Date().toISOString(),
      })
      .eq("service_id", serviceId)
      .eq("provider_user_id", providerNumericId);

    if (notifErr) {
      return json({
        error: "dispatch_reject_update_failed",
        message: notifErr.message,
      }, 500);
    }

    // Logar o evento de recusa
    await logServiceEvent(admin, serviceId, "SERVICE_REJECTED", {
      source: "api_dispatch_reject",
      provider_user_id: providerNumericId,
      provider_uid: appUser.supabase_uid || appUser.id,
    });

    // Tentar disparar a próxima rodada do despacho imediatamente
    try {
      const baseUrl = getEnv("SUPABASE_URL") || getEnv("PROJECT_URL");
      const serviceKey = getEnv("PROJECT_SERVICE_KEY") ||
        getEnv("SUPABASE_SERVICE_ROLE_KEY");
      if (baseUrl && serviceKey) {
        fetch(`${baseUrl}/functions/v1/dispatch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ serviceId, action: "next_round" }),
        }).catch((e) =>
          console.error("Error triggering next_round after reject:", e)
        );
      }
    } catch (_) {
      // noop
    }

    return ok({ success: true });
  }

  const serviceLogsMatch = path.match(/^\/services\/([^/]+)\/logs$/);
  if (req.method === "POST" && serviceLogsMatch) {
    const serviceId = decodeURIComponent(serviceLogsMatch[1] ?? "").trim();
    if (!serviceId) {
      return json({
        error: "invalid_service_id",
        message: "Invalid service id",
      }, 400);
    }
    const appUser = "appUser" in auth ? auth.appUser : null;
    if (!appUser?.id) {
      return json(
        { error: "unauthorized", message: "User not authenticated" },
        401,
      );
    }

    const body = await req.json().catch(() => ({} as JsonMap));
    const action = `${body["action"] ?? body["event"] ?? "APP_EVENT"}`.trim() ||
      "APP_EVENT";
    const details = body["details"] && typeof body["details"] === "object"
      ? (body["details"] as JsonMap)
      : (body as JsonMap);

    const { error } = await admin.from("service_logs").insert({
      service_id: serviceId,
      action,
      details: JSON.stringify({
        ...details,
        source: "api_services_logs",
        actor_user_id: appUser.id,
      }),
      created_at: new Date().toISOString(),
    });
    if (error) {
      return json({
        error: "service_log_insert_failed",
        message: error.message,
      }, 500);
    }
    return ok({ success: true });
  }

  if (req.method === "GET") {
    return notFound(path);
  }

  return json(
    {
      error: "method_not_allowed",
      message: `Method ${req.method} is not supported for ${path}`,
      statusCode: 405,
    },
    405,
  );
});
