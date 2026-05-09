import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

const TRIP_RUNTIME_ENABLED = false;

function round2(value: number): number {
  return Number((Number(value) || 0).toFixed(2));
}

function asString(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeManualPaymentMethodId(input: unknown): string {
  const raw = asString(input).toLowerCase();
  if (!raw) return "cash";
  if (raw === "cash" || raw === "dinheiro") return "cash";
  if (raw === "pix_direct" || raw.includes("pix") && raw.includes("direto")) return "pix_direct";
  if (raw.startsWith("card_machine")) return raw;
  if (raw.includes("machine") || raw.includes("maquina") || raw.includes("máquina")) return "card_machine";
  return "cash";
}

async function findAnyPaymentByTrip(admin: any, tripId: string) {
  const firstTry = await admin
    .from("payments")
    .select("id")
    .eq("trip_id", tripId)
    .limit(1)
    .maybeSingle();
  if (!firstTry.error) return firstTry;

  // Fallback for schemas that still rely on created_at ordering.
  const secondTry = await admin
    .from("payments")
    .select("id")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return secondTry;
}

async function safeUpsertCashPayment(
  admin: any,
  tripId: string,
  driverId: string | number | null,
  totalAmount: number,
  commissionDue: number,
  commissionRate: number,
  paymentMethodId: string,
) {
  const payment = await findAnyPaymentByTrip(admin, tripId);

  if (payment.data?.id) {
    // Prefer full payload, fallback if schema is missing optional columns.
    const fullUpdate = await admin.from("payments").update({
      status: "pending",
      user_id: driverId,
      payment_method: paymentMethodId,
      payment_method_id: paymentMethodId,
      provider: "mercado_pago",
      billing_type: "CASH",
      commission_amount: commissionDue,
      commission_rate: commissionRate,
      amount: totalAmount,
    }).eq("id", payment.data.id);

    if (!fullUpdate.error) return;

    await admin.from("payments").update({
      status: "pending",
      user_id: driverId,
      payment_method: paymentMethodId,
      payment_method_id: paymentMethodId,
      provider: "mercado_pago",
      commission_amount: commissionDue,
      commission_rate: commissionRate,
      amount: totalAmount,
    }).eq("id", payment.data.id);
    return;
  }

  const fullInsert = await admin.from("payments").insert({
    trip_id: tripId,
    user_id: driverId,
    amount: totalAmount,
    status: "pending",
    payment_method: paymentMethodId,
    payment_method_id: paymentMethodId,
    provider: "mercado_pago",
    billing_type: "CASH",
    commission_amount: commissionDue,
    commission_rate: commissionRate,
  });

  if (!fullInsert.error) return;

  await admin.from("payments").insert({
    trip_id: tripId,
    user_id: driverId,
    amount: totalAmount,
    status: "pending",
    payment_method: paymentMethodId,
    payment_method_id: paymentMethodId,
    provider: "mercado_pago",
    commission_amount: commissionDue,
    commission_rate: commissionRate,
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let traceId = asString(req.headers.get("x-trace-id") || crypto.randomUUID());

  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;
    const { admin, appUser } = auth;

    const body = await req.json().catch(() => ({}));
    traceId = asString(body?.trace_id || traceId);
    const tripId = asString(body?.trip_id);
    const manualPaymentMethodId = normalizeManualPaymentMethodId(
      body?.manual_payment_method_id ?? body?.manual_payment_method ?? body?.payment_method_id,
    );
    if (!TRIP_RUNTIME_ENABLED) {
      return json({
        error: "Fluxo de corrida desativado neste ambiente",
        step: "trip_runtime_guard",
        reason_code: "TRIP_RUNTIME_DISABLED",
        trace_id: traceId,
        status_code: 410,
      }, 410);
    }
    if (!tripId) return json({ error: "trip_id é obrigatório", step: "validate_input", reason_code: "MISSING_TRIP_ID", trace_id: traceId, status_code: 400 }, 400);

    const { data: trip, error: tripError } = await admin
      .from("trips")
      .select("id, driver_id, status, payment_status, fare_estimated, fare_final")
      .eq("id", tripId)
      .single();
    if (tripError || !trip) {
      return json({ error: "Viagem não encontrada", step: "load_trip", reason_code: "TRIP_NOT_FOUND", trace_id: traceId, status_code: 404 }, 404);
    }

    const isServiceRole = String(appUser?.role ?? "").toLowerCase() === "service_role";
    if (!isServiceRole && String(trip.driver_id) !== String(appUser?.id ?? "")) {
      return json({ error: "Sem permissão para confirmar pagamento", step: "authorize_trip_access", reason_code: "AUTHZ_DENIED", trace_id: traceId, status_code: 403 }, 403);
    }

    if (trip.payment_status === "paid") {
      return json({ success: true, step: "idempotent_paid", reason_code: "ALREADY_PAID", trace_id: traceId });
    }

    const totalAmount = Number(trip.fare_final ?? trip.fare_estimated ?? 0);
    let commissionRate = 0.15;
    let driverPaymentMode = "platform";
    let driverDailyFeeAmount = 0;

    if (trip.driver_id) {
      const { data: driverUser } = await admin
        .from("users")
        .select("driver_payment_mode, driver_daily_fee_amount, driver_platform_tx_fee_rate")
        .eq("id", trip.driver_id)
        .maybeSingle();

      driverPaymentMode = (driverUser?.driver_payment_mode ?? "platform").toString().trim().toLowerCase();
      driverDailyFeeAmount = Number(driverUser?.driver_daily_fee_amount ?? 0);

      if (driverPaymentMode === "fixed" || driverPaymentMode === "direct") {
        commissionRate = 0;
      } else if (driverPaymentMode === "platform") {
        // Sistema simplificado: 5% PIX/dinheiro, 10% cartão na máquina.
        const isCardMachine = String(manualPaymentMethodId ?? "").toLowerCase().startsWith("card_machine");
        commissionRate = isCardMachine ? 0.10 : 0.05;
      }
    }

    let commissionDue = round2(totalAmount * commissionRate);
    
    // No modo platform, a comissão é calculada sobre o totalAmount * commissionRate.
    // Nos modos fixed e direct, a commissionRate já é 0 então o commissionDue será 0.
    // Removida a cobrança de taxa diária por corrida (pois deve ser cobrada separadamente).

    await admin.from("trips").update({
      status: "completed",
      payment_status: "paid", // Dinheiro recebido pelo motorista é considerado pago
      payment_method_id: manualPaymentMethodId,
      completed_at: new Date().toISOString(),
    }).eq("id", tripId);

    await safeUpsertCashPayment(
      admin,
      tripId,
      trip.driver_id ?? null,
      totalAmount,
      commissionDue,
      commissionRate,
      manualPaymentMethodId,
    );

    // A comissão será efetivada no driver_commission_summary apenas quando a viagem for COMPLETED no status.
    // Isso garante os dois passos solicitados: (1) Mostrar pague ao motorista, (2) Confirmar e finalizar.

    await admin.from("payment_transaction_logs").insert({
      trace_id: traceId,
      trip_id: tripId,
      provider: "mercado_pago",
      channel: "edge",
      event: "cash_confirm_completed",
      billing_type: "CASH",
      amount: totalAmount,
      payload: {
        driver_id: trip.driver_id,
        payment_method: manualPaymentMethodId,
        commission_due_total: commissionDue,
        commission_rate: commissionRate,
      },
    });

    return json({
      success: true,
      trace_id: traceId,
      step: "cash_confirm_completed",
      commission_due_total: commissionDue,
      commission_paid_now: 0,
      commission_due_remaining: commissionDue,
    });
  } catch (error: any) {
    return json({
      error: error?.message ?? "Falha ao confirmar pagamento em dinheiro",
      step: "internal_error",
      reason_code: "UNHANDLED_EXCEPTION",
      trace_id: traceId,
      status_code: 500,
    }, 500);
  }
});
