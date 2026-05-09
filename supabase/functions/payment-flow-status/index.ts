import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

type AnyRecord = Record<string, unknown>;
const TRIP_RUNTIME_ENABLED = false;

function asaasErrorMessage(payload: any): string | null {
  if (!payload || typeof payload !== "object") return null;
  const firstError = Array.isArray(payload.errors) ? payload.errors[0] : null;
  if (firstError && typeof firstError.description === "string") return firstError.description;
  if (typeof payload.message === "string") return payload.message;
  return null;
}

function normalizeStatus(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function isPaidLike(status: unknown): boolean {
  const v = normalizeStatus(status);
  return v === "paid" || v === "received" || v === "pending_settlement";
}

function isSettledLike(status: unknown): boolean {
  const v = normalizeStatus(status);
  return v === "settled" || v === "paid" || v === "received";
}

function parseTripId(req: Request, body: AnyRecord): string | null {
  const url = new URL(req.url);
  const fromQuery = (url.searchParams.get("trip_id") ?? "").trim();
  if (fromQuery) return fromQuery;
  const fromBody = String(body?.trip_id ?? "").trim();
  return fromBody || null;
}

function summarizeSplitInfo(raw: AnyRecord | null): AnyRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const split = raw.split;
  if (!Array.isArray(split)) return null;
  return {
    split_count: split.length,
    split_targets: split.map((entry: any) => ({
      wallet_id: entry?.walletId ?? null,
      fixed_value: entry?.fixedValue ?? null,
      percentual_value: entry?.percentualValue ?? null,
      status: entry?.status ?? null,
    })),
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;
    const { admin, appUser } = auth;

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const tripId = parseTripId(req, body);
    if (!TRIP_RUNTIME_ENABLED) {
      return json({
        error: "Fluxo de corrida desativado neste ambiente",
        reason_code: "TRIP_RUNTIME_DISABLED",
      }, 410);
    }
    if (!tripId) return json({ error: "trip_id é obrigatório" }, 400);

    const [{ data: trip, error: tripErr }, { data: payment, error: paymentErr }] = await Promise.all([
      admin
        .from("trips")
        .select("id, client_id, driver_id, status, payment_status, fare_estimated, fare_final")
        .eq("id", tripId)
        .maybeSingle(),
      admin
        .from("payments")
        .select(`
          id,
          trip_id,
          amount,
          status,
          payment_method_id,
          commission_amount,
          commission_rate,
          asaas_payment_id,
          asaas_status,
          billing_type,
          settlement_status,
          estimated_credit_date,
          received_at,
          created_at,
          updated_at
        `)
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (tripErr) return json({ error: `Erro ao buscar trip: ${tripErr.message}` }, 500);
    if (!trip) return json({ error: "Viagem não encontrada" }, 404);
    if (paymentErr) return json({ error: `Erro ao buscar pagamento: ${paymentErr.message}` }, 500);

    const isService = String(appUser?.id ?? "") === "service_role" || String(appUser?.role ?? "") === "admin";
    const appUserId = Number(appUser?.id ?? 0);
    const isTripParty =
      Number.isFinite(appUserId) && (appUserId === Number(trip.client_id) || appUserId === Number(trip.driver_id));

    if (!isService && !isTripParty) {
      return json({ error: "Sem permissão para consultar esta viagem" }, 403);
    }

    const { data: txLogs, error: logsErr } = await admin
      .from("payment_transaction_logs")
      .select("id, event, status, billing_type, amount, payload, created_at, asaas_payment_id")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (logsErr) return json({ error: `Erro ao buscar logs de transação: ${logsErr.message}` }, 500);

    let asaasPayment: AnyRecord | null = null;
    let asaasQuery: AnyRecord = { queried: false };
    const asaasPaymentId = String(payment?.asaas_payment_id ?? "").trim();
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    const ASAAS_URL = (Deno.env.get("ASAAS_URL") || "https://sandbox.asaas.com/api/v3").replace(/\/+$/, "");
    const ASAAS_PROXY_URL = String(Deno.env.get("ASAAS_PROXY_URL") ?? "").trim();
    const ASAAS_PROXY_INTERNAL_KEY = String(Deno.env.get("ASAAS_PROXY_INTERNAL_KEY") ?? "").trim();
    const usingProxy = ASAAS_PROXY_URL.length > 0 && ASAAS_PROXY_INTERNAL_KEY.length > 0;
    const asaasBaseUrl = usingProxy ? `${ASAAS_PROXY_URL.replace(/\/+$/, "")}/asaas` : ASAAS_URL;

    if (payment && asaasPaymentId && ASAAS_API_KEY) {
      asaasQuery = { queried: true, payment_id: asaasPaymentId, via_proxy: usingProxy };
      const headers = new Headers({ "Content-Type": "application/json" });
      if (usingProxy) headers.set("x-internal-key", ASAAS_PROXY_INTERNAL_KEY);
      else headers.set("access_token", ASAAS_API_KEY);

      const asaasRes = await fetch(`${asaasBaseUrl}/payments/${asaasPaymentId}`, {
        method: "GET",
        headers,
      });
      const asaasRaw = await asaasRes.json().catch(() => ({}));
      if (asaasRes.ok && asaasRaw && typeof asaasRaw === "object") {
        asaasPayment = asaasRaw as AnyRecord;
        asaasQuery = { ...asaasQuery, ok: true };
      } else {
        asaasQuery = {
          ...asaasQuery,
          ok: false,
          status: asaasRes.status,
          asaas_error: asaasErrorMessage(asaasRaw),
        };
      }
    }

    const paymentAmount = Number(payment?.amount ?? trip.fare_final ?? trip.fare_estimated ?? 0);
    const commissionAmount = Number(payment?.commission_amount ?? 0);
    const driverNetAmount = Number((Math.max(0, paymentAmount - commissionAmount)).toFixed(2));

    const hasDriverWalletCreditLog = (txLogs ?? []).some((log) =>
      String(log.event ?? "").toLowerCase() === "webhook_driver_balance_credited"
    );

    const asaasStatus = normalizeStatus(payment?.asaas_status ?? asaasPayment?.status ?? null);
    const settlementStatus = normalizeStatus(payment?.settlement_status ?? null);
    const tripPaymentStatus = normalizeStatus(trip.payment_status);

    const splitInfo = summarizeSplitInfo(asaasPayment);
    const splitDetectedInGateway = splitInfo !== null;

    const lifecycle = {
      charge_created: Boolean(payment?.id),
      passenger_payment_confirmed: isPaidLike(payment?.status) || isPaidLike(asaasStatus) || tripPaymentStatus === "paid",
      master_account_settled: isSettledLike(settlementStatus) || isSettledLike(asaasStatus),
      split_detected_in_gateway: splitDetectedInGateway,
      driver_balance_credited_local: hasDriverWalletCreditLog,
    };

    const flowHealth = lifecycle.charge_created && lifecycle.passenger_payment_confirmed
      ? lifecycle.master_account_settled
        ? "healthy_settled"
        : "awaiting_settlement"
      : payment
      ? "awaiting_passenger_payment"
      : "payment_not_created";

    return json({
      success: true,
      trip_id: tripId,
      flow_health: flowHealth,
      trip: {
        status: trip.status,
        payment_status: trip.payment_status,
        client_id: trip.client_id,
        driver_id: trip.driver_id,
        fare_estimated: trip.fare_estimated,
        fare_final: trip.fare_final,
      },
      amounts: {
        total_amount: paymentAmount,
        platform_fee_amount: commissionAmount,
        driver_net_amount: driverNetAmount,
        commission_rate: payment?.commission_rate ?? null,
      },
      payment: payment
        ? {
            id: payment.id,
            method: payment.payment_method_id,
            billing_type: payment.billing_type,
            status: payment.status,
            asaas_status: payment.asaas_status,
            settlement_status: payment.settlement_status,
            estimated_credit_date: payment.estimated_credit_date,
            received_at: payment.received_at,
            asaas_payment_id: payment.asaas_payment_id,
            created_at: payment.created_at,
            updated_at: payment.updated_at,
          }
        : null,
      split_gateway: splitInfo,
      lifecycle,
      transaction_logs_count: (txLogs ?? []).length,
      transaction_logs: (txLogs ?? []).map((log) => ({
        id: log.id,
        event: log.event,
        status: log.status,
        billing_type: log.billing_type,
        amount: log.amount,
        asaas_payment_id: log.asaas_payment_id,
        created_at: log.created_at,
      })),
      asaas_query: asaasQuery,
    });
  } catch (error: any) {
    console.error("❌ [payment-flow-status]", error?.message ?? error);
    return json({ error: error?.message ?? "Falha ao consolidar fluxo de pagamento" }, 500);
  }
});
