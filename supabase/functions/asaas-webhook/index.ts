import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, json, supabaseAdmin } from "../_shared/auth.ts";

function getWebhookToken(req: Request) {
  return (
    req.headers.get("asaas-access-token") ||
    req.headers.get("asaas-token") ||
    req.headers.get("authorization") ||
    ""
  ).trim();
}

function normalizePaymentStatus(asaasStatus: string) {
  const status = asaasStatus.toLowerCase();
  if (status === "received" || status === "paid") {
    return "paid";
  }
  if (status === "confirmed") {
    return "pending_settlement";
  }
  if (
    status === "canceled" ||
    status === "cancelled" ||
    status === "overdue" ||
    status === "refunded" ||
    status === "deleted"
  ) {
    return "cancelled";
  }
  return "pending";
}

function pickEstimatedCreditDate(payment: any): string | null {
  const raw =
    payment?.estimatedCreditDate ??
    payment?.creditDate ??
    payment?.estimatedCreditDateCustomer ??
    null;
  if (!raw) return null;
  const value = String(raw).trim();
  return value.length > 0 ? value : null;
}

function monitor(step: string, details: Record<string, unknown> = {}) {
  console.log(`📡 [CardMonitorWebhook] ${JSON.stringify({ step, ...details })}`);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  if (expectedToken) {
    const incoming = getWebhookToken(req);
    if (!incoming || incoming !== expectedToken) {
      console.warn("[asaas-webhook] Webhook token inválido ou ausente");
      return json({ error: "Webhook token inválido" }, 401);
    }
  }

  let payload: any;
  try {
    const raw = await req.text();
    payload = raw ? JSON.parse(raw) : {};
  } catch (e) {
    return json({ error: "Payload inválido" }, 400);
  }

  const event = payload.event ?? payload.type ?? "UNKNOWN";
  console.log(`[asaas-webhook] Novo evento recebido: ${event}`);
  monitor("webhook_received", { event });

  const admin = supabaseAdmin();
  const logDb = async (
    event: string,
    details: Record<string, unknown> = {},
    opts: {
      tripId?: string | null;
      paymentId?: number | null;
      asaasPaymentId?: string | null;
      status?: string | null;
      billingType?: string | null;
      amount?: number | null;
      traceId?: string | null;
    } = {},
  ) => {
    try {
      await admin.from("payment_transaction_logs").insert({
        trace_id: opts.traceId ?? null,
        trip_id: opts.tripId ?? null,
        payment_id: opts.paymentId ?? null,
        asaas_payment_id: opts.asaasPaymentId ?? null,
        provider: "asaas",
        channel: "webhook",
        event,
        status: opts.status ?? null,
        billing_type: opts.billingType ?? null,
        amount: opts.amount ?? null,
        payload: details,
      });
    } catch (e) {
      console.warn("[asaas-webhook] Falha ao persistir payment_transaction_logs:", e);
    }
  };

  try {
    // 1. Eventos de PAGAMENTO
    if (event.startsWith("PAYMENT_")) {
      const payment = payload.payment ?? payload;
      const paymentId = payment?.id?.toString();
      const externalReference = payment?.externalReference?.toString();
      const asaasStatus = payment?.status?.toString()?.toLowerCase() ?? "unknown";
      const billingType = payment?.billingType?.toString()?.toUpperCase() ?? "";
      const isCreditCard = billingType === "CREDIT_CARD";
      const normalizedStatus = normalizePaymentStatus(asaasStatus);
      const isRidePaymentConfirmed =
        asaasStatus === "confirmed" || asaasStatus === "received" || asaasStatus === "paid";
      const isSettlementReady = isCreditCard
        ? asaasStatus === "received" || asaasStatus === "paid"
        : isRidePaymentConfirmed;
      const estimatedCreditDate = pickEstimatedCreditDate(payment);

      console.log(
        `[asaas-webhook] [PAYMENT] id=${paymentId} extRef=${externalReference} asaasStatus=${asaasStatus} status=${normalizedStatus}`,
      );
      monitor("payment_event_parsed", {
        event,
        payment_id: paymentId ?? null,
        trip_reference: externalReference ?? null,
        asaas_status: asaasStatus,
        normalized_status: normalizedStatus,
        billing_type: billingType || null,
        estimated_credit_date: estimatedCreditDate,
      });
      await logDb("webhook_payment_event_parsed", {
        event,
        payment_id: paymentId ?? null,
        trip_reference: externalReference ?? null,
        asaas_status: asaasStatus,
        normalized_status: normalizedStatus,
        billing_type: billingType || null,
        estimated_credit_date: estimatedCreditDate,
      }, {
        tripId: externalReference ?? null,
        asaasPaymentId: paymentId ?? null,
        status: normalizedStatus,
        billingType: billingType || null,
      });

      let paymentRow: {
        id: number;
        status: string | null;
        trip_id: string | null;
        mission_id: string | null;
        amount: number | null;
        commission_amount: number | null;
      } | null = null;

      if (paymentId) {
        const { data } = await admin
          .from("payments")
          .select("id, status, trip_id, mission_id, amount, commission_amount")
          .eq("asaas_payment_id", paymentId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        paymentRow = data;
      }

      if (!paymentRow && externalReference) {
        const { data } = await admin
          .from("payments")
          .select("id, status, trip_id, mission_id, amount, commission_amount")
          .eq("trip_id", externalReference)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        paymentRow = data;
      }

      if (!paymentRow && externalReference) {
        const { data } = await admin
          .from("payments")
          .select("id, status, trip_id, mission_id, amount, commission_amount")
          .eq("mission_id", externalReference)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        paymentRow = data;
      }

      if (paymentRow?.id) {
        monitor("payment_row_found", {
          payment_row_id: paymentRow.id,
          payment_id: paymentId ?? null,
          trip_id: paymentRow.trip_id ?? null,
        });
        await admin
          .from("payments")
          .update({
            status: normalizedStatus,
            ...(paymentId ? { asaas_payment_id: paymentId } : {}),
            asaas_status: asaasStatus,
            settlement_status:
              normalizedStatus === "paid"
                ? "settled"
                : normalizedStatus === "pending_settlement"
                ? "pending_settlement"
                : normalizedStatus,
            billing_type: billingType || null,
            estimated_credit_date: estimatedCreditDate,
            ...(asaasStatus === "received" || asaasStatus === "paid"
              ? { received_at: new Date().toISOString() }
              : {}),
          })
          .eq("id", paymentRow.id);
        await logDb("webhook_payment_row_updated", {
          payment_row_id: paymentRow.id,
          payment_id: paymentId ?? null,
          trip_id: paymentRow.trip_id ?? externalReference ?? null,
          asaas_status: asaasStatus,
          normalized_status: normalizedStatus,
        }, {
          tripId: paymentRow.trip_id ?? externalReference ?? null,
          paymentId: paymentRow.id,
          asaasPaymentId: paymentId ?? null,
          status: normalizedStatus,
          billingType: billingType || null,
          amount: Number(paymentRow.amount ?? payment?.value ?? 0),
        });
      } else {
        console.warn("[asaas-webhook] Pagamento local não encontrado para atualização");
        monitor("payment_row_not_found", {
          payment_id: paymentId ?? null,
          external_reference: externalReference ?? null,
        });
      }

      const tripId = paymentRow?.trip_id ?? externalReference;
      const wasPaid = paymentRow?.status === "paid";

      if (isRidePaymentConfirmed && tripId) {
        monitor("trip_mark_paid_start", { trip_id: tripId, payment_id: paymentId ?? null });
        const { data: tripSnapshot } = await admin
          .from("trips")
          .select("id, status, driver_id, fare_final, fare_estimated")
          .eq("id", tripId)
          .maybeSingle();

        await admin.from("trips")
          .update({
            status: tripSnapshot?.status ?? "in_progress",
            payment_status: "paid",
          })
          .eq("id", tripId);

        // Evita duplicidade de comissão em retries de webhook.
        if (isSettlementReady && !wasPaid) {
          const commissionAmount = Number(paymentRow?.commission_amount ?? 0);
          const driverId = tripSnapshot?.driver_id;

          if (driverId) {
            if (commissionAmount > 0) {
              const { data: summary } = await admin
                .from("driver_commission_summary")
                .select("total_commission_paid")
                .eq("user_id", driverId as any)
                .maybeSingle();
              const totalPaid = Number(summary?.total_commission_paid ?? 0);
              const newTotal = Number((totalPaid + commissionAmount).toFixed(2));
              await admin.from("driver_commission_summary").upsert({
                user_id: driverId,
                total_commission_paid: newTotal,
                updated_at: new Date().toISOString(),
              });
            }

            // Credita saldo líquido do motorista em providers.wallet_balance.
            const totalAmount = Number(
              paymentRow?.amount ??
                payment?.value ??
                tripSnapshot?.fare_final ??
                tripSnapshot?.fare_estimated ??
                0,
            );
            const netAmount = Number((Math.max(0, totalAmount - commissionAmount)).toFixed(2));

            if (netAmount > 0) {
              const { data: providerRow, error: providerRowError } = await admin
                .from("providers")
                .select("user_id, wallet_balance")
                .eq("user_id", driverId as any)
                .maybeSingle();

              if (providerRowError) {
                console.error("[asaas-webhook] Erro ao buscar providers.wallet_balance:", providerRowError.message);
              } else if (providerRow) {
                const currentBalance = Number(providerRow.wallet_balance ?? 0);
                const newBalance = Number((currentBalance + netAmount).toFixed(2));
                const { error: balanceUpdateError } = await admin
                  .from("providers")
                  .update({ wallet_balance: newBalance })
                  .eq("user_id", driverId as any);
                if (balanceUpdateError) {
                  console.error("[asaas-webhook] Erro ao creditar saldo do motorista:", balanceUpdateError.message);
                } else {
                  console.log(`[asaas-webhook] Saldo creditado para motorista ${driverId}: +${netAmount}`);
                  await logDb("webhook_driver_balance_credited", {
                    driver_id: driverId,
                    trip_id: tripId,
                    net_amount: netAmount,
                    commission_amount: commissionAmount,
                  }, {
                    tripId,
                    paymentId: paymentRow?.id ?? null,
                    asaasPaymentId: paymentId ?? null,
                    status: "paid",
                    billingType: billingType || null,
                    amount: netAmount,
                  });
                  monitor("driver_balance_credited", {
                    trip_id: tripId,
                    driver_id: driverId,
                    net_amount: netAmount,
                  });
                }
              } else {
                const { error: providerCreateError } = await admin
                  .from("providers")
                  .insert({
                    user_id: driverId,
                    wallet_balance: netAmount,
                    is_online: false,
                  });
                if (providerCreateError) {
                  console.error("[asaas-webhook] Erro ao criar providers para motorista:", providerCreateError.message);
                } else {
                  console.log(`[asaas-webhook] Providers criado e saldo inicial creditado para motorista ${driverId}: ${netAmount}`);
                  monitor("driver_provider_created_and_credited", {
                    trip_id: tripId,
                    driver_id: driverId,
                    net_amount: netAmount,
                  });
                }
              }
            }
          }
        }
      }
    } 
    
    // 2. Eventos de CONTA (KYC/Onboarding)
    else if (event === "ACCOUNT_STATUS_UPDATED") {
      const account = payload.account ?? {};
      const walletId = account.id?.toString();
      const asaasStatus = account.status?.toString(); // APPROVED, AWAITING_APPROVAL, etc

      console.log(`[asaas-webhook] [ACCOUNT] walletId=${walletId} status=${asaasStatus}`);

      if (walletId) {
        const mappedStatus = asaasStatus === "APPROVED" ? "active" : 
                            (asaasStatus === "REJECTED" ? "blocked" : "pending");

        // Atualizar usuários que possuam este wallet_id
        await admin.from("users")
          .update({ asaas_status: mappedStatus })
          .eq("asaas_wallet_id", walletId);
      }
    }

    // 3. Eventos de TRANSFERÊNCIA (Saques/Payouts)
    else if (event.startsWith("TRANSFER_")) {
      const transfer = payload.transfer ?? payload;
      const transferId = transfer?.id?.toString();
      const status = transfer?.status?.toString()?.toLowerCase() ?? "unknown";
      
      console.log(`[asaas-webhook] [TRANSFER] id=${transferId} status=${status}`);
      // Lógica de atualização de saques se houver tabela específica
    }

  } catch (e) {
    console.error("[asaas-webhook] Erro crítico ao processar webhook:", e);
    monitor("webhook_processing_error", {
      event,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  return json({ ok: true });
});
