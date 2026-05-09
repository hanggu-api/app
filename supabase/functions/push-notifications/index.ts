import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getAuthenticatedUser, json } from "../_shared/auth.ts";

async function getAccessToken(serviceAccount: any): Promise<string | null> {
  try {
    const { client_email, private_key } = serviceAccount;

    const header = { alg: "RS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "")
      .replace(/\+/g, "-").replace(/\//g, "_");
    const encodedClaims = btoa(JSON.stringify(claims)).replace(/=/g, "")
      .replace(/\+/g, "-").replace(/\//g, "_");
    const signatureInput = `${encodedHeader}.${encodedClaims}`;

    const keyData = private_key
      .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, "")
      .replace(/\\n/g, "")
      .replace(/\s+/g, "");

    const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const encoder = new TextEncoder();
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      encoder.encode(signatureInput),
    );
    const encodedSignature = btoa(
      String.fromCharCode(...new Uint8Array(signature)),
    )
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    const jwt = `${signatureInput}.${encodedSignature}`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
      signal: AbortSignal.timeout(8000), // 8 segundos para o OAuth2 responder
    });

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error("Error getting access token:", error);
    return null;
  }
}

function getAndroidChannelId(type?: string): string {
  if (type === "uber_trip_offer") return "uber_trip_offers_channel";
  if (type?.startsWith("uber_trip_")) return "uber_trip_updates_channel";
  if (type === "chat_message") return "chat_messages_channel";
  return "high_importance_channel_v3";
}

function shouldSendDataOnly(type?: string): boolean {
  // For urgent offers we want the app isolate to run the background handler
  // and create a local notification with fullScreenIntent (true "pop over other apps").
  // If we include `notification`, Android may show it directly and skip Dart background handler.
  return (
    type === "new_service" ||
    type === "offer" ||
    type === "service_offer" ||
    type === "service_offered" ||
    type === "service.offered" ||
    type === "manual_visual_test" ||
    type === "uber_trip_offer"
  );
}

const TRIP_RUNTIME_ENABLED = false;

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function sanitizeDataPayload(
  data: Record<string, unknown> = {},
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(data).map((
      [key, value],
    ) => [key, value == null ? "" : String(value)]),
  );
}

function buildOfferFingerprint(dataPayload: Record<string, string>): string {
  const serviceId = clean(dataPayload.service_id || dataPayload.id);
  const providerUserId = clean(
    dataPayload.provider_user_id || dataPayload.providerId,
  );
  const deadline = clean(
    dataPayload.response_deadline_at || dataPayload.schedule_expires_at,
  );
  if (!serviceId) return "";
  if (!providerUserId && !deadline) return serviceId;
  return `${serviceId}|${providerUserId}|${deadline}`;
}

function ensureOfferDiagnostics(
  dataPayload: Record<string, string>,
): Record<string, string> {
  const payload = { ...dataPayload };
  const type = clean(payload.type).toLowerCase();
  const isOffer = shouldSendDataOnly(type) || type === "service_offer" ||
    type === "service.offered" || type === "offer";
  if (!isOffer) return payload;

  if (!clean(payload.correlation_id)) {
    payload.correlation_id = crypto.randomUUID();
  }
  if (!clean(payload.offer_fingerprint)) {
    payload.offer_fingerprint = buildOfferFingerprint(payload);
  }
  if (!clean(payload.offer_cycle_key)) {
    payload.offer_cycle_key = payload.offer_fingerprint;
  }
  return payload;
}

type PushErrorType = "permanent" | "transient";

type FcmSendResult = {
  http_status: number;
  http_ok: boolean;
  raw_body: string;
  body: any;
  fcm_ok: boolean;
  error_code: string | null;
  error_type: PushErrorType | null;
};

const PERMANENT_FCM_CODES = new Set([
  "UNREGISTERED",
  "INVALID_ARGUMENT",
  "SENDER_ID_MISMATCH",
]);

const TRANSIENT_FCM_CODES = new Set([
  "UNAVAILABLE",
  "INTERNAL",
  "DEADLINE_EXCEEDED",
  "RESOURCE_EXHAUSTED",
]);

function extractFcmErrorCode(body: any): string | null {
  const status = body?.error?.status;
  if (typeof status === "string" && status.trim().length > 0) {
    return status.trim().toUpperCase();
  }

  const details = body?.error?.details;
  if (Array.isArray(details)) {
    for (const detail of details) {
      const direct = detail?.errorCode ?? detail?.error_code ?? detail?.status;
      if (typeof direct === "string" && direct.trim().length > 0) {
        return direct.trim().toUpperCase();
      }
    }
  }

  return null;
}

function classifyFcmError(
  body: any,
  httpStatus: number,
  httpOk: boolean,
): {
  fcm_ok: boolean;
  error_code: string | null;
  error_type: PushErrorType | null;
} {
  if (
    httpOk && body && typeof body === "object" &&
    typeof body.name === "string" && body.name.length > 0
  ) {
    return { fcm_ok: true, error_code: null, error_type: null };
  }

  const code = extractFcmErrorCode(body);
  if (code && PERMANENT_FCM_CODES.has(code)) {
    return { fcm_ok: false, error_code: code, error_type: "permanent" };
  }

  if (code && TRANSIENT_FCM_CODES.has(code)) {
    return { fcm_ok: false, error_code: code, error_type: "transient" };
  }

  if (httpStatus === 429 || httpStatus >= 500) {
    return {
      fcm_ok: false,
      error_code: code ?? `HTTP_${httpStatus}`,
      error_type: "transient",
    };
  }

  return {
    fcm_ok: false,
    error_code: code ?? (httpOk ? "UNKNOWN_FCM_ERROR" : `HTTP_${httpStatus}`),
    error_type: "transient",
  };
}

function buildFcmV1Payload(
  token: string,
  title: string,
  body: string,
  dataPayload: Record<string, string>,
) {
  const isUberTripEvent = dataPayload.type?.startsWith("uber_trip_") ?? false;
  const isDataOnly = shouldSendDataOnly(dataPayload.type);
  const fcmPayload: any = {
    message: {
      token,
      data: dataPayload,
      android: {
        priority: "HIGH",
      },
    },
  };

  if (!isUberTripEvent && !isDataOnly) {
    fcmPayload.message.notification = { title, body };
    fcmPayload.message.android.notification = {
      channel_id: getAndroidChannelId(dataPayload.type),
      sound: "default",
    };
  }

  return { fcmPayload, isUberTripEvent, isDataOnly };
}

async function sendPushMessage(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  dataPayload: Record<string, string>,
): Promise<FcmSendResult> {
  const { fcmPayload, isUberTripEvent, isDataOnly } = buildFcmV1Payload(
    token,
    title,
    body,
    dataPayload,
  );

  console.log("FCM payload ready:", {
    transport: "fcm_v1",
    projectId,
    tokenPreview: `${token.slice(0, 16)}...`,
    title,
    body,
    dataPayload,
    isUberTripEvent,
    isDataOnly,
    fcmPayload,
  });

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(fcmPayload),
    },
  );

  const rawBody = await response.text();
  let parsedBody: any = null;
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null;
  } catch (_) {
    parsedBody = { raw: rawBody };
  }

  const classified = classifyFcmError(parsedBody, response.status, response.ok);
  return {
    http_status: response.status,
    http_ok: response.ok,
    raw_body: rawBody,
    body: parsedBody,
    fcm_ok: classified.fcm_ok,
    error_code: classified.error_code,
    error_type: classified.error_type,
  };
}

async function sendPushMessageLegacy(
  serverKey: string,
  token: string,
  title: string,
  body: string,
  dataPayload: Record<string, string>,
): Promise<FcmSendResult> {
  const { fcmPayload, isUberTripEvent, isDataOnly } = buildFcmV1Payload(
    token,
    title,
    body,
    dataPayload,
  );

  const legacyPayload: Record<string, unknown> = {
    to: token,
    priority: "high",
    data: dataPayload,
  };

  if (!isDataOnly && !isUberTripEvent) {
    legacyPayload.notification = {
      title,
      body,
      sound: "default",
      android_channel_id: getAndroidChannelId(dataPayload.type),
    };
  }

  console.log("FCM payload ready:", {
    transport: "fcm_legacy",
    tokenPreview: `${token.slice(0, 16)}...`,
    title,
    body,
    dataPayload,
    isUberTripEvent,
    isDataOnly,
    legacyPayload,
    fcmPayloadPreview: fcmPayload,
  });

  const response = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `key=${serverKey}`,
    },
    body: JSON.stringify(legacyPayload),
  });

  const rawBody = await response.text();
  let parsedBody: any = null;
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null;
  } catch (_) {
    parsedBody = { raw: rawBody };
  }

  const legacyMessageId = parsedBody?.message_id;
  const legacySuccess = Number(parsedBody?.success ?? 0);
  const legacyFailure = Number(parsedBody?.failure ?? 0);
  const resultEntry = Array.isArray(parsedBody?.results)
    ? parsedBody.results[0]
    : null;
  const legacyError = typeof resultEntry?.error === "string"
    ? resultEntry.error.trim().toUpperCase()
    : null;

  if (
    response.ok &&
    ((legacyMessageId && legacyMessageId.length > 0) || legacySuccess > 0) &&
    legacyFailure === 0
  ) {
    return {
      http_status: response.status,
      http_ok: response.ok,
      raw_body: rawBody,
      body: parsedBody,
      fcm_ok: true,
      error_code: null,
      error_type: null,
    };
  }

  const classified = classifyFcmError(
    legacyError ? { error: { status: legacyError } } : parsedBody,
    response.status,
    response.ok,
  );
  return {
    http_status: response.status,
    http_ok: response.ok,
    raw_body: rawBody,
    body: parsedBody,
    fcm_ok: classified.fcm_ok,
    error_code: classified.error_code,
    error_type: classified.error_type,
  };
}

type PushTransport =
  | { kind: "fcm_v1"; accessToken: string; projectId: string }
  | { kind: "fcm_legacy"; serverKey: string };

async function dispatchPushMessage(
  transport: PushTransport,
  token: string,
  title: string,
  body: string,
  dataPayload: Record<string, string>,
): Promise<FcmSendResult> {
  if (transport.kind === "fcm_v1") {
    return sendPushMessage(
      transport.accessToken,
      transport.projectId,
      token,
      title,
      body,
      dataPayload,
    );
  }

  return sendPushMessageLegacy(
    transport.serverKey,
    token,
    title,
    body,
    dataPayload,
  );
}

async function persistInAppNotifications(
  supabase: any,
  userIds: number[],
  title: string,
  body: string,
  dataPayload: Record<string, string>,
) {
  const unique = [...new Set(userIds)].filter((id) =>
    Number.isFinite(id) && id > 0
  );
  if (unique.length === 0) return;

  const type = dataPayload.type ?? "status_update";
  const rows = unique.map((userId) => ({
    user_id: userId,
    title,
    body,
    type,
    data: dataPayload,
  }));

  const { error } = await supabase.from("notifications").insert(rows);
  if (error) {
    console.error("Failed to persist in-app notifications:", error);
  }
}

async function shouldSkipDuplicateServiceOffer(
  supabase: any,
  userIds: number[],
  dataPayload: Record<string, string>,
): Promise<boolean> {
  const type = clean(dataPayload.type).toLowerCase();
  if (
    !["service_offer", "service.offered", "offer", "service_offered"].includes(
      type,
    )
  ) {
    return false;
  }
  const serviceId = clean(dataPayload.service_id || dataPayload.id);
  const providerUserId = Number(clean(dataPayload.provider_user_id || "0"));
  const attemptNo = Number(clean(dataPayload.attempt_no || "0"));
  if (!serviceId) return false;
  // Hard guard against queue resend loops: if offer row is already notified and active,
  // skip sending again for the same service/provider/attempt cycle.
  if (
    Number.isFinite(providerUserId) && providerUserId > 0 &&
    Number.isFinite(attemptNo) && attemptNo > 0
  ) {
    const nowIso = new Date().toISOString();
    const { data: activeRows, error: activeErr } = await supabase
      .from("notificacao_de_servicos")
      .select("id,status,last_notified_at,response_deadline_at,attempt_no")
      .eq("service_id", serviceId)
      .eq("provider_user_id", providerUserId)
      .eq("attempt_no", attemptNo)
      .eq("status", "notified")
      .gte("response_deadline_at", nowIso)
      .limit(1);
    if (!activeErr && Array.isArray(activeRows) && activeRows.length > 0) {
      return true;
    }
  }

  const unique = [...new Set(userIds)].filter((id) =>
    Number.isFinite(id) && id > 0
  );
  if (unique.length === 0) return false;

  const thresholdIso = new Date(Date.now() - 25 * 1000).toISOString();
  const { data, error } = await supabase
    .from("notifications")
    .select("id,created_at")
    .in("user_id", unique)
    .eq("type", "service_offer")
    .eq("service_id", serviceId)
    .gte("created_at", thresholdIso)
    .limit(1);
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

async function resolveUserId(
  supabase: any,
  numericId: unknown,
  supabaseUid: unknown,
): Promise<number | null> {
  const parsed = Number(numericId);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  const uid = typeof supabaseUid === "string"
    ? supabaseUid.trim()
    : String(supabaseUid ?? "").trim();
  if (!uid) return null;

  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("supabase_uid", uid)
    .maybeSingle();

  const resolved = Number((data as { id?: unknown } | null)?.id);
  if (Number.isFinite(resolved) && resolved > 0) {
    return resolved;
  }
  return null;
}

serve(async (req): Promise<Response> => {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const apiKeyHeader = req.headers.get("apikey") || "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : authHeader.trim();
    const serviceKey = Deno.env.get("PROJECT_SERVICE_KEY") ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      "";
    const isInternalCall = Boolean(
      serviceKey &&
        (token === serviceKey || apiKeyHeader === serviceKey),
    );

    if (!isInternalCall) {
      const auth = await getAuthenticatedUser(req);
      if ("error" in auth) {
        return auth.error ??
          json({ error: "Unauthorized" }, 401);
      }

      const role = String(auth.appUser?.role ?? "").toLowerCase().trim();
      const isAllowedUser = role == "admin" || role == "service_role";
      if (!isAllowedUser) {
        return json(
          {
            error: "Forbidden",
            reason: "push-notifications requires internal service credentials",
          },
          403,
        );
      }
    }

    const payload = await req.json();
    console.log("Webhook payload received:", payload);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const serviceAccountJson = clean(Deno.env.get("FIREBASE_SERVICE_ACCOUNT"));
    const serviceAccount = serviceAccountJson
      ? JSON.parse(serviceAccountJson)
      : null;
    const accessToken = serviceAccount
      ? await getAccessToken(serviceAccount)
      : null;
    const legacyServerKey = clean(Deno.env.get("FCM_SERVER_KEY"));
    const pushTransport: PushTransport | null = serviceAccount && accessToken
      ? {
        kind: "fcm_v1",
        accessToken,
        projectId: clean(serviceAccount.project_id),
      }
      : legacyServerKey
      ? { kind: "fcm_legacy", serverKey: legacyServerKey }
      : null;
    const canUseFcm = Boolean(pushTransport);

    if (payload.token && payload.title && payload.body) {
      const dataPayload = ensureOfferDiagnostics(
        sanitizeDataPayload(payload.data ?? {}),
      );
      const token = String(payload.token);
      const { data: usersByToken } = await supabase
        .from("users")
        .select("id")
        .eq("fcm_token", token);
      const userIds = (usersByToken ?? []).map((u: { id: number }) =>
        Number(u.id)
      );
      const skipDuplicate = await shouldSkipDuplicateServiceOffer(
        supabase,
        userIds,
        dataPayload,
      );
      if (skipDuplicate) {
        return new Response(
          JSON.stringify({
            success: true,
            mode: "skipped_duplicate",
            duplicate: true,
            service_id: dataPayload.service_id ?? dataPayload.id ?? null,
            correlation_id: dataPayload.correlation_id ?? null,
            offer_fingerprint: dataPayload.offer_fingerprint ?? null,
          }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      await persistInAppNotifications(
        supabase,
        userIds,
        String(payload.title),
        String(payload.body),
        dataPayload,
      );

      if (!canUseFcm) {
        return new Response(
          JSON.stringify({
            success: false,
            mode: "in_app_only",
            fcm_ok: false,
            error_code: "FCM_UNAVAILABLE",
            error_type: "transient",
          }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const result = await dispatchPushMessage(
        pushTransport as PushTransport,
        token,
        String(payload.title),
        String(payload.body),
        dataPayload,
      );

      if (!result.fcm_ok && result.error_type === "permanent") {
        const { error: clearErr } = await supabase
          .from("users")
          .update({ fcm_token: null })
          .eq("fcm_token", token);
        if (clearErr) {
          console.error("Failed to invalidate permanent FCM token:", clearErr);
        }
      }

      console.log("FCM V1 direct send result:", result);
      return new Response(
        JSON.stringify({
          success: result.fcm_ok,
          mode: "fcm_and_in_app",
          fcm_ok: result.fcm_ok,
          error_code: result.error_code,
          error_type: result.error_type,
          result,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (payload.user_id && payload.title && payload.body) {
      const dataPayload = ensureOfferDiagnostics(
        sanitizeDataPayload(payload.data ?? {}),
      );
      const skipDuplicate = await shouldSkipDuplicateServiceOffer(
        supabase,
        [Number(payload.user_id)],
        dataPayload,
      );
      if (skipDuplicate) {
        return new Response(
          JSON.stringify({
            success: true,
            mode: "skipped_duplicate",
            duplicate: true,
            service_id: dataPayload.service_id ?? dataPayload.id ?? null,
            correlation_id: dataPayload.correlation_id ?? null,
            offer_fingerprint: dataPayload.offer_fingerprint ?? null,
          }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      await persistInAppNotifications(
        supabase,
        [Number(payload.user_id)],
        String(payload.title),
        String(payload.body),
        dataPayload,
      );

      if (!canUseFcm) {
        return new Response(
          JSON.stringify({ success: true, mode: "in_app_only" }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const { data: userData } = await supabase
        .from("users")
        .select("fcm_token")
        .eq("id", Number(payload.user_id))
        .maybeSingle();

      if (userData?.fcm_token) {
        const result = await dispatchPushMessage(
          pushTransport as PushTransport,
          String(userData.fcm_token),
          String(payload.title),
          String(payload.body),
          dataPayload,
        );
        return new Response(JSON.stringify({ success: true, result }), {
          headers: { "Content-Type": "application/json" },
        });
      } else {
        return new Response(
          JSON.stringify({ success: true, mode: "in_app_only_no_fcm_token" }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    const record = payload.record;
    const oldRecord = payload.old_record;
    if (!record || !record.id) {
      return new Response("No record found in payload", { status: 400 });
    }

    let title = "Atualização de Serviço";
    let body = "O status do seu serviço foi atualizado.";
    let targetUserIds: number[] = [];
    let dataPayload: Record<string, string> = {};

    if (payload.table === "service_requests") {
      const status = record.status;
      const oldStatus = oldRecord?.status;
      const [clientId, providerId] = await Promise.all([
        resolveUserId(supabase, record.client_id, record.client_uid),
        resolveUserId(supabase, record.provider_id, record.provider_uid),
      ]);

      if (status !== oldStatus) {
        if (status === "accepted") {
          title = "Serviço Aceito!";
          body = "Um prestador aceitou sua solicitação.";
          targetUserIds = clientId ? [clientId] : [];
        } else if (status === "provider_near") {
          title = "Prestador próximo";
          body = "O prestador está a menos de 500m do local.";
          targetUserIds = clientId ? [clientId] : [];
        } else if (status === "in_progress") {
          const remainingPaidStatuses = new Set([
            "paid",
            "paid_manual",
            "approved",
            "completed",
            "succeeded",
          ]);
          const currentRemaining = clean(record.payment_remaining_status)
            .toLowerCase();
          const oldRemaining = clean(oldRecord?.payment_remaining_status)
            .toLowerCase();
          const remainingJustPaid =
            remainingPaidStatuses.has(currentRemaining) &&
            !remainingPaidStatuses.has(oldRemaining);

          if (remainingJustPaid) {
            title = "Pagamento confirmado";
            body =
              "O cliente liberou o pagamento restante. Você já pode executar o serviço.";
            targetUserIds = providerId ? [providerId] : [];
          } else {
            title = "Serviço Iniciado";
            body = "O prestador iniciou o serviço.";
            targetUserIds = clientId ? [clientId] : [];
          }
        } else if (status === "waiting_payment_remaining") {
          title = "O Prestador Chegou!";
          body = "Por favor, libere o pagamento restante.";
          targetUserIds = clientId ? [clientId] : [];
        } else if (status === "client_departing") {
          title = "Cliente a caminho";
          body = "O cliente está a caminho do salão.";
          targetUserIds = providerId ? [providerId] : [];
        } else if (status === "client_arrived") {
          title = "Cliente chegou";
          body = "O cliente chegou ao local do atendimento.";
          targetUserIds = providerId ? [providerId] : [];
        } else if (status === "completed") {
          title = "Serviço Concluído";
          body = "O serviço foi finalizado com sucesso.";
          targetUserIds = [clientId, providerId]
            .filter((id): id is number => typeof id === "number" && id > 0);
        } else if (status === "open_for_schedule" && !oldStatus) {
          title = "Novo Serviço Disponível";
          body = providerId
            ? "Você recebeu uma nova solicitação direta de serviço."
            : "Há uma nova solicitação na sua região.";
          targetUserIds = providerId ? [providerId] : [];
        } else if (status === "awaiting_confirmation") {
          title = "Confirmação Necessária";
          body =
            "O prestador concluiu o serviço e enviou a evidência. Por favor, confirme.";
          targetUserIds = clientId ? [clientId] : [];
        } else if (status === "cancelled") {
          title = "Serviço Cancelado";
          body = "A solicitação de serviço foi cancelada.";
          targetUserIds = [clientId, providerId]
            .filter((id): id is number => typeof id === "number" && id > 0);
        }
      }

      dataPayload = {
        type: "status_update",
        service_id: record.id?.toString() ?? "",
        status: record.status?.toString() ?? "",
        location_type: record.location_type?.toString() ?? "",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      };
    } else if (payload.table === "trips") {
      if (!TRIP_RUNTIME_ENABLED) {
        return new Response(
          JSON.stringify({
            success: true,
            skipped: true,
            reason: "trip_runtime_disabled",
          }),
          {
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const status = record.status?.toString();
      const oldStatus = oldRecord?.status?.toString();
      const clientId = Number(record.client_id);
      const driverId = Number(record.driver_id);
      let driverName = "Motorista";
      let driverPhotoUrl = "";
      let vehicleModel = "Veiculo";
      let vehicleColor = "";
      let vehiclePlate = "---";

      if (!Number.isNaN(driverId) && driverId > 0) {
        const [{ data: driverUser }, { data: driverVehicle }] = await Promise
          .all([
            supabase
              .from("users")
              .select("full_name, avatar_url")
              .eq("id", driverId)
              .maybeSingle(),
            supabase
              .from("vehicles")
              .select("model, color, plate")
              .eq("driver_id", driverId)
              .maybeSingle(),
          ]);

        if (driverUser?.full_name) {
          driverName = driverUser.full_name;
        }
        if (driverUser?.avatar_url) {
          driverPhotoUrl = driverUser.avatar_url;
        }
        if (driverVehicle?.model) {
          vehicleModel = driverVehicle.model;
        }
        if (driverVehicle?.color) {
          vehicleColor = driverVehicle.color;
        }
        if (driverVehicle?.plate) {
          vehiclePlate = driverVehicle.plate;
        }
      }

      if (status && status !== oldStatus) {
        if (status === "accepted") {
          const firstName = driverName.split(" ")[0];
          title = `${firstName} está a caminho! 🚗`;

          const details = [];
          if (vehicleModel) details.push(vehicleModel);
          if (vehicleColor) details.push(vehicleColor);

          const vehicleStr = details.join(" • ");
          body = vehicleStr
            ? `${vehicleStr} - Placa: ${vehiclePlate}`
            : `Seu motorista aceitou a corrida.`;

          targetUserIds = Number.isNaN(clientId) ? [] : [clientId];
          dataPayload = {
            type: "uber_trip_accepted",
            trip_id: record.id?.toString() ?? "",
            status,
            title,
            body,
            driver_name: driverName,
            vehicle_model: vehicleModel,
            vehicle_color: vehicleColor,
            vehicle_plate: vehiclePlate,
            driver_photo_url: driverPhotoUrl,
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          };
        } else if (status === "arrived") {
          const firstName = driverName.split(" ")[0];
          title = `${firstName} chegou! 📍`;

          const details = [];
          if (vehicleModel) details.push(vehicleModel);
          if (vehicleColor) details.push(vehicleColor);

          const vehicleStr = details.join(" • ");
          body = vehicleStr
            ? `Veículo: ${vehicleStr} - Placa: ${vehiclePlate}`
            : `O seu motorista chegou ao local de embarque.`;

          targetUserIds = Number.isNaN(clientId) ? [] : [clientId];
          dataPayload = {
            type: "uber_trip_arrived",
            trip_id: record.id?.toString() ?? "",
            status,
            arrived_at: record.arrived_at?.toString() ?? "",
            title,
            body,
            driver_name: driverName,
            vehicle_model: vehicleModel,
            vehicle_color: vehicleColor,
            vehicle_plate: vehiclePlate,
            driver_photo_url: driverPhotoUrl,
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          };
        } else if (status === "in_progress") {
          title = "Corrida iniciada";
          body = "Sua viagem começou.";
          targetUserIds = Number.isNaN(clientId) ? [] : [clientId];
          dataPayload = {
            type: "uber_trip_started",
            trip_id: record.id?.toString() ?? "",
            status,
            title,
            body,
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          };
        } else if (status === "completed") {
          title = "Corrida concluída";
          body = "Sua viagem foi finalizada.";
          targetUserIds = Number.isNaN(clientId) ? [] : [clientId];
          dataPayload = {
            type: "uber_trip_completed",
            trip_id: record.id?.toString() ?? "",
            status,
            title,
            body,
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          };
        } else if (status === "cancelled") {
          title = "Corrida cancelada";
          body = "A corrida foi cancelada.";
          targetUserIds = [clientId, driverId].filter((id) =>
            !Number.isNaN(id) && id > 0
          );
          dataPayload = {
            type: "uber_trip_cancelled",
            trip_id: record.id?.toString() ?? "",
            status,
            title,
            body,
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          };
        }
      }
    } else if (payload.table === "chat_messages") {
      const serviceId = record.service_id?.toString();
      const senderId = Number(record.sender_id);
      if (!serviceId || Number.isNaN(senderId)) {
        return new Response("Invalid chat payload", { status: 200 });
      }

      let recipientId: number | null = null;
      let senderName = "Nova mensagem";

      const { data: senderUser } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", senderId)
        .maybeSingle();

      if (senderUser?.full_name) {
        senderName = senderUser.full_name;
      }

      const { data: trip } = await supabase
        .from("trips")
        .select("client_id, driver_id")
        .eq("id", serviceId)
        .maybeSingle();

      if (trip) {
        recipientId = Number(trip.client_id) === senderId
          ? Number(trip.driver_id)
          : Number(trip.client_id);
      } else {
        const { data: serviceReq } = await supabase
          .from("service_requests")
          .select("client_id, provider_id")
          .eq("id", serviceId)
          .maybeSingle();

        if (serviceReq) {
          recipientId = Number(serviceReq.client_id) === senderId
            ? Number(serviceReq.provider_id)
            : Number(serviceReq.client_id);
        } else {
          const { data: fixedBooking } = await supabase
            .from("agendamento_servico")
            .select("cliente_user_id, prestador_user_id")
            .eq("id", serviceId)
            .maybeSingle();

          if (fixedBooking) {
            recipientId = Number(fixedBooking.cliente_user_id) === senderId
              ? Number(fixedBooking.prestador_user_id)
              : Number(fixedBooking.cliente_user_id);
          }
        }
      }

      if (recipientId && !Number.isNaN(recipientId)) {
        targetUserIds = [recipientId];
        title = senderName;
        body = (record.content?.toString() ?? "Nova mensagem").slice(0, 180);
        dataPayload = {
          type: "chat_message",
          service_id: serviceId,
          message_id: record.id?.toString() ?? "",
          sender_id: senderId.toString(),
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        };
      }
    }

    const uniqueTargetUserIds = [...new Set(targetUserIds)].filter((id) =>
      !Number.isNaN(id) && id > 0
    );
    if (uniqueTargetUserIds.length === 0) {
      return new Response("No target user mapping", { status: 200 });
    }
    await persistInAppNotifications(
      supabase,
      uniqueTargetUserIds,
      title,
      body,
      dataPayload,
    );

    if (!canUseFcm) {
      return new Response(
        JSON.stringify({ success: true, mode: "in_app_only" }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { data: usersData } = await supabase
      .from("users")
      .select("fcm_token")
      .in("id", uniqueTargetUserIds);

    const tokens = (usersData ?? [])
      .map((user: { fcm_token?: string | null }) => user.fcm_token)
      .filter((token: string | null | undefined): token is string =>
        Boolean(token)
      );

    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, mode: "in_app_only_no_fcm_token" }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log("Notification dispatch prepared:", {
      table: payload.table,
      recordId: record.id?.toString?.() ?? "",
      targetUserIds: uniqueTargetUserIds,
      tokenCount: tokens.length,
      title,
      body,
      dataPayload,
    });

    const results = await Promise.all(
      tokens.map((token) =>
        dispatchPushMessage(
          pushTransport as PushTransport,
          token,
          title,
          body,
          dataPayload,
        )
      ),
    );

    console.log("FCM V1 send result:", results);
    return new Response(JSON.stringify({ success: true, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
