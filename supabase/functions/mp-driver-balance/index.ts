import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

function round2(v: number): number {
  return Number((Number(v) || 0).toFixed(2));
}

function isDriverRole(role: unknown): boolean {
  const r = String(role ?? "").toLowerCase();
  return r === "driver" || r === "provider";
}

function safeNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;
    const { admin, appUser } = auth;
    const userId = Number(appUser?.id ?? NaN);
    if (!Number.isFinite(userId)) return json({ error: "Usuário inválido" }, 401);
    if (!isDriverRole(appUser?.role)) return json({ error: "Acesso permitido apenas para motorista/prestador." }, 403);

    // Base saldo (legacy)
    const provider = await admin.from("providers").select("wallet_balance").eq("user_id", userId).maybeSingle();

    // Tabela dedicada (pode não existir ainda até aplicar migration)
    const driverBalanceRes = await admin.from("driver_balances").select("*").eq("user_id", userId).maybeSingle();
    const driverBalance = (driverBalanceRes as any)?.data ?? null;
    
    // Fallback/Legacy para commission_summary se necessário, mas priorizamos driver_balances.total_debt_platform
    const commission = await admin
      .from("driver_commission_summary")
      .select("total_commission_paid,total_commission_due")
      .eq("user_id", userId)
      .maybeSingle();
    const commissionPaid = round2(safeNumber(commission.data?.total_commission_paid ?? 0));
    const commissionDueFromSummary = round2(safeNumber(commission.data?.total_commission_due ?? 0));
    const commissionDueFromBalance = driverBalance ? safeNumber(driverBalance.total_debt_platform) : 0;
    const commissionDue = round2(
      commissionDueFromBalance > 0 ? commissionDueFromBalance : commissionDueFromSummary,
    );

    // A receber (plataforma): PIX e Cartão pendentes de liquidação/repasse
    const pending = await admin
      .from("payments")
      .select("amount,commission_amount,status,settlement_status,billing_type,trip_id")
      .eq("provider", "mercado_pago")
      .in("billing_type", ["PIX", "CREDIT_CARD"])
      .in("settlement_status", ["in_process", "pending", "authorized"])
      .order("created_at", { ascending: false })
      .limit(500);

    const tripIds = Array.from(new Set((pending.data ?? []).map((p: any) => String(p.trip_id)).filter(Boolean)));
    let myTripIds = new Set<string>();
    if (tripIds.length > 0) {
      const trips = await admin.from("trips").select("id,driver_id").in("id", tripIds).eq("driver_id", userId);
      myTripIds = new Set((trips.data ?? []).map((t: any) => String(t.id)));
    }

    const mine = (pending.data ?? []).filter((p: any) => myTripIds.has(String(p.trip_id)));
    const pendingPix = mine.filter((p: any) => String(p.billing_type).toUpperCase() === "PIX");
    const pendingCard = mine.filter((p: any) => String(p.billing_type).toUpperCase() === "CREDIT_CARD");
    const sumNet = (items: any[]) =>
      round2(
        items.reduce(
          (acc: number, p: any) =>
            acc + Math.max(0, safeNumber(p.amount) - safeNumber(p.commission_amount)),
          0,
        ),
      );
    const pendingPixAmount = sumNet(pendingPix);
    const pendingCardAmount = sumNet(pendingCard);
    const pendingAmount = round2(pendingPixAmount + pendingCardAmount);

    // Em mãos (direto): usa driver_balances.cash_in_hand_balance quando existir; senão soma ledger
    let cashInHand = 0;
    if (driverBalance) {
      cashInHand = safeNumber(driverBalance.cash_in_hand_balance);
    } else {
      const tx = await admin
        .from("wallet_transactions")
        .select("amount,type")
        .eq("user_id", userId)
        .in("type", ["cash_in_hand", "cash_inhand", "cash"])
        .limit(5000);
      cashInHand = round2((tx.data ?? []).reduce((acc: number, t: any) => acc + safeNumber(t.amount), 0));
    }

    // Taxas de cancelamento (saldo/crédito pendente ao motorista)
    const cancellation = await admin
      .from("trip_cancellation_fees")
      .select("amount,status,victim_driver_id")
      .eq("victim_driver_id", userId)
      .in("status", ["pending", "paid"])
      .limit(500);
    const cancellationPending = round2(
      (cancellation.data ?? [])
        .filter((f: any) => String(f.status).toLowerCase() === "pending")
        .reduce((acc: number, f: any) => acc + safeNumber(f.amount), 0),
    );
    const cancellationPaid = round2(
      (cancellation.data ?? [])
        .filter((f: any) => String(f.status).toLowerCase() === "paid")
        .reduce((acc: number, f: any) => acc + safeNumber(f.amount), 0),
    );

    return json({
      success: true,
      source: "mercado_pago",
      // Disponível (saldo local do motorista no app)
      balance: round2(safeNumber(driverBalance?.wallet_balance ?? provider.data?.wallet_balance ?? 0)),
      // Em mãos (direto)
      cash_in_hand_balance: round2(cashInHand),

      // A receber (plataforma)
      receivable_pix_platform: pendingPixAmount,
      receivable_card_platform: pendingCardAmount,
      receivable_platform_total: pendingAmount,

      // Dívida (taxas/comissão)
      commission_paid: commissionPaid,
      commission_due: commissionDue,

      // Taxas de cancelamento (créditos)
      cancellation_fees_pending: cancellationPending,
      cancellation_fees_paid: cancellationPaid,

      cardSettlement: {
        pending_count: mine.length,
        pending_amount: pendingAmount,
        status: mine.length > 0 ? "awaiting_settlement" : "no_pending_settlement",
      },
    });
  } catch (error: any) {
    return json({ error: error?.message ?? "Falha ao consultar saldo Mercado Pago" }, 500);
  }
});
