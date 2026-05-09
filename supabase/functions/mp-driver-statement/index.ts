import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

function isDriverRole(role: unknown): boolean {
  const r = String(role ?? "").toLowerCase();
  return r === "driver" || r === "provider";
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
    const userId = Number(appUser?.id ?? NaN);
    if (!Number.isFinite(userId)) return json({ error: "Usuário inválido" }, 401);
    if (!isDriverRole(appUser?.role)) return json({ error: "Acesso permitido apenas para motorista/prestador." }, 403);

    const tx = await admin
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    return json({
      success: true,
      source: "mercado_pago",
      transactions: tx.data ?? [],
      total: (tx.data ?? []).length,
    });
  } catch (error: any) {
    return json({ error: error?.message ?? "Falha ao consultar extrato Mercado Pago" }, 500);
  }
});

