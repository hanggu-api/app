import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

function clean(v: unknown): string {
  return String(v ?? "").trim();
}

function digits(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "");
}

function round2(v: number): number {
  return Number((Number(v) || 0).toFixed(2));
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const traceId = req.headers.get("x-trace-id") || crypto.randomUUID();

  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const body = await req.json().catch(() => ({}));
    const tripId = clean(body?.trip_id);

    if (!tripId) {
      return json({ error: "trip_id obrigatório", trace_id: traceId }, 400);
    }

    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    if (!MP_ACCESS_TOKEN) {
      return json({ error: "MP_ACCESS_TOKEN não configurado", trace_id: traceId }, 500);
    }

    // 1. Buscar Dados da Viagem
    const { data: trip, error: tripError } = await admin
      .from("trips")
      .select(`id, client_id, driver_id, pickup_address, dropoff_address, fare_estimated, fare_final,
        client:users!trips_client_id_fkey(id,email,full_name,document_value),
        driver:users!trips_driver_id_fkey(id,full_name,document_value)`)
      .eq("id", tripId)
      .single();

    if (tripError || !trip) {
      return json({ error: "Corrida não encontrada", trace_id: traceId }, 404);
    }

    // 2. Verificar Conexão do Motorista para Split
    let driverAccessToken: string | null = null;
    if (trip.driver_id) {
      const { data: mpAcc } = await admin
        .from("driver_mercadopago_accounts")
        .select("access_token")
        .eq("user_id", trip.driver_id)
        .maybeSingle();
      
      if (mpAcc?.access_token) {
        driverAccessToken = mpAcc.access_token;
      }
    }

    // 3. Cálculo de Comissões
    const totalAmount = Number(trip.fare_final ?? trip.fare_estimated ?? 0);
    let commissionRate = 0.15;
    const { data: cfg } = await admin.from("uber_config").select("commission_rate").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (cfg?.commission_rate != null) commissionRate = Number(cfg.commission_rate);

    // Ajustar taxa baseada no perfil do motorista
    const { data: driverUser } = await admin.from("users").select("driver_payment_mode, driver_platform_tx_fee_rate").eq("id", trip.driver_id).maybeSingle();
    if (Number(driverUser?.driver_platform_tx_fee_rate) > 0) {
      commissionRate = Number(driverUser.driver_platform_tx_fee_rate);
    }

    const platformFee = round2(totalAmount * commissionRate);
    const payerDoc = digits(trip.client?.document_value);
    const driverDoc = digits(trip.driver?.document_value);

    // 4. Criar Preferência no Mercado Pago (Checkout Pro)
    const activeAccessToken = driverAccessToken || MP_ACCESS_TOKEN;
    const richDescription = `Viagem [101 Service]: ${clean(trip.pickup_address).slice(0, 30)} -> ${clean(trip.dropoff_address).slice(0, 30)}`;

    const preferencePayload: any = {
      items: [
        {
          id: tripId,
          title: richDescription,
          description: `De: ${trip.client?.full_name} (${payerDoc}) Para: ${trip.driver?.full_name} (${driverDoc})`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: totalAmount,
        }
      ],
      payer: {
        email: clean(trip.client?.email) || `user_${trip.client_id}@example.com`,
        name: clean(trip.client?.full_name).split(" ")[0],
        identification: { type: "CPF", number: payerDoc },
      },
      external_reference: tripId,
      metadata: {
        trip_id: tripId,
        platform_fee: platformFee,
        trace_id: traceId,
      },
      back_urls: {
        success: "service101://uber-payment-success",
        failure: "service101://uber-payment-failure",
        pending: "service101://uber-payment-pending",
      },
      auto_return: "approved",
      notification_url: "https://mroesvsmylnaxelrhqtl.supabase.co/functions/v1/mp-webhook",
    };

    // Injetar Split se configurado
    if (driverAccessToken) {
      preferencePayload.application_fee = platformFee;
      console.log(`🔗 [Preference] Split ativo. Comissão: R$ ${platformFee}`);
    }

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeAccessToken}`,
      },
      body: JSON.stringify(preferencePayload),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error("❌ Erro ao criar preferência:", mpData);
      return json({ error: "Falha ao gerar link de pagamento", details: mpData }, 400);
    }

    return json({
      success: true,
      preference_id: mpData.id,
      init_point: mpData.init_point, // URL para web
      sandbox_init_point: mpData.sandbox_init_point, // URL para testes
      trace_id: traceId,
    });

  } catch (error: any) {
    console.error("❌ Erro critico:", error);
    return json({ error: error.message }, 500);
  }
});
