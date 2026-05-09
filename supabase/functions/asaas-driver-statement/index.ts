import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";
import {
  invalidateStoredSubaccountToken,
  resolveSubaccountAccessToken,
} from "../_shared/asaas_subaccount_token.ts";

const lastRequestByUser = new Map<string, number>();
const STATEMENT_MIN_INTERVAL_MS = 15_000;

function isAllowedRole(role: unknown): boolean {
  const v = String(role ?? "").toLowerCase();
  return v === "driver" || v === "provider";
}

function enforceThrottle(userId: string | number): Response | null {
  const key = String(userId);
  const now = Date.now();
  const last = lastRequestByUser.get(key) ?? 0;
  if (now - last < STATEMENT_MIN_INTERVAL_MS) {
    return json(
      {
        error: "Muitas consultas de extrato em sequência. Aguarde alguns segundos.",
        code: "rate_limited",
        retry_after_ms: STATEMENT_MIN_INTERVAL_MS - (now - last),
      },
      429,
    );
  }
  lastRequestByUser.set(key, now);
  return null;
}

type NormalizedTx = {
  asaas_id: string;
  amount: number;
  type: string;
  description: string;
  status: string;
  created_at: string;
  is_add: boolean;
  raw: Record<string, unknown>;
};

function normalizeDate(value: unknown): string {
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  return new Date().toISOString();
}

function toNum(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isNaN(n) ? 0 : n;
}

function normalizeFromFinancialTx(item: Record<string, unknown>): NormalizedTx {
  const amount = toNum(item.value ?? item.amount);
  const kind = (item.type ?? item.operationType ?? "movement").toString();
  const status = (item.status ?? "unknown").toString();
  const description =
    (item.description ?? item.observation ?? item.type ?? "Movimentação Asaas").toString();
  const asaasId =
    (item.id ?? item.transactionId ?? crypto.randomUUID().replaceAll("-", "")).toString();
  const createdAt = normalizeDate(item.date ?? item.createdAt ?? item.effectiveDate);
  const isAdd = amount >= 0;

  return {
    asaas_id: asaasId,
    amount: Math.abs(amount),
    type: kind,
    description,
    status,
    created_at: createdAt,
    is_add: isAdd,
    raw: item,
  };
}

async function fetchViaProxy(
  proxyUrl: string,
  proxyKey: string,
  payload: Record<string, unknown>,
) {
  const res = await fetch(`${proxyUrl.replace(/\/+$/, "")}/subaccount/financial-transactions`, {
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
      return json({ error: "Acesso permitido apenas para motorista/prestador." }, 403);
    }
    const throttle = enforceThrottle(userId);
    if (throttle) return throttle;

    const urlObj = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const limit = Number(body?.limit ?? urlObj.searchParams.get("limit") ?? "50");
    const offset = Number(body?.offset ?? urlObj.searchParams.get("offset") ?? "0");

    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    const ASAAS_URL = Deno.env.get("ASAAS_URL") || "https://sandbox.asaas.com/api/v3";
    const ASAAS_PROXY_URL = String(Deno.env.get("ASAAS_PROXY_URL") ?? "").trim();
    const ASAAS_PROXY_INTERNAL_KEY = String(Deno.env.get("ASAAS_PROXY_INTERNAL_KEY") ?? "").trim();
    if (!ASAAS_API_KEY) return json({ error: "ASAAS_API_KEY não configurado" }, 500);
    if (!ASAAS_PROXY_URL || !ASAAS_PROXY_INTERNAL_KEY) {
      return json(
        {
          error: "Proxy Asaas não configurado para extrato da subconta.",
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
      .select("id, role, asaas_wallet_id")
      .eq("id", userId)
      .maybeSingle();
    if (userError) return json({ error: `Falha perfil: ${userError.message}` }, 500);

    const asaasWalletId = userRow?.asaas_wallet_id?.toString().trim() || null;
    if (!asaasWalletId) {
      return json({ error: "Motorista sem asaas_wallet_id", code: "missing_asaas_wallet_id" }, 422);
    }
    if (userRow?.role && !isAllowedRole(userRow.role)) {
      return json({ error: "Perfil sem permissão para consulta de extrato." }, 403);
    }

    let resolvedToken = await resolveSubaccountAccessToken({
      admin,
      userId,
      walletId: asaasWalletId,
      asaasUrl: ASAAS_URL,
      platformApiKey: ASAAS_API_KEY,
      tokenNamePrefix: "driver-app-statement",
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

    let response = await fetchViaProxy(ASAAS_PROXY_URL, ASAAS_PROXY_INTERNAL_KEY, {
      subaccountApiKey: resolvedToken.token,
      limit,
      offset,
    });

    // Token da subconta inválido/revogado: renova e tenta 1x.
    // Mesmo com origem manual, tentamos refresh para reduzir regressões operacionais.
    if (!response.ok && (response.status === 401 || response.status === 403)) {
      const wasManualToken = resolvedToken.source === "manual";
      await invalidateStoredSubaccountToken(admin, userId, asaasWalletId);
      resolvedToken = await resolveSubaccountAccessToken({
        admin,
        userId,
        walletId: asaasWalletId,
        asaasUrl: ASAAS_URL,
        platformApiKey: ASAAS_API_KEY,
        tokenNamePrefix: "driver-app-statement-refresh",
        forceCreate: true,
      });

      if (!resolvedToken.ok) {
        const manualInvalidHint = wasManualToken
          ? "Atualize a subaccount_api_key manual em payment_accounts.metadata"
          : null;
        return json(
          {
            error: "Falha ao renovar credencial da subconta Asaas para extrato",
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

      response = await fetchViaProxy(ASAAS_PROXY_URL, ASAAS_PROXY_INTERNAL_KEY, {
        subaccountApiKey: resolvedToken.token,
        limit,
        offset,
      });
    }

    if (!response.ok) {
      return json(
        {
          error: "Falha ao consultar extrato na Asaas",
          code: "asaas_statement_unavailable",
          status: response.status,
          details: {
            status: response.status,
          },
        },
        502,
      );
    }

    const rawItems = Array.isArray(response.body?.data) ? response.body.data : [];
    const normalized = rawItems
      .map((item: Record<string, unknown>) => normalizeFromFinancialTx(item))
      .filter((tx: NormalizedTx) => tx.amount >= 0);

    // Auditoria local (append-only, não é fonte de verdade)
    for (const tx of normalized) {
      const auditDescription =
        `[ASAAS:${tx.asaas_id}] ${tx.description}`.slice(0, 500);
      await admin.from("wallet_transactions").insert({
        user_id: userId,
        amount: tx.is_add ? tx.amount : -tx.amount,
        type: tx.is_add ? "deposit" : "payout",
        description: auditDescription,
        created_at: tx.created_at,
      });
    }

    return json({
      success: true,
      source: "asaas",
      asaas_wallet_id: asaasWalletId,
      transactions: normalized,
      total: normalized.length,
    });
  } catch (error: any) {
    console.error("❌ [asaas-driver-statement]", error?.message ?? error);
    return json({ error: error?.message ?? "Falha ao consultar extrato Asaas" }, 500);
  }
});
