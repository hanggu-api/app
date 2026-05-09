type ResolveSubaccountTokenOptions = {
  admin: any;
  userId: string | number;
  walletId: string;
  asaasUrl: string;
  platformApiKey: string;
  tokenNamePrefix?: string;
  forceCreate?: boolean;
};

type ResolveSubaccountTokenResult =
  | { ok: true; token: string; source: "cache" | "db" | "env" | "created" | "manual" }
  | { ok: false; error: Record<string, unknown> };

type TokenCacheEntry = {
  token: string;
  source: "db" | "env" | "created" | "manual";
};

const runtimeSubaccountTokenCache = new Map<string, TokenCacheEntry>();

function parseConfiguredTokenMap(): Record<string, string> {
  const raw = Deno.env.get("ASAAS_SUBACCOUNT_API_KEYS_JSON");
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [walletId, value] of Object.entries(parsed)) {
      const token = String(value ?? "").trim();
      if (walletId && token) out[walletId] = token;
    }
    return out;
  } catch (_) {
    return {};
  }
}

async function parseResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch (_) {
    return { raw: text };
  }
}

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

function isWhitelistBlockedError(raw: unknown): boolean {
  const text = normalizeAsTextLower(raw);
  return text.includes("whitelist") || text.includes("invalid_action");
}

function buildSubaccountTokenError(
  step: string,
  status: number | null,
  body: unknown,
  defaultCode = "asaas_subaccount_auth_failed",
): Record<string, unknown> {
  const blocked = isWhitelistBlockedError(body);
  const code = blocked ? "asaas_subaccount_whitelist_blocked" : defaultCode;
  const asaasError = extractAsaasError(body) ?? "Erro não detalhado pela Asaas/proxy";
  const hint = blocked
    ? "Configure a whitelist de IP da subconta Asaas para permitir chamadas do backend/proxy."
    : "Verifique wallet/account id, proxy interno e credenciais da plataforma Asaas.";

  return {
    code,
    step,
    status,
    asaas_error: asaasError,
    hint,
    body,
  };
}

function tokenCacheKey(userId: string | number, walletId: string): string {
  return `${String(userId)}:${walletId}`;
}

function toDbUserId(userId: string | number): number | null {
  const parsed = Number(userId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function getPaymentAccountRow(
  admin: any,
  userId: string | number,
): Promise<{ data: any | null; error: string | null }> {
  const dbUserId = toDbUserId(userId);
  if (!dbUserId) return { data: null, error: "user_id inválido para payment_accounts" };

  const { data, error } = await admin
    .from("payment_accounts")
    .select("id, user_id, external_id, wallet_id, status, metadata")
    .eq("user_id", dbUserId)
    .eq("gateway_name", "asaas")
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message ?? "Falha ao buscar payment_accounts" };
  }

  return { data: data ?? null, error: null };
}

async function persistTokenOnPaymentAccount(
  admin: any,
  userId: string | number,
  walletId: string,
  token: string,
  source: "env" | "created",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const dbUserId = toDbUserId(userId);
  if (!dbUserId) return { ok: false, error: "user_id inválido para persistência de token" };

  const existing = await getPaymentAccountRow(admin, userId);
  if (existing.error) return { ok: false, error: existing.error };

  const currentMetadata =
    existing.data && typeof existing.data.metadata === "object" && existing.data.metadata !== null
      ? existing.data.metadata
      : {};

  const metadata = {
    ...currentMetadata,
    subaccount_api_key: token,
    subaccount_api_key_source: source,
    subaccount_api_key_updated_at: new Date().toISOString(),
  };

  const payload = {
    user_id: dbUserId,
    gateway_name: "asaas",
    external_id:
      String(existing.data?.external_id ?? "").trim() || walletId,
    wallet_id: walletId,
    status: String(existing.data?.status ?? "active"),
    metadata,
    asaas_access_token: token, // 🌟 New column
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("payment_accounts")
    .upsert(payload, { onConflict: "user_id,gateway_name" });

  if (error) {
    return {
      ok: false,
      error: error.message ?? "Falha ao salvar subaccount_api_key em payment_accounts",
    };
  }

  return { ok: true };
}

async function createSubaccountAccessToken(
  asaasUrl: string,
  platformApiKey: string,
  accountIdentifier: string,
  userId: string | number,
  tokenNamePrefix: string,
): Promise<{ ok: true; token: string } | { ok: false; error: Record<string, unknown> }> {
  const proxyUrl = String(Deno.env.get("ASAAS_PROXY_URL") ?? "").trim();
  const proxyKey = String(Deno.env.get("ASAAS_PROXY_INTERNAL_KEY") ?? "").trim();
  if (!proxyUrl || !proxyKey) {
    return {
      ok: false,
      error: {
        code: "asaas_proxy_not_configured",
        step: "create_access_token_proxy_not_configured",
        status: 500,
        hint:
          "Configure ASAAS_PROXY_URL e ASAAS_PROXY_INTERNAL_KEY para chamadas da subconta com IP fixo.",
      },
    };
  }

  if (proxyUrl && proxyKey) {
    const proxyRes = await fetch(`${proxyUrl.replace(/\/+$/, "")}/subaccount/access-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": proxyKey,
      },
      body: JSON.stringify({
        walletId: accountIdentifier,
        userId: String(userId),
        name: `${tokenNamePrefix}-${accountIdentifier.slice(0, 8)}-${Date.now()}`,
      }),
    });

    const proxyBody = await parseResponse(proxyRes);
    if (!proxyRes.ok) {
      // Fallback automático em modo proxy:
      // 1) tenta resolver account id por externalReference (userId)
      // 2) tenta criar access token novamente com account id correto
      if (proxyRes.status === 404) {
        try {
          const lookupRes = await fetch(
            `${proxyUrl.replace(/\/+$/, "")}/asaas/accounts?externalReference=${encodeURIComponent(String(userId))}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "x-internal-key": proxyKey,
              },
            },
          );
          const lookupBody = await parseResponse(lookupRes);
          const firstAccount = (lookupBody as any)?.data?.[0] ?? {};
          const accountIdCandidate = String(firstAccount?.id ?? "").trim();
          const accountWalletCandidate = String(firstAccount?.walletId ?? "").trim();

          if (
            lookupRes.ok &&
            accountIdCandidate &&
            accountIdCandidate !== accountIdentifier &&
            accountWalletCandidate &&
            accountWalletCandidate === String(accountIdentifier).trim()
          ) {
            const retryRes = await fetch(
              `${proxyUrl.replace(/\/+$/, "")}/subaccount/access-token`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-internal-key": proxyKey,
                },
                body: JSON.stringify({
                  walletId: accountIdCandidate,
                  userId: String(userId),
                  name: `${tokenNamePrefix}-${accountIdCandidate.slice(0, 8)}-${Date.now()}`,
                }),
              },
            );
            const retryBody = await parseResponse(retryRes);
            if (retryRes.ok) {
              const retryTokenCandidate =
                (retryBody as any)?.accessToken ??
                (retryBody as any)?.token ??
                (retryBody as any)?.apiKey ??
                (retryBody as any)?.data?.accessToken ??
                (retryBody as any)?.data?.token ??
                (retryBody as any)?.data?.apiKey;
              const retryToken = String(retryTokenCandidate ?? "").trim();
              if (retryToken) {
                return { ok: true, token: retryToken };
              }
            }
          }
          if (
            lookupRes.ok &&
            accountIdCandidate &&
            accountWalletCandidate &&
            accountWalletCandidate !== String(accountIdentifier).trim()
          ) {
            return {
              ok: false,
              error: buildSubaccountTokenError(
                "lookup_account_id_mismatch",
                409,
                {
                  message:
                    "Lookup por externalReference retornou conta diferente do wallet esperado.",
                  expected_wallet_id: String(accountIdentifier).trim(),
                  returned_wallet_id: accountWalletCandidate,
                  returned_account_id: accountIdCandidate,
                },
                "asaas_subaccount_account_mismatch",
              ),
            };
          }
        } catch (_) {
          // mantém erro original abaixo
        }
      }
      return {
        ok: false,
        error: buildSubaccountTokenError(
          "create_access_token_proxy",
          proxyRes.status,
          proxyBody,
        ),
      };
    }

    const proxyTokenCandidate =
      proxyBody?.accessToken ??
      proxyBody?.token ??
      proxyBody?.apiKey ??
      (proxyBody?.data as any)?.accessToken ??
      (proxyBody?.data as any)?.token ??
      (proxyBody?.data as any)?.apiKey;
    const proxyToken = String(proxyTokenCandidate ?? "").trim();
    if (!proxyToken) {
      return {
        ok: false,
        error: buildSubaccountTokenError(
          "parse_access_token_proxy",
          proxyRes.status,
          proxyBody,
        ),
      };
    }
    return { ok: true, token: proxyToken };
  }

  return {
    ok: false,
    error: {
      code: "asaas_proxy_not_configured",
      step: "create_access_token_proxy_not_configured",
      status: 500,
      hint:
        "Configure ASAAS_PROXY_URL e ASAAS_PROXY_INTERNAL_KEY para chamadas da subconta com IP fixo.",
    },
  };
}

export async function invalidateStoredSubaccountToken(
  admin: any,
  userId: string | number,
  walletId: string,
): Promise<void> {
  runtimeSubaccountTokenCache.delete(tokenCacheKey(userId, walletId));

  const existing = await getPaymentAccountRow(admin, userId);
  if (existing.error || !existing.data) return;

  const currentMetadata =
    typeof existing.data.metadata === "object" && existing.data.metadata !== null
      ? { ...existing.data.metadata }
      : {};

  const source = String(currentMetadata.subaccount_api_key_source ?? "").toLowerCase();
  const shouldPreserveManualToken = source === "manual";

  // Preserva chave manual para não apagar credencial inserida pelo operador.
  if (!shouldPreserveManualToken && "subaccount_api_key" in currentMetadata) {
    delete currentMetadata.subaccount_api_key;
  }
  currentMetadata.subaccount_api_key_invalidated_at = new Date().toISOString();
  if (shouldPreserveManualToken) {
    currentMetadata.subaccount_api_key_manual_preserved = true;
  }

  await admin
    .from("payment_accounts")
    .update({
      metadata: currentMetadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.data.id);
}

export async function resolveSubaccountAccessToken(
  opts: ResolveSubaccountTokenOptions,
): Promise<ResolveSubaccountTokenResult> {
  const {
    admin,
    userId,
    walletId,
    asaasUrl,
    platformApiKey,
    tokenNamePrefix = "driver-app",
    forceCreate = false,
  } = opts;

  const cacheKey = tokenCacheKey(userId, walletId);
  let accountIdentifier = walletId;

  if (!forceCreate) {
    const cached = runtimeSubaccountTokenCache.get(cacheKey);
    if (cached) {
      const source = cached.source === "manual" ? "manual" : "cache";
      return { ok: true, token: cached.token, source };
    }

    const accountLookup = await getPaymentAccountRow(admin, userId);
    if (accountLookup.error) {
      return {
        ok: false,
        error: {
          step: "payment_account_lookup",
          message: accountLookup.error,
        },
      };
    }

    const account = accountLookup.data;
    accountIdentifier = String(account?.external_id ?? "").trim() || walletId;
    const walletMatches =
      !account?.wallet_id ||
      String(account.wallet_id).trim() === walletId;

    // 🌟 Check the new column first, then fallback to metadata
    const dbTokenCandidate =
      walletMatches &&
      account &&
      (String(account.asaas_access_token ?? "").trim() || (
        typeof account.metadata === "object" &&
        account.metadata !== null
          ? (account.metadata as Record<string, unknown>).subaccount_api_key
          : null
      ));

    const dbToken = String(dbTokenCandidate ?? "").trim();
    if (dbToken) {
      const dbSource =
        String(
          account &&
            typeof account.metadata === "object" &&
            account.metadata !== null
            ? (account.metadata as Record<string, unknown>).subaccount_api_key_source ?? "db"
            : "db",
        ).toLowerCase() === "manual"
          ? "manual"
          : "db";
      runtimeSubaccountTokenCache.set(cacheKey, { token: dbToken, source: dbSource });
      return { ok: true, token: dbToken, source: dbSource === "manual" ? "manual" : "db" };
    }

    const configuredMap = parseConfiguredTokenMap();
    const envToken = String(configuredMap[walletId] ?? "").trim();
    if (envToken) {
      runtimeSubaccountTokenCache.set(cacheKey, { token: envToken, source: "env" });
      const persisted = await persistTokenOnPaymentAccount(
        admin,
        userId,
        walletId,
        envToken,
        "env",
      );
      if (!persisted.ok) {
        console.warn("⚠️ [AsaasToken] Não foi possível persistir token de env:", persisted.error);
      }
      return { ok: true, token: envToken, source: "env" };
    }
  }

  const created = await createSubaccountAccessToken(
    asaasUrl,
    platformApiKey,
    accountIdentifier,
    userId,
    tokenNamePrefix,
  );
  if (!created.ok) return created;

  runtimeSubaccountTokenCache.set(cacheKey, { token: created.token, source: "created" });
  const persisted = await persistTokenOnPaymentAccount(
    admin,
    userId,
    walletId,
    created.token,
    "created",
  );
  if (!persisted.ok) {
    return {
      ok: false,
      error: {
        step: "persist_subaccount_token",
        message: persisted.error,
      },
    };
  }

  return { ok: true, token: created.token, source: "created" };
}
