import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

function isAllowedRole(role: unknown): boolean {
  const v = String(role ?? "").toLowerCase();
  return v === "client" || v === "driver" || v === "admin";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;
    const { admin, appUser } = auth;
    const userId = appUser?.id;
    if (!userId) return json({ error: "Usuário inválido" }, 401);
    if (!isAllowedRole(appUser?.role)) {
      return json({ error: "Perfil sem permissão para consultar rastreio de pagamento." }, 403);
    }

    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const tripId = String(body?.trip_id ?? url.searchParams.get("trip_id") ?? "").trim();
    const limit = Number(body?.limit ?? url.searchParams.get("limit") ?? "200");

    if (!tripId) return json({ error: "trip_id é obrigatório" }, 400);

    const { data: trip, error: tripError } = await admin
      .from("trips")
      .select("id, client_id, driver_id, status, payment_status, fare_estimated, fare_final")
      .eq("id", tripId)
      .maybeSingle();

    if (tripError || !trip) return json({ error: "Viagem não encontrada" }, 404);

    const isParticipant =
      String(appUser.role).toLowerCase() === "admin" ||
      trip.client_id === userId ||
      trip.driver_id === userId;
    if (!isParticipant) {
      return json({ error: "Você não participa desta viagem." }, 403);
    }

    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .select(
        "id, trip_id, amount, status, billing_type, asaas_payment_id, asaas_status, settlement_status, estimated_credit_date, received_at, created_at, updated_at, payment_method_id, commission_amount, commission_rate",
      )
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError) {
      return json({ error: "Falha ao consultar pagamentos", details: paymentError.message }, 500);
    }

    const { data: txLogs, error: txLogsError } = await admin
      .from("payment_transaction_logs")
      .select(
        "id, trace_id, event, status, billing_type, amount, asaas_payment_id, payload, created_at, channel, provider",
      )
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true })
      .limit(limit > 0 ? Math.min(limit, 1000) : 200);

    if (txLogsError) {
      return json({ error: "Falha ao consultar logs de transação", details: txLogsError.message }, 500);
    }

    const timeline = (txLogs ?? []).map((row: any) => ({
      at: row.created_at,
      trace_id: row.trace_id,
      event: row.event,
      status: row.status,
      billing_type: row.billing_type,
      asaas_payment_id: row.asaas_payment_id,
      channel: row.channel,
      provider: row.provider,
      amount: row.amount,
      payload: row.payload ?? {},
    }));

    return json({
      success: true,
      trip: {
        id: trip.id,
        status: trip.status,
        payment_status: trip.payment_status,
        fare_estimated: trip.fare_estimated,
        fare_final: trip.fare_final,
      },
      payment: payment ?? null,
      logs_count: timeline.length,
      timeline,
    });
  } catch (error: any) {
    return json(
      {
        error: "Erro ao consultar rastreio de pagamento",
        details: String(error?.message ?? error),
      },
      500,
    );
  }
});

