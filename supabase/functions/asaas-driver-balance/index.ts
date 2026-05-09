import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";
import {
  invalidateStoredSubaccountToken,
  resolveSubaccountAccessToken,
} from "../_shared/asaas_subaccount_token.ts";

const lastRequestByUser = new Map<string, number>();
const BALANCE_MIN_INTERVAL_MS = 10_000;

function normalizeAsTextLower(value: unknown): string {
  try {
    return JSON.stringify(value ?? "").toLowerCase();
  } catch (_) {
    return String(value ?? "").toLowerCase();
  }
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length > 0 ? v : null;
}

function extractAsaasError(raw: unknown): string | null {
  const body = (raw ?? {}) as any;
  const candidates = [
    asString(body?.asaas_error),
    asString(body?.errors?.[0]?.description),
    asString(body?.message),
    asString(body?.error),
    asString(body?.details?.errors?.[0]?.description),
    asString(body?.details?.message),
    asString(body?.details?.error),
  ];
  for (const candidate of candidates) {
    if (candidate) return candidate;
  }
  return null;
}

function isAllowedRole(role: unknown): boolean {
  const v = String(role ?? "").toLowerCase();
  return v === "driver" || v === "provider";
}

function addDaysIso(baseIso: string, days: number): string {
  const base = new Date(baseIso);
  if (Number.isNaN(base.getTime())) return new Date().toISOString();
  base.setDate(base.getDate() + days);
  return base.toISOString();
}

function enforceThrottle(userId: string | number): Response | null {
  const key = String(userId);
  const now = Date.now();
  const last = lastRequestByUser.get(key) ?? 0;
  if (now - last < BALANCE_MIN_INTERVAL_MS) {
    return json(
      {
        error: "Muitas consultas de saldo em sequência. Tente novamente em alguns segundos.",
        code: "rate_limited",
        retry_after_ms: BALANCE_MIN_INTERVAL_MS - (now - last),
      },
      429,
    );
  }
  lastRequestByUser.set(key, now);
  return null;
}

async function buildDriverBalanceSnapshot(
  admin: any,
  userId: string | number,
) {
  const { data: provider } = await admin
    .from("providers")
    .select("wallet_balance, stripe_account_id, stripe_onboarding_completed")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: commission } = await admin
    .from("driver_commission_summary")
    .select("total_commission_paid, total_commission_due")
    .eq("user_id", userId)
    .maybeSingle();

  // Resumo de repasses em cartão (pagamento confirmado para cliente, aguardando liquidação para motorista).
  const { data: paymentRows } = await admin
    .from("payments")
    .select(
      "id, trip_id, amount, commission_amount, created_at, estimated_credit_date, settlement_status, billing_type, asaas_status",
    )
    .eq("billing_type", "CREDIT_CARD")
    .in("settlement_status", ["pending", "pending_settlement", "confirmed"])
    .order("created_at", { ascending: false })
    .limit(300);

  const tripIds = Array.from(
    new Set(
      (paymentRows ?? [])
        .map((p: any) => p.trip_id)
        .filter((v: unknown) => typeof v === "string" && String(v).trim().length > 0),
    ),
  ) as string[];

  const driverTripIds = new Set<string>();
  if (tripIds.length > 0) {
    const { data: tripRows } = await admin
      .from("trips")
      .select("id, driver_id")
      .in("id", tripIds)
      .eq("driver_id", userId);
    for (const t of tripRows ?? []) {
      if (t?.id) driverTripIds.add(String(t.id));
    }
  }

  const pendingCardRows = (paymentRows ?? []).filter((p: any) =>
    driverTripIds.has(String(p.trip_id))
  );
  const pendingCardCount = pendingCardRows.length;
  const pendingCardNetAmount = Number(
    pendingCardRows
      .reduce((sum: number, p: any) => {
        const gross = Number(p?.amount ?? 0);
        const fee = Number(p?.commission_amount ?? 0);
        return sum + Math.max(0, gross - fee);
      }, 0)
      .toFixed(2),
  );

  const nextCardCreditIso = pendingCardRows
    .map((p: any) => {
      const estimated = p?.estimated_credit_date ? `${p.estimated_credit_date}T12:00:00.000Z` : null;
      if (estimated) return estimated;
      const created = String(p?.created_at ?? "");
      return addDaysIso(created, 32);
    })
    .sort()[0];

  return {
    provider,
    commission,
    cardSettlement: {
      pending_count: pendingCardCount,
      pending_amount: pendingCardNetAmount,
      next_credit_at: nextCardCreditIso ?? null,
      cycle_days_reference: 32,
      status: pendingCardCount > 0 ? "awaiting_settlement" : "no_pending_settlement",
    },
  };
}

async function parseResponse(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (_) {
    return { raw: text };
  }
}

async function fetchAsaasBalance(
  asaasUrl: string,
  subaccountApiKey: string,
) {
  const proxyUrl = String(Deno.env.get("ASAAS_PROXY_URL") ?? "").trim();
  const proxyKey = String(Deno.env.get("ASAAS_PROXY_INTERNAL_KEY") ?? "").trim();
  const proxyEgressIp = String(Deno.env.get("ASAAS_PROXY_EGRESS_IP") ?? "").trim();

  if (!proxyUrl || !proxyKey) {
    return {
      ok: false,
      error: {
        step: "fetch_balance_proxy_not_configured",
        status: 500,
        code: "asaas_proxy_not_configured",
        hint:
          "Configure ASAAS_PROXY_URL e ASAAS_PROXY_INTERNAL_KEY para consulta de saldo com IP fixo.",
      },
    };
  }

  try {
    const proxyRes = await fetch(`${proxyUrl.replace(/\/+$/, "")}/subaccount/balance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": proxyKey,
      },
      body: JSON.stringify({ subaccountApiKey }),
    });
    const proxyBody = await parseResponse(proxyRes);
    if (!proxyRes.ok) {
      return {
        ok: false,
        error: {
          step: "fetch_balance_proxy",
          status: proxyRes.status,
          code:
            String((proxyBody as any)?.code ?? "").trim() ||
            "asaas_balance_proxy_failed",
          body: proxyBody,
          ...(proxyEgressIp ? { proxy_egress_ip: proxyEgressIp } : {}),
        },
      };
    }

    const parsedProxy = Number(
      proxyBody?.balance ??
        proxyBody?.availableBalance ??
        proxyBody?.wallet?.balance ??
        proxyBody?.data?.balance,
    );
    if (!Number.isNaN(parsedProxy)) {
      return {
        ok: true,
        balance: parsedProxy,
        mode: "subaccount_access_token_proxy",
      };
    }
    return {
      ok: false,
      error: {
        step: "parse_balance_proxy",
        message: "Resposta do proxy sem campo numérico de saldo",
        body: proxyBody,
      },
    };
  } catch (err: any) {
    return {
      ok: false,
      error: {
          step: "fetch_balance_proxy_exception",
          message: err?.message ?? String(err),
        },
      };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
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

    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    const ASAAS_URL = Deno.env.get("ASAAS_URL") || "https://sandbox.asaas.com/api/v3";

    if (!ASAAS_API_KEY) {
      return json({ error: "ASAAS_API_KEY não configurado" }, 500);
    }

    const { data: userRow, error: userErr } = await admin
      .from("users")
      .select("id, role, asaas_wallet_id, asaas_status")
      .eq("id", userId)
      .maybeSingle();

    if (userErr) {
      return json({ error: `Falha ao buscar perfil: ${userErr.message}` }, 500);
    }

    let asaasWalletId = userRow?.asaas_wallet_id?.toString().trim() || null;
    let asaasStatus = userRow?.asaas_status?.toString().trim() || null;

    const snapshot = await buildDriverBalanceSnapshot(admin, userId);

    // Fallback: payment_accounts
    if (!asaasWalletId) {
      const { data: paRow, error: paErr } = await admin
        .from("payment_accounts")
        .select("wallet_id, external_id, status")
        .eq("user_id", userId)
        .eq("gateway_name", "asaas")
        .maybeSingle();
      if (paErr) {
        console.warn("⚠️ [asaas-driver-balance] fallback payment_accounts falhou:", paErr.message);
      } else {
        asaasWalletId =
          paRow?.wallet_id?.toString().trim() ||
          paRow?.external_id?.toString().trim() ||
          null;
        asaasStatus = paRow?.status?.toString().trim() || asaasStatus;
      }
    }
    if (!asaasWalletId) {
      return json(
        {
          error: "Motorista sem asaas_wallet_id vinculado",
          code: "missing_asaas_wallet_id",
          details: {
            source_checked: ["users", "payment_accounts"],
          },
        },
        422,
      );
    }
    if (userRow?.role && !isAllowedRole(userRow.role)) {
      return json({ error: "Perfil sem permissão para consulta de carteira." }, 403);
    }

    const initialToken = await resolveSubaccountAccessToken({
      admin,
      userId,
      walletId: asaasWalletId,
      asaasUrl: ASAAS_URL,
      platformApiKey: ASAAS_API_KEY,
      tokenNamePrefix: "driver-app-balance",
    });

    if (!initialToken.ok) {
      const tokenError = (initialToken.error ?? {}) as Record<string, unknown>;
      const detailsStr = normalizeAsTextLower(tokenError);
      const step = String(tokenError["step"] ?? "unknown");
      const statusRaw = Number(tokenError["status"] ?? 0);
      const status = Number.isFinite(statusRaw) && statusRaw > 0 ? statusRaw : null;
      const rawCode = String(tokenError["code"] ?? "").trim();
      const isWhitelistBlocked =
        rawCode === "asaas_subaccount_whitelist_blocked" ||
        detailsStr.includes("whitelist") ||
        detailsStr.includes("invalid_action");
      const isTokenEndpointUnavailable =
        step.includes("create_access_token") && status === 404;

      const code = isWhitelistBlocked
        ? "asaas_subaccount_whitelist_blocked"
        : isTokenEndpointUnavailable
        ? "asaas_subaccount_token_endpoint_unavailable"
        : (rawCode || "asaas_subaccount_auth_failed");

      const asaasDescription =
        extractAsaasError(tokenError) ??
        extractAsaasError((tokenError as any)?.body) ??
        "Erro não detalhado pela Asaas/proxy";
      const hint = isWhitelistBlocked
        ? "Configure a whitelist de IP da subconta Asaas para permitir chamadas do backend/proxy."
        : isTokenEndpointUnavailable
        ? "Endpoint de token indisponível: usar subaccount_api_key manual em payment_accounts.metadata."
        : asString(tokenError["hint"]) ??
          "Verifique proxy interno, wallet/account id e credenciais da plataforma Asaas.";

      console.warn(
        "⚠️ [asaas-driver-balance] subaccount auth failed:",
        JSON.stringify({
          user_id: userId,
          wallet_id: asaasWalletId,
          code,
          step,
          status,
          asaas_error: asaasDescription,
        }),
      );

      return json(
        {
          error: isWhitelistBlocked
            ? "Asaas bloqueou a autenticação da subconta por whitelist de IP. Configure a whitelist para permitir chamadas do backend."
            : isTokenEndpointUnavailable
            ? "Endpoint de criação dinâmica de token da subconta indisponível no Asaas. Use apiKey da criação da conta (salva em payment_accounts.metadata.subaccount_api_key)."
            : "Falha ao autenticar na subconta Asaas do motorista",
          code,
          details: {
            step,
            status,
            asaas_error: asaasDescription,
            hint,
          },
        },
        isWhitelistBlocked ? 412 : 502,
      );
    }

    const isSandbox = ASAAS_URL.includes("sandbox");
    let asaasResult = await fetchAsaasBalance(ASAAS_URL, initialToken.token);

    // Token inválido/revogado: tenta renovação automática e reconsulta 1x.
    // Importante: mesmo quando a origem for "manual", tentamos refresh para evitar bloqueio recorrente.
    if (!asaasResult.ok) {
      const status = Number((asaasResult.error as any)?.status ?? 0);
      const isUnauthorized = status === 401 || status === 403;
      if (isUnauthorized) {
        await invalidateStoredSubaccountToken(admin, userId, asaasWalletId);

        const refreshedToken = await resolveSubaccountAccessToken({
          admin,
          userId,
          walletId: asaasWalletId,
          asaasUrl: ASAAS_URL,
          platformApiKey: ASAAS_API_KEY,
          tokenNamePrefix: "driver-app-balance-refresh",
          forceCreate: true,
        });

        if (!refreshedToken.ok) {
          const isTokenEndpoint404 =
            Number((refreshedToken.error as any)?.status ?? 0) === 404 &&
            String((refreshedToken.error as any)?.step ?? "").includes("create_access_token");
          const refreshAsaasDescription =
            extractAsaasError(refreshedToken.error) ??
            extractAsaasError((refreshedToken.error as any)?.body) ??
            "Erro não detalhado pela Asaas/proxy";
          const manualInvalidHint =
            initialToken.source === "manual"
              ? "Atualize a subaccount_api_key manual em payment_accounts.metadata"
              : null;
          console.warn(
            "⚠️ [asaas-driver-balance] subaccount token refresh failed:",
            JSON.stringify({
              user_id: userId,
              wallet_id: asaasWalletId,
              step: (refreshedToken.error as any)?.step ?? "unknown",
              status: (refreshedToken.error as any)?.status ?? null,
              asaas_error: refreshAsaasDescription,
            }),
          );
          return json(
            {
              error: isTokenEndpoint404
                ? "Não foi possível gerar chave dinâmica da subconta no Asaas (404). Salve a subaccount_api_key em payment_accounts.metadata."
                : "Falha ao renovar credencial Asaas da subconta do motorista",
              code: "asaas_subaccount_token_refresh_failed",
              details: {
                step: (refreshedToken.error as any)?.step ?? "unknown",
                status: (refreshedToken.error as any)?.status ?? null,
                asaas_error: refreshAsaasDescription,
                hint: manualInvalidHint,
              },
            },
            502,
          );
        }

        asaasResult = await fetchAsaasBalance(ASAAS_URL, refreshedToken.token);
      }
    }

    if (!asaasResult.ok) {
      const status = Number((asaasResult.error as any)?.status ?? 0);
      const isUnauthorized = status === 401 || status === 403;
      const step = (asaasResult.error as any)?.step ?? "unknown";
      const asaasBody = (asaasResult.error as any)?.body;
      return json(
        {
          error: isUnauthorized
            ? `Falha de autenticação na Asaas (${isSandbox ? "SANDBOX" : "PRODUÇÃO"}). Verifique as chaves e o ambiente.`
            : "Falha ao consultar saldo na Asaas",
          code: "asaas_balance_unavailable",
          details: {
            step,
            status: status > 0 ? status : null,
            environment: isSandbox ? "sandbox" : "production",
            asaas_error:
              asaasBody?.errors?.[0]?.description ??
              asaasBody?.message ??
              "Erro não detalhado pela Asaas",
          },
        },
        502,
      );
    }

    return json({
      success: true,
      source: "asaas",
      asaas_wallet_id: asaasWalletId,
      asaas_status: asaasStatus ?? null,
      payout_enabled: (asaasStatus ?? "") === "active",
      wallet_balance: Number(asaasResult.balance ?? 0),
      stripe_account_id: snapshot.provider?.stripe_account_id ?? null,
      stripe_onboarding_completed: snapshot.provider?.stripe_onboarding_completed ?? false,
      total_commission_paid: Number(snapshot.commission?.total_commission_paid ?? 0),
      total_commission_due: Number(snapshot.commission?.total_commission_due ?? 0),
      asaas_fetch_mode: asaasResult.mode,
      card_settlement: snapshot.cardSettlement,
    });
  } catch (error: any) {
    console.error("❌ [asaas-driver-balance]", error?.message ?? error);
    return json({ error: error?.message ?? "Falha ao consultar saldo Asaas" }, 500);
  }
});
