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

  // Accept explicit IDs already used by the app/backend
  if (raw === "cash" || raw === "dinheiro") return "cash";
  if (raw === "pix_direct" || raw === "pix-direto" || raw === "pix direto") return "pix_direct";
  if (raw.startsWith("card_machine")) return raw; // e.g. card_machine_physical/digital
  if (raw === "card_machine" || raw === "maquina" || raw === "máquina") return "card_machine";

  // Heuristics for legacy / UI labels
  if (raw.includes("pix") && raw.includes("direct")) return "pix_direct";
  if (raw.includes("pix") && raw.includes("direto")) return "pix_direct";
  if (raw.includes("machine") || raw.includes("maquina") || raw.includes("máquina")) return "card_machine";
  if (raw.includes("cash") || raw.includes("dinheiro")) return "cash";

  // Default safe fallback for manual confirmation
  return "cash";
}

function edgeError(params: {
  error: string;
  step: string;
  reason_code: string;
  trace_id: string;
  status_code?: number;
  details?: Record<string, unknown>;
}) {
  return json(
    {
      success: false,
      error: params.error,
      step: params.step,
      reason_code: params.reason_code,
      trace_id: params.trace_id,
      status_code: params.status_code ?? 400,
      ...(params.details != null ? { details: params.details } : {}),
    },
    params.status_code ?? 400,
  );
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let traceId = asString(req.headers.get("x-trace-id") || crypto.randomUUID());

  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;

    const { admin, appUser } = auth;
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    const ASAAS_URL = Deno.env.get("ASAAS_URL") || "https://sandbox.asaas.com/api/v3";

    const body = await req.json();
    traceId = asString(body?.trace_id || traceId);
    const trip_id = body?.trip_id?.toString();
    const manualPaymentMethodId = normalizeManualPaymentMethodId(
      body?.manual_payment_method_id ?? body?.manual_payment_method ?? body?.payment_method_id,
    );
    if (!TRIP_RUNTIME_ENABLED) {
      return edgeError({
        error: "Fluxo de corrida desativado neste ambiente",
        step: "trip_runtime_guard",
        reason_code: "TRIP_RUNTIME_DISABLED",
        trace_id: traceId,
        status_code: 410,
      });
    }
    if (!trip_id) {
      return edgeError({
        error: "trip_id é obrigatório",
        step: "validate_input",
        reason_code: "MISSING_TRIP_ID",
        trace_id: traceId,
        status_code: 400,
      });
    }

    const monitorDb = async (
      event: string,
      details: Record<string, unknown> = {},
      opts: {
        paymentId?: number | null;
      } = {},
    ) => {
      console.log(
        `🧾 [CashConfirm] ${JSON.stringify({
          trace_id: traceId,
          event,
          trip_id,
          ...details,
        })}`,
      );
      try {
        await admin.from("payment_transaction_logs").insert({
          trace_id: traceId,
          trip_id: trip_id ?? null,
          payment_id: opts.paymentId ?? null,
          provider: "asaas",
          channel: "edge",
          event,
          billing_type: "CASH",
          payload: details,
        });
      } catch (_) {
        // Não bloquear confirmação de dinheiro por falha de log
      }
    };
    await monitorDb("cash_confirm_request_received", {
      caller_user_id: appUser?.id ?? null,
      caller_role: appUser?.role ?? null,
      manual_payment_method_id: manualPaymentMethodId,
    });

    // Buscar trip
    const { data: trip, error: tripError } = await admin
      .from("trips")
      .select("id, driver_id, client_id, status, payment_status, fare_estimated, fare_final, pending_fees_included")
      .eq("id", trip_id)
      .single();

    if (tripError || !trip) {
      await monitorDb("cash_confirm_trip_not_found", {
        db_error: tripError?.message ?? null,
      });
      return edgeError({
        error: "Viagem não encontrada",
        step: "load_trip",
        reason_code: "TRIP_NOT_FOUND",
        trace_id: traceId,
        status_code: 404,
      });
    }

    // Somente motorista da corrida ou service_role pode confirmar
    const isServiceRole = appUser?.role === "service_role";
    if (!isServiceRole && trip.driver_id?.toString() !== appUser?.id?.toString()) {
      await monitorDb("cash_confirm_auth_denied", {
        trip_driver_id: trip.driver_id ?? null,
        caller_user_id: appUser?.id ?? null,
      });
      return edgeError({
        error: "Sem permissão para confirmar pagamento",
        step: "authorize_trip_access",
        reason_code: "AUTHZ_DENIED",
        trace_id: traceId,
        status_code: 403,
      });
    }
    await monitorDb("cash_confirm_auth_ok", {
      trip_driver_id: trip.driver_id ?? null,
      caller_user_id: appUser?.id ?? null,
    });

    // Idempotência: se já confirmado, não duplica cobrança/lançamentos
    if (trip.payment_status === "paid") {
      await monitorDb("cash_confirm_already_paid_idempotent");
      return json({
        success: true,
        message: "Pagamento já confirmado",
        step: "idempotent_paid",
        reason_code: "ALREADY_PAID",
        trace_id: traceId,
      });
    }

    // Buscar último pagamento
    const { data: payment } = await admin
      .from("payments")
      .select("id, asaas_payment_id, status, amount, commission_amount, commission_rate")
      .eq("trip_id", trip_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Cancelar cobrança no Asaas, se existir
    if (payment?.asaas_payment_id && ASAAS_API_KEY) {
      try {
        await fetch(`${ASAAS_URL}/payments/${payment.asaas_payment_id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "access_token": ASAAS_API_KEY,
          },
          body: JSON.stringify({ status: "CANCELLED" }),
        });
      } catch (_) {
        // Não bloqueia fluxo se a API falhar
      }
    }

    // Atualizar pagamento como cancelado e método cash
    if (payment?.id) {
      await admin.from("payments").update({
        status: "cancelled",
        payment_method_id: manualPaymentMethodId,
      }).eq("id", payment.id);
    }

    // Marcar trip como paga (pagamento manual)
    await admin.from("trips")
      .update({
        status: trip.status,
        payment_status: "paid",
        payment_method_id: manualPaymentMethodId,
      })
      .eq("id", trip_id);

    // Calcular comissão dinâmica (mesma regra da uber_config)
    const totalAmount = trip.fare_final ?? trip.fare_estimated ?? 0;
    let commissionRate = 0.15;
    let commissionCapEnabled = false;
    let commissionCapAmount = 0;

    // Buscar configuração global
    const { data: cfg } = await admin
      .from("uber_config")
      .select("commission_rate, commission_cap_enabled, commission_cap_amount")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cfg?.commission_rate != null) commissionRate = Number(cfg.commission_rate);
    if (cfg?.commission_cap_enabled != null) commissionCapEnabled = cfg.commission_cap_enabled === true;
    if (cfg?.commission_cap_amount != null) commissionCapAmount = Number(cfg.commission_cap_amount);

    // Buscar taxas específicas do motorista (prioridade)
    let driverPaymentMode = "platform";
    let driverDailyFeeAmount = 0;
    if (trip.driver_id) {
      const { data: driverUser } = await admin
        .from("users")
        .select("driver_platform_tx_fee_rate, driver_payment_mode, driver_daily_fee_amount")
        .eq("id", trip.driver_id)
        .maybeSingle();

      driverPaymentMode = (driverUser?.driver_payment_mode ?? "platform")
        .toString()
        .trim()
        .toLowerCase();
      driverDailyFeeAmount = Number(driverUser?.driver_daily_fee_amount ?? 0);

      if (driverPaymentMode === "fixed") {
        // Taxa diária: não cobra % por corrida (cobramos R$ X / dia, 1x).
        commissionRate = 0;
        await monitorDb("driver_fixed_mode_detected", {
          driver_payment_mode: driverPaymentMode,
          driver_daily_fee_amount: driverDailyFeeAmount,
        });
      } else if (driverPaymentMode === "direct") {
        // Direct drivers operam sem taxa de plataforma.
        commissionRate = 0;
        await monitorDb("driver_direct_mode_detected", {
          driver_payment_mode: driverPaymentMode,
        });
      } else if (driverPaymentMode === "platform") {
        // Sistema simplificado: apenas 2 modos.
        // Modo COMISSÃO: 5% para PIX/dinheiro, 10% para cartão na máquina.
        const isCardMachine = manualPaymentMethodId.startsWith("card_machine");
        commissionRate = isCardMachine ? 0.10 : 0.05;
        await monitorDb("using_simplified_commission_rate", {
          rate: commissionRate,
          method: manualPaymentMethodId,
        });
      }
    }

    // --- LIQUIDAÇÃO DE MULTAS (Dinheiro) ---
    let feeTotal = 0;
    const feeIds = trip.pending_fees_included;
    if (Array.isArray(feeIds) && feeIds.length > 0) {
      await monitorDb("cash_fees_detection", { fee_ids: feeIds });
      for (const feeId of feeIds) {
        const { data: fee } = await admin
          .from("trip_cancellation_fees")
          .select("victim_driver_id, amount")
          .eq("id", feeId)
          .eq("status", "pending")
          .maybeSingle();

        if (fee) {
          feeTotal = round2(feeTotal + Number(fee.amount));
          // 1. Marcar multa como paga
          await admin.from("trip_cancellation_fees").update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            new_trip_id: trip_id
          }).eq("id", feeId);

          // 2. Creditar o motorista VÍTIMA (Platform Credit)
          await admin.from("payments").insert({
            user_id: fee.victim_driver_id,
            trip_id: trip_id,
            amount: fee.amount,
            status: 'paid',
            payment_method_id: 'CANCELLATION_CREDIT',
            provider: 'platform',
            billing_type: 'CREDIT',
            payout_status: 'pending'
          });
          console.log(`✅ [Cash-Process] Multa de R$ ${fee.amount} creditada ao motorista ${fee.victim_driver_id}`);
        }
      }
    }

    let commissionDue = round2(Number(totalAmount) * commissionRate);
    // IMPORTANTE: Se o motorista recebeu multa em dinheiro, ele deve esse valor integral à plataforma para repasse
    if (feeTotal > 0) {
      commissionDue = round2(commissionDue + feeTotal);
      await monitorDb("cash_commission_adjusted_with_fees", { 
        base_commission: round2(Number(totalAmount) * commissionRate),
        fees_collected: feeTotal,
        total_due: commissionDue
      });
    }
    if (driverPaymentMode === "fixed") {
      // Cobrança 1x por dia (R$ driverDailyFeeAmount).
      const fee = round2(driverDailyFeeAmount || 10);
      commissionDue = 0;
      if (Number.isFinite(fee) && fee > 0 && trip.driver_id) {
        const now = new Date();
        const startOfDayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
        const { data: already } = await admin
          .from("wallet_transactions")
          .select("id,created_at")
          .eq("user_id", trip.driver_id)
          .eq("type", "daily_fee")
          .gte("created_at", startOfDayUtc.toISOString())
          .order("created_at", { ascending: false })
          .limit(1);

        if ((already ?? []).length === 0) {
          commissionDue = fee;
          await monitorDb("daily_fee_due_today", { fee });
          // Registra no extrato como débito (dívida) da taxa diária.
          try {
            await admin.from("wallet_transactions").insert({
              user_id: trip.driver_id,
              amount: -Math.abs(fee),
              type: "daily_fee",
              description: `[DAILY_FEE] Taxa diária do motorista`,
              metadata: {
                source: "confirm-cash-payment",
                day_utc: startOfDayUtc.toISOString().slice(0, 10),
              },
              created_at: new Date().toISOString(),
            });
          } catch (_) {
            // ignore
          }
        } else {
          await monitorDb("daily_fee_already_charged_today", { fee });
        }
      }
    }

    if (commissionCapEnabled && commissionCapAmount > 0 && trip.driver_id && driverPaymentMode === "platform") {
      const { data: summary } = await admin
        .from("driver_commission_summary")
        .select("total_commission_paid, total_commission_due")
        .eq("user_id", trip.driver_id)
        .maybeSingle();
      const totalPaid = Number(summary?.total_commission_paid ?? 0);
      if (totalPaid >= commissionCapAmount) {
        commissionDue = 0;
        commissionRate = 0;
      } else if (totalPaid + commissionDue > commissionCapAmount) {
        commissionDue = round2(commissionCapAmount - totalPaid);
        commissionRate = totalAmount > 0 ? Number((commissionDue / Number(totalAmount)).toFixed(4)) : 0;
      }
    }

    let deductedFromBalance = 0;
    let commissionStillDue = commissionDue;
    let resultingBalance: number | null = null;
    let cashInHandAfter: number | null = null;

    // Registrar "recebido em mãos" (dinheiro / pix direto / máquina) no extrato.
    // Importante: isso não depende de trips (trip_id será SET NULL se a trip for deletada).
    if (trip.driver_id) {
      try {
        const cashAmount = round2(Number(totalAmount));
        if (cashAmount > 0) {
          await admin.from("wallet_transactions").insert({
            user_id: trip.driver_id,
            amount: Math.abs(cashAmount),
            type: "cash_in_hand",
            trip_id: trip_id,
            description: `[MANUAL:${trip_id}] Recebido em mãos (${manualPaymentMethodId})`,
            metadata: {
              manual_payment_method_id: manualPaymentMethodId,
              source: "confirm-cash-payment",
            },
            created_at: new Date().toISOString(),
          });

          // Atualiza tabela dedicada do saldo do motorista (cash_in_hand_balance).
          const { data: balRow } = await admin
            .from("driver_balances")
            .select("cash_in_hand_balance,wallet_balance,total_debt_platform")
            .eq("user_id", trip.driver_id)
            .maybeSingle();
          const currentCash = round2(Number(balRow?.cash_in_hand_balance ?? 0));
          cashInHandAfter = round2(currentCash + cashAmount);
          await admin.from("driver_balances").upsert({
            user_id: trip.driver_id,
            cash_in_hand_balance: cashInHandAfter,
            // mantém wallet_balance/debt se já houver (não sobrescrever por null)
            wallet_balance: balRow?.wallet_balance ?? undefined,
            total_debt_platform: balRow?.total_debt_platform ?? undefined,
            updated_at: new Date().toISOString(),
          });
          await monitorDb("cash_in_hand_ledger_recorded", {
            amount: cashAmount,
            cash_in_hand_after: cashInHandAfter,
            manual_payment_method_id: manualPaymentMethodId,
          });
        }
      } catch (e: any) {
        // Não bloquear confirmação por falha de extrato/saldo dedicado.
        await monitorDb("cash_in_hand_ledger_failed", {
          error: e?.message ?? String(e),
        });
      }
    }

    if (trip.driver_id && commissionDue > 0) {
      // 1) Tenta cobrar imediatamente do saldo local do motorista
      const { data: providerRow } = await admin
        .from("providers")
        .select("wallet_balance")
        .eq("user_id", trip.driver_id)
        .maybeSingle();

      const currentBalance = round2(Number(providerRow?.wallet_balance ?? 0));
      deductedFromBalance = round2(
        currentBalance > 0 ? Math.min(currentBalance, commissionDue) : 0,
      );
      commissionStillDue = round2(commissionDue - deductedFromBalance);
      resultingBalance = round2(currentBalance - deductedFromBalance);

      if (deductedFromBalance > 0) {
        await admin
          .from("providers")
          .update({
            wallet_balance: resultingBalance,
          })
          .eq("user_id", trip.driver_id);

        // Mantém tabela dedicada de saldo do motorista (não depende de trips).
        await admin.from("driver_balances").upsert({
          user_id: trip.driver_id,
          wallet_balance: resultingBalance,
          updated_at: new Date().toISOString(),
        });

        await admin.from("wallet_transactions").insert({
          user_id: trip.driver_id,
          amount: -Math.abs(deductedFromBalance),
          type: "fee",
          description: `[CASH:${trip_id}] Desconto automático de comissão`,
          trip_id: trip_id,
          metadata: {
            manual_payment_method_id: manualPaymentMethodId,
            source: "confirm-cash-payment",
          },
          created_at: new Date().toISOString(),
        });
        await monitorDb(
          "cash_commission_deducted",
          {
            deducted_from_balance: deductedFromBalance,
            wallet_balance_after_fee: resultingBalance,
          },
          { paymentId: payment?.id ?? null },
        );
      }

      // 2) Atualiza resumo de comissão:
      // - comissão descontada do saldo local => paid
      // - saldo insuficiente => due
      const { data: summary } = await admin
        .from("driver_commission_summary")
        .select("total_commission_paid, total_commission_due")
        .eq("user_id", trip.driver_id)
        .maybeSingle();

      const totalPaid = round2(Number(summary?.total_commission_paid ?? 0));
      const totalDue = round2(Number(summary?.total_commission_due ?? 0));
      const newTotalPaid = round2(totalPaid + deductedFromBalance);
      const newTotalDue = round2(totalDue + commissionStillDue);

      await admin.from("driver_commission_summary").upsert({
        user_id: trip.driver_id,
        total_commission_paid: newTotalPaid,
        total_commission_due: newTotalDue,
        updated_at: new Date().toISOString(),
      });

      // Mantém dívida também na tabela dedicada (para a tela de ganhos).
      // Obs: alguns ambientes podem ter driver_balances mas ainda usar driver_commission_summary como fonte.
      try {
        await admin.from("driver_balances").upsert({
          user_id: trip.driver_id,
          total_debt_platform: newTotalDue,
          updated_at: new Date().toISOString(),
        });
      } catch (_) {
        // ignore
      }

      await monitorDb(
        "cash_commission_due_updated",
        {
          commission_due_total: commissionDue,
          commission_paid_now: deductedFromBalance,
          commission_due_remaining: commissionStillDue,
          total_commission_paid_after: newTotalPaid,
          total_commission_due_after: newTotalDue,
        },
        { paymentId: payment?.id ?? null },
      );
    }

    return json({
      success: true,
      commission_due_total: commissionDue,
      commission_paid_now: deductedFromBalance,
      commission_due_remaining: commissionStillDue,
      wallet_balance_after_fee: resultingBalance,
      cash_in_hand_after: cashInHandAfter,
      trace_id: traceId,
      step: "cash_confirm_completed",
    });
  } catch (error: any) {
    console.error("❌ [confirm-cash-payment] CRITICAL ERROR:", error.message);
    return edgeError({
      error: error.message ?? "Falha ao confirmar pagamento em dinheiro",
      step: "internal_error",
      reason_code: "UNEXPECTED_EXCEPTION",
      trace_id: traceId,
      status_code: 500,
    });
  }
});
