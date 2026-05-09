/** Force redeploy for JWT config - v2 **/
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const MP_SECRET = Deno.env.get("MP_WEBHOOK_SECRET") || "";
const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN") || "";

function clean(v: unknown): string {
  return String(v ?? "").trim();
}

function lower(v: unknown): string {
  return clean(v).toLowerCase();
}

serve(async (req) => {
  const traceId = req.headers.get("x-trace-id") || crypto.randomUUID();
  try {
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);
    const liveMode = payload.live_mode === true || payload.live_mode === "true";

    // 1. Skip signature for local tests or non-live notifications from dashboard simulator
    const isTestSimulation = !liveMode && payload.id === "123456";

    /*
    if (MP_SECRET && !isTestSimulation) {
      const signature = req.headers.get("x-signature") || "";
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw", encoder.encode(MP_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
      );
      const isValid = await crypto.subtle.verify(
        "HMAC", key, hexToBytes(signature), encoder.encode(rawBody)
      );
      if (!isValid) return new Response("Invalid signature", { status: 401 });
    }
    */

    if (!liveMode) {
      console.log("[Webhook] Test notification received and acknowledged.");
      return new Response(JSON.stringify({ reason: "test_notification_ignored" }), { status: 200 });
    }

    const url = new URL(req.url);
    const topic = url.searchParams.get("topic") || payload.type || payload.action?.split('.')[0];
    const id = url.searchParams.get("id") || payload.data?.id || payload.id;

    console.log(`[Webhook][${traceId}] Action: ${payload.action}, Topic: ${topic}, ID: ${id}`);

    if (!id || (topic && !["payment", "payment.created", "payment.updated"].includes(topic))) {
      return new Response(JSON.stringify({ ignored: true, reason: "invalid_topic_or_id" }), { status: 200 });
    }

    const paymentId = id;

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
    });
    
    if (!mpRes.ok) {
      const errorData = await mpRes.text();
      console.error(`[Webhook][${traceId}] MP API Error for ID ${paymentId}:`, errorData);
      return new Response(JSON.stringify({ error: "mp_api_error", details: errorData }), { status: 200 });
    }

    const mpData = await mpRes.json();

    if (lower(mpData.status) !== "approved") {
      return new Response(JSON.stringify({ status: mpData.status, action: "ignored" }), { status: 200 });
    }

    // Identifica o recurso (service_id ou intent_id)
    const externalReference = clean(mpData.external_reference || mpData.metadata?.service_id);
    if (!externalReference) throw new Error("No external_reference or service_id in payment metadata");

    console.log(`[Webhook][${traceId}] Processing payment for resource: ${externalReference}`);

    // 1. Tenta encontrar em fixed_booking_pix_intents (Agendamento Fixo)
    const { data: intent } = await supabase
      .from("fixed_booking_pix_intents")
      .select("*")
      .eq("id", externalReference)
      .maybeSingle();

    if (intent) {
      if (lower(intent.status) === "paid") {
        return new Response(JSON.stringify({ already_paid: true, source: "fixed_booking_pix_intents" }), { status: 200 });
      }

      // Materializa o agendamento real na tabela LEGADA/FIXA correta: agendamento_servico
      const scheduledAt = clean(intent.scheduled_at);
      
      const { data: newService, error: srvError } = await supabase
        .from("agendamento_servico")
        .insert({
          cliente_uid: intent.cliente_uid,
          prestador_uid: intent.prestador_uid,
          cliente_user_id: intent.cliente_user_id,
          prestador_user_id: intent.prestador_user_id,
          status: "CONFIRMADO", // Status esperado pelo app para fixos
          tipo_fluxo: "FIXO",
          data_agendada: scheduledAt,
          duracao_estimada_minutos: intent.duration_minutes,
          preco_total: intent.price_estimated,
          valor_entrada: intent.price_upfront,
          endereco_completo: intent.address,
          latitude: intent.latitude,
          longitude: intent.longitude,
          tarefa_id: intent.task_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select("id")
        .single();

      if (srvError) {
        console.error(`[Webhook][${traceId}] Error materializing fixed service:`, srvError);
        throw srvError;
      }

      // Atualiza o intento como pago e vincula o serviço criado
      await supabase
        .from("fixed_booking_pix_intents")
        .update({
          status: "paid",
          payment_status: "paid",
          paid_at: new Date().toISOString(),
          created_service_id: newService.id
        })
        .eq("id", externalReference);

      console.log(`[Webhook][${traceId}] Fixed service materialized: ${newService.id}`);
      return new Response(JSON.stringify({ success: true, source: "agendamento_servico", serviceId: newService.id }), { status: 200 });
    }

    // 2. Tenta encontrar em service_requests (Fluxo Móvel - 30%/70%)
    const { data: currentSrv, error: findError } = await supabase
      .from("service_requests")
      .select("id, status, payment_remaining_status, provider_id")
      .eq("id", externalReference)
      .maybeSingle();

    if (findError) {
      console.error(`[Webhook][${traceId}] Error searching service_requests:`, findError);
    }

    if (currentSrv) {
      const stage = lower(mpData.metadata?.payment_stage || "deposit");
      const isRemaining = stage === "remaining";
      
      console.log(`[Webhook][${traceId}] Found service_requests match. Stage: ${stage}, Current Status: ${currentSrv.status}`);
      
      const updatePayload: any = {
        payment_id: paymentId.toString(),
        payment_provider: "mercadopago",
        payment_status: "paid", // Sinaliza que o sinal (deposit) foi pago
        paid_at: new Date().toISOString(),
        status_updated_at: new Date().toISOString()
      };

      if (isRemaining) {
        updatePayload.payment_remaining_status = "paid";
        // Se estiver aguardando pagamento do restante, move para em progresso
        if (["waiting_payment_remaining", "waiting_remaining_payment", "aguardando_pagamento_restante"].includes(lower(currentSrv.status))) {
          updatePayload.status = "in_progress";
        }
      } else {
        // Fluxo de Entrada (30%)
        // IMPORTANTE: Mudar para 'searching' se não houver prestador ainda, para disparar o trg_enqueue_dispatch_on_searching_paid
        if (!currentSrv.provider_id) {
          updatePayload.status = "searching"; 
        } else {
          updatePayload.status = "accepted"; // Se já tiver prestador (ex: agendamento móvel aceito)
        }
      }

      console.log(`[Webhook][${traceId}] Attempting to update service_requests for ID: ${externalReference}`);
      const { error: updError } = await supabase
        .from("service_requests")
        .update(updatePayload)
        .eq("id", externalReference);

      if (updError) {
        console.error(`[Webhook][${traceId}] Error updating service_requests:`, updError);
        throw updError;
      }

      console.log(`[Webhook][${traceId}] Mobile service updated: ${externalReference} to status ${updatePayload.status}`);
      return new Response(JSON.stringify({ success: true, source: "service_requests", serviceId: externalReference }), { status: 200 });
    }

    throw new Error(`Resource ${externalReference} not found in fixed_intents or service_requests`);

  } catch (err) {
    console.error(`🚨 [mp-pix-webhook][${traceId}] Error:`, err);
    return new Response(JSON.stringify({ error: err.message, trace_id: traceId }), { status: 200 }); // Return 200 to MP to avoid retries on logic errors, but log it
  }
});

function hexToBytes(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  return bytes.buffer.slice(0);
}

