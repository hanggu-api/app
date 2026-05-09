import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, json, supabaseAdmin } from "../_shared/auth.ts";

const TRIP_RUNTIME_ENABLED = false;

function clean(v: unknown): string {
  return String(v ?? "").trim();
}

function mapMpStatus(status: string): string {
  const s = clean(status).toLowerCase();
  if (s === "approved") return "paid";
  if (
    s === "cancelled" || s === "rejected" || s === "refunded" ||
    s === "charged_back"
  ) return "cancelled";
  return "pending";
}

function round2(v: number): number {
  return Number((Number(v) || 0).toFixed(2));
}

function toIntId(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  const s = clean(v);
  if (!/^\d+$/.test(s)) return null;
  return Number(s);
}

function statusToIntentStatus(localStatus: string): string {
  if (localStatus === "paid") return "paid";
  if (localStatus === "cancelled") return "cancelled";
  return "pending_payment";
}

function paymentStatusToIntentStatus(localStatus: string): string {
  if (localStatus === "paid") return "paid";
  if (localStatus === "cancelled") return "cancelled";
  return "pending";
}

async function loadUserName(
  admin: any,
  userId: number | null,
  uid: string,
): Promise<string | null> {
  if (userId != null) {
    const { data } = await admin
      .from("users")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    const name = clean(data?.full_name);
    if (name) return name;
  }
  if (uid) {
    const { data } = await admin
      .from("users")
      .select("full_name")
      .eq("supabase_uid", uid)
      .maybeSingle();
    const name = clean(data?.full_name);
    if (name) return name;
  }
  return null;
}

async function materializeFixedBookingFromIntent(
  admin: any,
  intent: Record<string, any>,
) {
  const existingServiceId = clean(intent.created_service_id);
  if (existingServiceId) {
    return { serviceId: existingServiceId, created: false };
  }

  const scheduledAt = clean(intent.scheduled_at);
  if (!scheduledAt) {
    throw new Error("Intento fixo sem scheduled_at.");
  }

  const durationMinutes = Math.max(1, toIntId(intent.duration_minutes) ?? 60);
  const scheduledStart = new Date(scheduledAt);
  const scheduledEnd = new Date(
    scheduledStart.getTime() + durationMinutes * 60 * 1000,
  );
  const clientUserId = toIntId(intent.cliente_user_id);
  const providerUserId = toIntId(intent.prestador_user_id);
  if (providerUserId == null) {
    throw new Error("Intento fixo sem prestador_user_id.");
  }

  const { data: slotHold } = await admin
    .from("fixed_booking_slot_holds")
    .select("*")
    .eq("pix_intent_id", clean(intent.id))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!slotHold) {
    throw new Error("Intento fixo sem bloqueio temporário de agenda.");
  }

  const holdStatus = clean(slotHold.status).toLowerCase();
  const expiresAt = clean(slotHold.expires_at);
  if (holdStatus === "cancelled" || holdStatus === "expired") {
    throw new Error("O bloqueio temporário desse horário já expirou.");
  }
  if (expiresAt) {
    const expiresAtDate = new Date(expiresAt);
    if (!Number.isNaN(expiresAtDate.getTime()) && expiresAtDate < new Date()) {
      await admin
        .from("fixed_booking_slot_holds")
        .update({
          status: "expired",
          updated_at: new Date().toISOString(),
        })
        .eq("id", clean(slotHold.id));
      await admin
        .from("fixed_booking_pix_intents")
        .update({
          status: "expired",
          updated_at: new Date().toISOString(),
        })
        .eq("id", clean(intent.id));
      throw new Error(
        "O bloqueio temporário desse horário expirou antes da confirmação.",
      );
    }
  }

  const bookingInsert = {
    cliente_uid: clean(intent.cliente_uid),
    prestador_uid: clean(intent.prestador_uid) || null,
    cliente_user_id: clientUserId,
    prestador_user_id: providerUserId,
    tipo_fluxo: "FIXO",
    status: "CONFIRMADO",
    data_agendada: scheduledStart.toISOString(),
    duracao_estimada_minutos: durationMinutes,
    latitude: Number(intent.latitude ?? 0),
    longitude: Number(intent.longitude ?? 0),
    localizacao_origem: `POINT(${Number(intent.longitude ?? 0)} ${
      Number(intent.latitude ?? 0)
    })`,
    endereco_completo: clean(intent.address) || null,
    tarefa_id: toIntId(intent.task_id),
    preco_total: round2(Number(intent.price_estimated ?? 0)),
    valor_entrada: round2(Number(intent.price_upfront ?? 0)),
    image_keys: Array.isArray(intent.image_keys) ? intent.image_keys : [],
    video_key: clean(intent.video_key) || null,
    updated_at: new Date().toISOString(),
  };

  const { data: insertedBooking, error: bookingError } = await admin
    .from("agendamento_servico")
    .insert(bookingInsert)
    .select("id")
    .single();

  if (bookingError || !insertedBooking?.id) {
    throw bookingError ?? new Error("Falha ao criar agendamento fixo pago.");
  }

  const serviceId = clean(insertedBooking.id);
  const clientName =
    await loadUserName(admin, clientUserId, clean(intent.cliente_uid)) ??
      "Cliente";

  const { error: appointmentError } = await admin.from("appointments").insert({
    provider_id: providerUserId,
    client_id: clientUserId,
    agendamento_servico_id: serviceId,
    start_time: scheduledStart.toISOString(),
    end_time: scheduledEnd.toISOString(),
    status: "confirmed",
    procedure_name: clean(intent.task_name) || clean(intent.description) ||
      "Agendamento",
    client_name: clientName,
  });

  if (appointmentError) {
    throw appointmentError;
  }

  await admin
    .from("fixed_booking_pix_intents")
    .update({
      status: "paid",
      payment_status: "paid",
      created_service_id: serviceId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clean(intent.id));

  await admin
    .from("fixed_booking_slot_holds")
    .update({
      status: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("id", clean(slotHold.id));

  return { serviceId, created: true };
}

function parseSignatureHeader(
  header: string,
): { ts: string; v1: string } | null {
  const parts = header
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  let ts = "";
  let v1 = "";
  for (const part of parts) {
    const [k, v] = part.split("=", 2).map((p) => p.trim());
    if (!k || !v) continue;
    if (k === "ts") ts = v;
    if (k === "v1") v1 = v.toLowerCase();
  }
  if (!ts || !v1) return null;
  return { ts, v1 };
}

function constantTimeEqualHex(a: string, b: string): boolean {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (!left || !right || left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  const bytes = new Uint8Array(signed);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }
  const traceId = req.headers.get("x-trace-id") || crypto.randomUUID();

  try {
    const admin = supabaseAdmin();
    const rawBody = await req.text();
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const eventType = clean(payload?.type);
    const url = new URL(req.url);
    const dataId = clean(payload?.data?.id || url.searchParams.get("data.id"));
    if (eventType != "payment" || !dataId) {
      return json({ received: true, ignored: true, trace_id: traceId });
    }

    // Webhook signature validation (Mercado Pago)
    const MP_WEBHOOK_SECRET = clean(Deno.env.get("MP_WEBHOOK_SECRET"));
    if (MP_WEBHOOK_SECRET) {
      const xSignature = clean(req.headers.get("x-signature"));
      const xRequestId = clean(req.headers.get("x-request-id"));
      const parsed = parseSignatureHeader(xSignature);
      if (!parsed || !xRequestId) {
        await admin.from("payment_transaction_logs").insert({
          trace_id: traceId,
          trip_id: null,
          provider: "mercado_pago",
          channel: "webhook",
          event: "webhook_signature_missing_or_malformed",
          status: "rejected",
          payload: {
            has_signature: Boolean(xSignature),
            has_request_id: Boolean(xRequestId),
          },
        });
        return json({
          error: "Assinatura do webhook ausente ou inválida",
          step: "verify_signature",
          reason_code: "WEBHOOK_SIGNATURE_MALFORMED",
          trace_id: traceId,
        }, 401);
      }

      const tsNumeric = Number(parsed.ts);
      if (!Number.isFinite(tsNumeric)) {
        return json({
          error: "Timestamp inválido no webhook",
          step: "verify_signature",
          reason_code: "WEBHOOK_TS_INVALID",
          trace_id: traceId,
        }, 401);
      }

      const tsMillis = tsNumeric > 1e12 ? tsNumeric : tsNumeric * 1000;
      const now = Date.now();
      const driftMs = Math.abs(now - tsMillis);
      if (driftMs > 5 * 60 * 1000) {
        return json({
          error: "Webhook fora da janela de tempo permitida",
          step: "verify_signature",
          reason_code: "WEBHOOK_TS_OUT_OF_WINDOW",
          trace_id: traceId,
          details: { drift_ms: driftMs },
        }, 401);
      }

      const manifest = `id:${dataId};request-id:${xRequestId};ts:${parsed.ts};`;
      const expected = await hmacSha256Hex(MP_WEBHOOK_SECRET, manifest);
      if (!constantTimeEqualHex(parsed.v1, expected)) {
        await admin.from("payment_transaction_logs").insert({
          trace_id: traceId,
          trip_id: null,
          provider: "mercado_pago",
          channel: "webhook",
          event: "webhook_signature_invalid",
          status: "rejected",
          payload: {
            data_id: dataId,
            request_id: xRequestId,
            ts: parsed.ts,
          },
        });
        return json({
          error: "Assinatura do webhook inválida",
          step: "verify_signature",
          reason_code: "WEBHOOK_SIGNATURE_INVALID",
          trace_id: traceId,
        }, 401);
      }
    }

    const MP_ACCESS_TOKEN = clean(Deno.env.get("MP_ACCESS_TOKEN"));
    if (!MP_ACCESS_TOKEN) {
      return json(
        { error: "MP_ACCESS_TOKEN não configurado", trace_id: traceId },
        500,
      );
    }

    async function fetchPaymentWith(token: string) {
      const r = await fetch(
        `https://api.mercadopago.com/v1/payments/${dataId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const d = await r.json().catch(() => ({}));
      return { r, d };
    }

    let tokenSource = "primary";
    let { r: mpRes, d: mpPayment } = await fetchPaymentWith(MP_ACCESS_TOKEN);

    if (!mpRes.ok) {
      if (mpRes.status === 404) {
        await admin.from("payment_transaction_logs").insert({
          trace_id: traceId,
          trip_id: null,
          provider: "mercado_pago",
          channel: "webhook",
          event: "webhook_payment_not_found",
          status: "ignored",
          payload: {
            external_payment_id: dataId,
            webhook_type: eventType,
            details: mpPayment,
          },
        });
        return json({
          received: true,
          ignored: true,
          reason: "payment_not_found",
          trace_id: traceId,
        });
      }
      return json({
        error: "Falha ao consultar pagamento no Mercado Pago",
        trace_id: traceId,
        details: mpPayment,
      }, 502);
    }

    const externalReference = clean(mpPayment?.external_reference);
    const localStatus = mapMpStatus(clean(mpPayment?.status));
    const paymentStage =
      clean(mpPayment?.metadata?.payment_stage).toLowerCase() || "deposit";
    const billingType =
      clean(mpPayment?.payment_method_id).toLowerCase() === "pix"
        ? "PIX"
        : "CREDIT_CARD";
    const pixPayload = clean(
      mpPayment?.point_of_interaction?.transaction_data?.qr_code,
    );
    const pixQr = clean(
      mpPayment?.point_of_interaction?.transaction_data?.qr_code_base64,
    );

    await admin.from("payment_transaction_logs").insert({
      trace_id: traceId,
      trip_id: externalReference || null,
      provider: "mercado_pago",
      channel: "webhook",
      event: "webhook_payment_fetched",
      status: clean(mpPayment?.status) || "unknown",
      billing_type: billingType,
      amount: Number(mpPayment?.transaction_amount ?? 0) || null,
      payload: {
        token_source: tokenSource,
        data_id: dataId,
        external_reference: externalReference,
        status: mpPayment?.status ?? null,
        status_detail: mpPayment?.status_detail ?? null,
        payment_method_id: mpPayment?.payment_method_id ?? null,
      },
    });

    await admin.from("payments").update({
      status: localStatus,
      settlement_status: clean(mpPayment?.status).toLowerCase(),
      provider: "mercado_pago",
      external_payment_id: dataId,
      mp_payment_id: dataId,
      billing_type: billingType,
      pix_payload: pixPayload || null,
      pix_qr_code: pixQr || null,
      mp_response: mpPayment,
      updated_at: new Date().toISOString(),
    }).eq("external_payment_id", dataId);

    if (externalReference) {
      const { data: pendingFixedIntent } = await admin
        .from("fixed_booking_pix_intents")
        .select("*")
        .eq("id", externalReference)
        .maybeSingle();

      if (pendingFixedIntent) {
        await admin
          .from("fixed_booking_pix_intents")
          .update({
            status: statusToIntentStatus(localStatus),
            payment_status: paymentStatusToIntentStatus(localStatus),
            updated_at: new Date().toISOString(),
          })
          .eq("id", externalReference);

        if (localStatus === "cancelled") {
          await admin
            .from("fixed_booking_slot_holds")
            .update({
              status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("pix_intent_id", externalReference)
            .eq("status", "active");
        }

        if (localStatus === "paid") {
          const { serviceId } = await materializeFixedBookingFromIntent(
            admin,
            pendingFixedIntent,
          );
          await admin.from("payment_transaction_logs").insert({
            trace_id: traceId,
            trip_id: externalReference,
            provider: "mercado_pago",
            channel: "webhook",
            event: "fixed_booking_pix_intent_paid_materialized",
            status: "ok",
            payload: {
              external_payment_id: dataId,
              created_service_id: serviceId,
            },
          });
        }

        return json({ received: true, trace_id: traceId });
      }

      if (localStatus === "paid") {
        let isService = false;
        let trip: any = null;

        let tripData: any = null;
        if (TRIP_RUNTIME_ENABLED) {
          const tripLookup = await admin
            .from("trips")
            .select("status, client_id, driver_id, fare_final")
            .eq("id", externalReference)
            .maybeSingle();
          tripData = tripLookup.data;
        }

        if (tripData) {
          trip = tripData;
        } else {
          const { data: srvData } = await admin
            .from("service_requests")
            .select("status, client_id, provider_id, price_upfront")
            .eq("id", externalReference)
            .maybeSingle();

          if (srvData) {
            isService = true;
            trip = {
              status: srvData.status,
              client_id: srvData.client_id,
              driver_id: srvData.provider_id,
              fare_final: srvData.price_upfront,
            };
          } else {
            // Fallback final: agendamento_servico
            const { data: agendamento } = await admin
              .from("agendamento_servico")
              .select(
                "status, cliente_uid, prestador_uid, preco_total, valor_entrada",
              )
              .eq("id", externalReference)
              .maybeSingle();

            if (agendamento) {
              isService = true;
              trip = {
                status: agendamento.status,
                client_id: agendamento.cliente_uid,
                driver_id: agendamento.prestador_uid,
                fare_final: agendamento.valor_entrada,
                _is_agendamento: true,
              };
            }
          }
        }

        // --- DEPÓSITO REEMBOLSÁVEL (ENTRADA) PARA CLIENTE ---
        // Só credita entrada quando for payment_stage=deposit e NÃO for agendamento 101.
        if (
          trip?.client_id && paymentStage !== "remaining" &&
          !trip?._is_agendamento
        ) {
          const { data: existingDeposit } = await admin
            .from("wallet_transactions")
            .select("id")
            .eq("user_id", trip.client_id)
            .eq("service_id", externalReference)
            .eq("type", "credit")
            .contains("metadata", {
              kind: "deposit_entry",
              external_payment_id: dataId,
            })
            .limit(1)
            .maybeSingle();

          if (existingDeposit?.id) {
            // Idempotência: webhook pode chegar mais de uma vez.
            // Se já creditou a entrada, não repetir.
          } else {
            const { data: payRow } = await admin
              .from("payments")
              .select("amount, mp_payment_id")
              .eq("external_payment_id", dataId)
              .maybeSingle();

            const depositAmount = round2(
              Number(payRow?.amount ?? mpPayment?.transaction_amount ?? 0),
            );
            if (depositAmount > 0) {
              const { data: userRow } = await admin
                .from("users")
                .select("id, wallet_balance")
                .eq("id", trip.client_id)
                .maybeSingle();

              const currentClientBal = round2(
                Number(userRow?.wallet_balance ?? 0),
              );
              const nextClientBal = round2(currentClientBal + depositAmount);

              await admin
                .from("users")
                .update({ wallet_balance: nextClientBal })
                .eq("id", trip.client_id);

              await admin.from("wallet_transactions").insert({
                user_id: trip.client_id,
                service_id: externalReference,
                amount: depositAmount,
                type: "credit",
                description: `Entrada reembolsável: Serviço #${
                  externalReference.slice(0, 8)
                }`,
                metadata: {
                  kind: "deposit_entry",
                  provider: "mercado_pago",
                  mp_payment_id: payRow?.mp_payment_id ?? dataId,
                  external_payment_id: dataId,
                },
              });
            }
          }
        }

        if (!isService) {
          if (!TRIP_RUNTIME_ENABLED) {
            await admin.from("payment_transaction_logs").insert({
              trace_id: traceId,
              trip_id: externalReference,
              provider: "mercado_pago",
              channel: "webhook",
              event: "trip_runtime_disabled_skip",
              status: "skipped",
              payload: { external_payment_id: dataId },
            });
            return json({ received: true, skipped: true, trace_id: traceId });
          }

          const updateData: any = { payment_status: "paid" };
          if (trip?.status === "pending_payment") {
            updateData.status = "searching";
            console.log(
              `🚀 [Webhook] Viagem ${externalReference} paga! Mudando status para 'searching'.`,
            );
          }
          await admin.from("trips").update(updateData).eq(
            "id",
            externalReference,
          );
        } else if (trip?._is_agendamento) {
          console.log(
            `🗓️ [Webhook] Agendamento 101 ${externalReference} taxa paga → confirmed.`,
          );
          await admin
            .from("agendamento_servico")
            .update({
              status: "confirmed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", externalReference);

          // Registrar pagamento na tabela genérica para histórico
          await admin.from("payment_transaction_logs").insert({
            trace_id: traceId,
            trip_id: externalReference,
            provider: "mercado_pago",
            channel: "webhook",
            event: "agendamento_paid_confirmed",
            status: "ok",
            payload: { external_payment_id: dataId },
          });

          return json({ received: true, trace_id: traceId });
        } else {
          const { data: srvRow } = await admin
            .from("service_requests")
            .select(
              "id, provider_id, dispatch_started_at, status, location_type, scheduled_at",
            )
            .eq("id", externalReference)
            .maybeSingle();

          const hasSelectedProvider = Boolean(srvRow?.provider_id);
          const isFixedBooking =
            clean(srvRow?.location_type).toLowerCase() === "provider" ||
            Boolean(srvRow?.scheduled_at);

          if (paymentStage === "remaining") {
            // PIX dos 70%: confirmar restante e liberar execução.
            console.log(
              `🚀 [Webhook] Serviço 101 ${externalReference} restante(70%) pago → in_progress.`,
            );
            await admin
              .from("service_requests")
              .update({
                payment_remaining_status: "paid",
                status: "in_progress",
                status_updated_at: new Date().toISOString(),
              })
              .eq("id", externalReference);
          } else if (isFixedBooking) {
            console.log(
              `🗓️ [Webhook] Serviço fixo ${externalReference} entrada paga → scheduled (sem dispatch).`,
            );
            await admin
              .from("service_requests")
              .update({
                status: "scheduled",
                payment_status: "paid",
                status_updated_at: new Date().toISOString(),
              })
              .eq("id", externalReference);
            await admin
              .from("appointments")
              .update({ status: "confirmed" })
              .eq("service_request_id", externalReference);
          } else if (hasSelectedProvider) {
            console.log(
              `🚀 [Webhook] Serviço 101 ${externalReference} entrada paga! Prestador definido → accepted.`,
            );
            await admin
              .from("service_requests")
              .update({ status: "accepted", payment_status: "paid" })
              .eq("id", externalReference);
            await admin
              .from("appointments")
              .update({ status: "confirmed" })
              .eq("service_request_id", externalReference);
          } else {
            console.log(
              `🚀 [Webhook] Serviço 101 ${externalReference} entrada paga! Sem prestador → searching + dispatch.`,
            );
            await admin
              .from("service_requests")
              .update({ status: "searching", payment_status: "paid" })
              .eq("id", externalReference);
          }

          // Se não existe prestador escolhido, inicia dispatch para notificar prestadores próximos.
          // A confirmação do Mercado Pago (approved) é o gatilho.
          const shouldDispatch = paymentStage !== "remaining" &&
            !isFixedBooking &&
            Boolean(
              srvRow && !srvRow.provider_id && !srvRow.dispatch_started_at,
            );
          if (shouldDispatch) {
            const baseUrl = Deno.env.get("PROJECT_URL") ??
              Deno.env.get("SUPABASE_URL");
            const serviceKey = Deno.env.get("PROJECT_SERVICE_KEY") ??
              Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
            if (baseUrl && serviceKey) {
              const dispatchUrl = `${baseUrl}/functions/v1/dispatch`;
              try {
                await fetch(dispatchUrl, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${serviceKey}`,
                    apikey: serviceKey,
                    "x-trace-id": traceId,
                  },
                  body: JSON.stringify({
                    serviceId: externalReference,
                    action: "start_dispatch",
                  }),
                });
                await admin.from("payment_transaction_logs").insert({
                  trace_id: traceId,
                  trip_id: externalReference,
                  provider: "mercado_pago",
                  channel: "webhook",
                  event: "dispatch_started_after_deposit_paid",
                  status: "ok",
                  payload: {
                    service_id: externalReference,
                    mp_payment_id: dataId,
                  },
                });
              } catch (e) {
                await admin.from("payment_transaction_logs").insert({
                  trace_id: traceId,
                  trip_id: externalReference,
                  provider: "mercado_pago",
                  channel: "webhook",
                  event: "dispatch_start_failed_after_deposit_paid",
                  status: "error",
                  payload: {
                    service_id: externalReference,
                    mp_payment_id: dataId,
                    error: String(e),
                  },
                });
              }
            }
          }
        }

        // --- LÓGICA DE SALDO (CARTEIRA) ---
        // Para agendamentos 101, o valor é taxa da plataforma, não credita ao prestador.
        if (trip?.driver_id && !trip?._is_agendamento) {
          // 1. Buscar detalhes do pagamento para saber a comissão
          const { data: payment } = await admin
            .from("payments")
            .select("amount, commission_amount")
            .eq("external_payment_id", dataId)
            .maybeSingle();

          if (payment) {
            const totalAmount = Number(payment.amount || trip.fare_final || 0);
            const commission = Number(payment.commission_amount || 0);
            const driverNet = Number((totalAmount - commission).toFixed(2));

            console.log(
              `💰 [Webhook] Processando Saldo: Total=${totalAmount}, Comis=${commission}, Líquido=${driverNet}`,
            );

            // 2. Creditar Motorista (Saldo Real)
            const { data: provider } = await admin
              .from("providers")
              .select("wallet_balance, user_id")
              .eq("user_id", trip.driver_id)
              .maybeSingle();

            const currentBalance = Number(provider?.wallet_balance || 0);

            // Se houver application_fee no mp_response, significa que o MP já fez o split.
            // O motorista já recebeu na conta MP dele. O saldo virtual no app
            // não deve ser incrementado, apenas o histórico registrado.
            const hasMpSplit = Boolean(mpPayment?.application_fee);
            const newBalance = hasMpSplit
              ? currentBalance
              : Number((currentBalance + driverNet).toFixed(2));

            await admin.from("providers").update({
              wallet_balance: newBalance,
            }).eq("user_id", trip.driver_id);

            // Mantém uma tabela dedicada de saldo (não depende de trips).
            await admin.from("driver_balances").upsert({
              user_id: trip.driver_id,
              wallet_balance: newBalance,
              updated_at: new Date().toISOString(),
            });

            // 3. Registrar Transações (Extrato)
            await admin.from("wallet_transactions").insert([
              {
                user_id: trip.driver_id,
                amount: driverNet,
                type: "credit",
                description: `Recebimento: Viagem #${
                  externalReference.slice(0, 8)
                }${hasMpSplit ? " (Direto na Carteira MP)" : ""}`,
                service_id: externalReference,
                metadata: { mp_split: hasMpSplit, mp_payment_id: dataId },
              },
              {
                user_id: trip.client_id,
                amount: -totalAmount,
                type: "debit",
                description: `Pagamento: Viagem #${
                  externalReference.slice(0, 8)
                }`,
                service_id: externalReference,
              },
            ]);

            console.log(
              `✅ [Webhook] Carteira atualizada para motorista ${trip.driver_id}`,
            );
          }
        }
      } else if (localStatus === "cancelled") {
        // Fallback service
        let tripCheck: any = null;
        if (TRIP_RUNTIME_ENABLED) {
          const tripCheckResp = await admin.from("trips").select("id").eq(
            "id",
            externalReference,
          ).maybeSingle();
          tripCheck = tripCheckResp.data;
        }
        if (tripCheck) {
          await admin.from("trips").update({ payment_status: "failed" }).eq(
            "id",
            externalReference,
          );
        } else {
          await admin
            .from("service_requests")
            .update({ status: "cancelled", payment_status: "failed" })
            .eq("id", externalReference);
          await admin
            .from("appointments")
            .update({ status: "cancelled" })
            .eq("service_request_id", externalReference);
        }
      }
    }

    await admin.from("payment_transaction_logs").insert({
      trace_id: traceId,
      trip_id: externalReference || null,
      provider: "mercado_pago",
      channel: "webhook",
      event: "webhook_payment_update",
      status: clean(mpPayment?.status).toLowerCase(),
      billing_type: billingType,
      amount: Number(mpPayment?.transaction_amount ?? 0),
      payload: {
        external_payment_id: dataId,
        webhook_type: eventType,
      },
    });

    return json({ received: true, trace_id: traceId });
  } catch (error: any) {
    return json({
      error: error?.message ?? "Falha no webhook Mercado Pago",
      trace_id: traceId,
    }, 500);
  }
});
