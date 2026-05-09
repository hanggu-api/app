import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";
import {
  invalidateStoredSubaccountToken,
  resolveSubaccountAccessToken,
} from "../_shared/asaas_subaccount_token.ts";

const lastPayoutByUser = new Map<string, number>();
const PAYOUT_MIN_INTERVAL_MS = 60_000;

function isAllowedRole(role: unknown): boolean {
  const v = String(role ?? "").toLowerCase();
  return v === "driver" || v === "provider";
}

function enforceThrottle(userId: string | number): Response | null {
  const key = String(userId);
  const now = Date.now();
  const last = lastPayoutByUser.get(key) ?? 0;
  if (now - last < PAYOUT_MIN_INTERVAL_MS) {
    return json(
      {
        error: "Muitas solicitações de saque em sequência. Aguarde alguns segundos.",
        code: "rate_limited",
        retry_after_ms: PAYOUT_MIN_INTERVAL_MS - (now - last),
      },
      429,
    );
  }
  lastPayoutByUser.set(key, now);
  return null;
}

async function postViaProxy(
  proxyUrl: string,
  proxyKey: string,
  payload: Record<string, unknown>,
) {
  const res = await fetch(`${proxyUrl.replace(/\/+$/, "")}/subaccount/transfers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": proxyKey,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let body: any = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch (_) {
    body = { raw: text };
  }
  return { ok: res.ok, status: res.status, body };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;
    const { admin, appUser } = auth;
    const userId = appUser?.id;
    if (!userId) return json({ error: "Usuário inválido" }, 401);
    if (!isAllowedRole(appUser?.role)) {
      return json({ error: "Acesso permitido apenas para motorista/prestador." }, 403);
    }
    const throttle = enforceThrottle(userId);
    if (throttle) return throttle;

    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount ?? 0);
    if (!amount || amount <= 0) return json({ error: "Valor inválido para saque" }, 400);

    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    const ASAAS_URL = Deno.env.get("ASAAS_URL") || "https://sandbox.asaas.com/api/v3";
    const ASAAS_PROXY_URL = String(Deno.env.get("ASAAS_PROXY_URL") ?? "").trim();
    const ASAAS_PROXY_INTERNAL_KEY = String(Deno.env.get("ASAAS_PROXY_INTERNAL_KEY") ?? "").trim();
    if (!ASAAS_API_KEY) return json({ error: "ASAAS_API_KEY não configurado" }, 500);
    if (!ASAAS_PROXY_URL || !ASAAS_PROXY_INTERNAL_KEY) {
      return json(
        {
          error: "Proxy Asaas não configurado para saque da subconta.",
          code: "asaas_proxy_not_configured",
          details: {
            step: "proxy_config_validation",
            hint: "Configure ASAAS_PROXY_URL e ASAAS_PROXY_INTERNAL_KEY.",
          },
        },
        500,
      );
    }

    const { data: userRow, error: userError } = await admin
      .from("users")
      .select("id, role, asaas_wallet_id, asaas_status")
      .eq("id", userId)
      .maybeSingle();
    if (userError) return json({ error: `Falha perfil: ${userError.message}` }, 500);

    const asaasWalletId = userRow?.asaas_wallet_id?.toString().trim() || null;
    if (!asaasWalletId) {
      return json({ error: "Motorista sem asaas_wallet_id", code: "missing_asaas_wallet_id" }, 422);
    }
    if (userRow?.role && !isAllowedRole(userRow.role)) {
      return json({ error: "Perfil sem permissão para saque." }, 403);
    }
    if ((userRow?.asaas_status ?? "") !== "active") {
      return json({ error: "Conta Asaas ainda não ativa para saque" }, 422);
    }

    let resolvedToken = await resolveSubaccountAccessToken({
      admin,
      userId,
      walletId: asaasWalletId,
      asaasUrl: ASAAS_URL,
      platformApiKey: ASAAS_API_KEY,
      tokenNamePrefix: "driver-app-payout",
    });
    if (!resolvedToken.ok) {
      return json(
        {
          error: "Falha ao autenticar na subconta Asaas do motorista",
          code: "asaas_subaccount_auth_failed",
          details: {
            step: (resolvedToken.error as any)?.step ?? "unknown",
            status: (resolvedToken.error as any)?.status ?? null,
          },
        },
        502,
      );
    }

    let payoutRes = await postViaProxy(ASAAS_PROXY_URL, ASAAS_PROXY_INTERNAL_KEY, {
      subaccountApiKey: resolvedToken.token,
      value: amount,
      description: "Saque solicitado pelo app",
    });

    // Token inválido/revogado: renova e tenta 1x.
    // Mesmo para token manual, tentamos refresh automático antes de falhar.
    if (!payoutRes.ok && (payoutRes.status === 401 || payoutRes.status === 403)) {
      const wasManualToken = resolvedToken.source === "manual";
      await invalidateStoredSubaccountToken(admin, userId, asaasWalletId);
      resolvedToken = await resolveSubaccountAccessToken({
        admin,
        userId,
        walletId: asaasWalletId,
        asaasUrl: ASAAS_URL,
        platformApiKey: ASAAS_API_KEY,
        tokenNamePrefix: "driver-app-payout-refresh",
        forceCreate: true,
      });

      if (!resolvedToken.ok) {
        const manualInvalidHint = wasManualToken
          ? "Atualize a subaccount_api_key manual em payment_accounts.metadata"
          : null;
        return json(
          {
            error: "Falha ao renovar credencial da subconta Asaas para saque",
            code: "asaas_subaccount_token_refresh_failed",
            details: {
              step: (resolvedToken.error as any)?.step ?? "unknown",
              status: (resolvedToken.error as any)?.status ?? null,
              hint: manualInvalidHint,
            },
          },
          502,
        );
      }

      payoutRes = await postViaProxy(ASAAS_PROXY_URL, ASAAS_PROXY_INTERNAL_KEY, {
        subaccountApiKey: resolvedToken.token,
        value: amount,
        description: "Saque solicitado pelo app",
      });
    }

    if (!payoutRes.ok) {
      return json(
        {
          error: "Falha ao solicitar saque na Asaas",
          status: payoutRes.status,
          details: {
            status: payoutRes.status,
          },
        },
        502,
      );
    }

    // Auditoria local (não é fonte de verdade)
    await admin.from("wallet_transactions").insert({
      user_id: userId,
      amount: -Math.abs(amount),
      type: "payout",
      description: `[ASAAS:${payoutRes.body?.id ?? "unknown"}] Saque solicitado`,
      created_at: new Date().toISOString(),
    });

    return json({
      success: true,
      source: "asaas",
      payout_id: payoutRes.body?.id ?? null,
      status: payoutRes.body?.status ?? "requested",
      amount,
    });
  } catch (error: any) {
    console.error("❌ [asaas-request-payout]", error?.message ?? error);
    return json({ error: error?.message ?? "Falha ao solicitar saque Asaas" }, 500);
  }
});
