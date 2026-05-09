import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

function round2(v: number): number {
  return Number((Number(v) || 0).toFixed(2));
}

function isDriverRole(role: unknown): boolean {
  const r = String(role ?? "").toLowerCase();
  return r === "driver" || r === "provider";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;
    const { admin, appUser } = auth;
    const userId = Number(appUser?.id ?? NaN);
    if (!Number.isFinite(userId)) return json({ error: "Usuário inválido" }, 401);
    if (!isDriverRole(appUser?.role)) return json({ error: "Acesso permitido apenas para motorista/prestador." }, 403);

    const body = await req.json().catch(() => ({}));
    const amount = round2(Number(body?.amount ?? 0));
    if (!amount || amount <= 0) return json({ error: "Valor inválido para saque" }, 400);

    const provider = await admin.from("providers").select("wallet_balance").eq("user_id", userId).maybeSingle();
    const balance = round2(Number(provider.data?.wallet_balance ?? 0));
    if (balance < amount) {
      return json({ error: "Saldo insuficiente para saque", code: "insufficient_funds" }, 422);
    }

    const after = round2(balance - amount);
    await admin.from("providers").update({
      wallet_balance: after,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);

    await admin.from("wallet_transactions").insert({
      user_id: userId,
      amount: -amount,
      type: "payout",
      description: `[MP] Solicitação de saque manual`,
      created_at: new Date().toISOString(),
    });

    return json({
      success: true,
      source: "mercado_pago",
      payout_id: `manual_${Date.now()}`,
      status: "requested",
      amount,
      balance_after: after,
    });
  } catch (error: any) {
    return json({ error: error?.message ?? "Falha ao solicitar saque Mercado Pago" }, 500);
  }
});

