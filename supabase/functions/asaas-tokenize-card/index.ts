import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

function asaasErrorMessage(payload: any): string | null {
  if (!payload || typeof payload !== "object") return null;
  const firstError = Array.isArray(payload.errors) ? payload.errors[0] : null;
  if (firstError && typeof firstError.description === "string") {
    return firstError.description;
  }
  if (typeof payload.message === "string") return payload.message;
  return null;
}

function onlyDigits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function nonEmpty(value: unknown): string {
  return String(value ?? "").trim();
}

function detectRemoteIp(req: Request): string {
  const forwardedFor = nonEmpty(req.headers.get("x-forwarded-for"));
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = nonEmpty(req.headers.get("x-real-ip"));
  if (realIp) return realIp;
  const cfIp = nonEmpty(req.headers.get("cf-connecting-ip"));
  if (cfIp) return cfIp;
  return "127.0.0.1";
}

function isProductionRuntime(): boolean {
  const envCandidates = [
    Deno.env.get("SUPABASE_ENV"),
    Deno.env.get("ENV"),
    Deno.env.get("NODE_ENV"),
  ]
    .map((value) => nonEmpty(value).toLowerCase())
    .filter((value) => value.length > 0);
  const hasExplicitProd = envCandidates.some(
    (value) => value === "prod" || value === "production",
  );
  const denoDeployment = nonEmpty(Deno.env.get("DENO_DEPLOYMENT_ID"));
  return hasExplicitProd || denoDeployment.length > 0;
}

const ASAAS_REQUEST_TIMEOUT_MS = 60000;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let traceId = nonEmpty(req.headers.get("x-trace-id")) || crypto.randomUUID();

  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;

    const { admin, appUser } = auth;
    if (!appUser?.id) {
      return json({
        error: "Usuário não autenticado para tokenização.",
        step: "tokenize_card",
        reason_code: "UNAUTHENTICATED_USER",
        trace_id: traceId,
      }, 401);
    }
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    const ASAAS_URL = Deno.env.get('ASAAS_URL') || 'https://sandbox.asaas.com/api/v3';
    const ASAAS_PROXY_URL = String(Deno.env.get("ASAAS_PROXY_URL") ?? "").trim();
    const ASAAS_PROXY_INTERNAL_KEY = String(Deno.env.get("ASAAS_PROXY_INTERNAL_KEY") ?? "").trim();
    const usingProxy = ASAAS_PROXY_URL.length > 0 && ASAAS_PROXY_INTERNAL_KEY.length > 0;
    const isProduction = isProductionRuntime();
    const asaasBaseUrl = usingProxy
      ? `${ASAAS_PROXY_URL.replace(/\/+$/, "")}/asaas`
      : ASAAS_URL.replace(/\/+$/, "");
    const monitorDb = async (
      event: string,
      details: Record<string, unknown> = {},
    ) => {
      console.log(
        `[asaas-tokenize-card] ${event} trace_id=${traceId} details=${JSON.stringify(details)}`,
      );
      try {
        await admin.from("payment_transaction_logs").insert({
          trace_id: traceId,
          payment_id: null,
          trip_id: null,
          asaas_payment_id: null,
          provider: "asaas",
          channel: "edge",
          event,
          status: null,
          billing_type: "CREDIT_CARD",
          amount: null,
          payload: {
            user_id: appUser?.id ?? null,
            ...details,
          },
        });
      } catch (logError) {
        console.warn("[asaas-tokenize-card] Falha ao persistir log:", logError);
      }
    };

    if (!ASAAS_API_KEY) {
      return json({ error: 'ASAAS_API_KEY não configurado' }, 500);
    }

    if (isProduction && !usingProxy) {
      await monitorDb("tokenize_proxy_misconfigured", {
        reason_code: "ASAAS_PROXY_NOT_CONFIGURED",
        asaas_url: ASAAS_URL,
      });
      return json({
        error: "Ambiente de tokenização indisponível no momento.",
        step: "tokenize_card",
        reason_code: "ASAAS_PROXY_NOT_CONFIGURED",
        trace_id: traceId,
      }, 503);
    }

    if (usingProxy) {
      try {
        const healthRes = await fetch(
          `${ASAAS_PROXY_URL.replace(/\/+$/, "")}/health`,
          { method: "GET", signal: AbortSignal.timeout(3000) },
        );
        if (!healthRes.ok) {
          await monitorDb("tokenize_proxy_misconfigured", {
            reason_code: "ASAAS_PROXY_UNAVAILABLE",
            proxy_status: healthRes.status,
          });
          return json({
            error: "Ambiente de tokenização indisponível no momento.",
            step: "tokenize_card",
            reason_code: "ASAAS_PROXY_UNAVAILABLE",
            trace_id: traceId,
          }, 503);
        }
      } catch (proxyError: any) {
        await monitorDb("tokenize_proxy_misconfigured", {
          reason_code: "ASAAS_PROXY_UNAVAILABLE",
          proxy_error: proxyError?.message ?? String(proxyError),
        });
        return json({
          error: "Ambiente de tokenização indisponível no momento.",
          step: "tokenize_card",
          reason_code: "ASAAS_PROXY_UNAVAILABLE",
          trace_id: traceId,
        }, 503);
      }
    }

    await monitorDb("tokenize_proxy_path_selected", {
      using_proxy: usingProxy,
      asaas_base_url: asaasBaseUrl,
    });

    const {
      creditCard,
      customer_id,
      creditCardHolderInfo: rawHolderInfo,
      remoteIp: rawRemoteIp,
      trace_id: bodyTraceId,
    } = await req.json();

    traceId = nonEmpty(bodyTraceId) || traceId;

    if (!creditCard || !creditCard.number || !creditCard.holderName || !creditCard.expiryMonth || !creditCard.expiryYear || !creditCard.ccv) {
      return json({
        error: "Dados do cartão incompletos.",
        step: "tokenize_card",
        reason_code: "INVALID_CREDIT_CARD_INPUT",
        trace_id: traceId,
      }, 400);
    }
    if (!customer_id) {
      return json({
        error: "Cliente não informado para tokenização.",
        step: "tokenize_card",
        reason_code: "MISSING_CUSTOMER",
        trace_id: traceId,
      }, 400);
    }

    const { data: userProfile } = await admin
      .from("users")
      .select("id, full_name, email, phone, document_value, postal_code, address_number")
      .eq("id", appUser.id)
      .maybeSingle();

    const holderInfo = (rawHolderInfo && typeof rawHolderInfo === "object")
      ? rawHolderInfo
      : {};
    const mergedName = nonEmpty(holderInfo.name) || nonEmpty(userProfile?.full_name) || nonEmpty(creditCard.holderName);
    const mergedEmail = nonEmpty(holderInfo.email) || nonEmpty(userProfile?.email);
    const mergedCpfCnpj = onlyDigits(holderInfo.cpfCnpj) || onlyDigits(userProfile?.document_value);
    const mergedPhone = onlyDigits(holderInfo.phone) || onlyDigits(userProfile?.phone);
    const mergedPostalCode = onlyDigits(holderInfo.postalCode) || onlyDigits(userProfile?.postal_code);
    const mergedAddressNumber = nonEmpty(holderInfo.addressNumber) || nonEmpty(userProfile?.address_number);
    const remoteIp = nonEmpty(rawRemoteIp) || detectRemoteIp(req);

    const missingHolderFields: string[] = [];
    if (!mergedName) missingHolderFields.push("name");
    if (!mergedEmail) missingHolderFields.push("email");
    if (!mergedCpfCnpj) missingHolderFields.push("cpfCnpj");
    if (mergedPostalCode.length !== 8) missingHolderFields.push("postalCode");
    if (!mergedAddressNumber) missingHolderFields.push("addressNumber");

    if (missingHolderFields.length > 0) {
      await monitorDb("tokenize_card_holder_info_missing", {
        reason_code: "MISSING_CARD_HOLDER_INFO",
        missing_fields: missingHolderFields,
        customer_id,
      });
      return json({
        error: "Dados do titular incompletos para validação antifraude.",
        step: "tokenize_card",
        reason_code: "MISSING_CARD_HOLDER_INFO",
        trace_id: traceId,
        details: {
          missing_fields: missingHolderFields,
        },
      }, 400);
    }

    console.log(
      `[asaas-tokenize-card] Tokenizando cartão para: ${creditCard.holderName} em ${asaasBaseUrl} | trace_id=${traceId} | using_proxy=${usingProxy}`,
    );

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (usingProxy) {
      headers['x-internal-key'] = ASAAS_PROXY_INTERNAL_KEY;
    } else {
      headers['access_token'] = ASAAS_API_KEY;
    }

    const requestPayload = {
      customer: customer_id,
      creditCard: {
        holderName: creditCard.holderName,
        number: creditCard.number,
        expiryMonth: creditCard.expiryMonth,
        expiryYear: creditCard.expiryYear,
        ccv: creditCard.ccv,
      },
      creditCardHolderInfo: {
        name: mergedName,
        email: mergedEmail,
        cpfCnpj: mergedCpfCnpj,
        ...(mergedPhone.length > 0 ? { phone: mergedPhone, mobilePhone: mergedPhone } : {}),
        postalCode: mergedPostalCode,
        addressNumber: mergedAddressNumber,
        ...(nonEmpty(holderInfo.addressComplement).length > 0 ? { addressComplement: nonEmpty(holderInfo.addressComplement) } : {}),
      },
      remoteIp,
    };

    const tokenizeEndpoints = [
      "/creditCard/tokenizeCreditCard",
      "/creditCard/tokenize",
    ];

    let response: Response | null = null;
    let data: any = null;
    let selectedEndpoint: string | null = null;

    for (let i = 0; i < tokenizeEndpoints.length; i++) {
      const endpoint = tokenizeEndpoints[i];
      const isFallback = i > 0;
      await monitorDb("tokenize_endpoint_selected", {
        customer_id,
        endpoint,
        is_fallback: isFallback,
      });

      const currentResponse = await fetch(`${asaasBaseUrl}${endpoint}`, {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(ASAAS_REQUEST_TIMEOUT_MS),
        body: JSON.stringify(requestPayload),
      });
      const currentData = await currentResponse.json().catch(() => ({}));

      const providerCode = nonEmpty(currentData?.errors?.[0]?.code).toLowerCase();
      const shouldFallback =
        !currentResponse.ok &&
        !response &&
        !data &&
        !isFallback &&
        (currentResponse.status === 404 ||
          providerCode === "not_found" ||
          providerCode === "resource_not_found");

      if (shouldFallback) {
        await monitorDb("tokenize_endpoint_fallback_legacy", {
          customer_id,
          status: currentResponse.status,
          endpoint,
          reason_code: "TOKENIZE_ENDPOINT_FALLBACK",
        });
        continue;
      }

      response = currentResponse;
      data = currentData;
      selectedEndpoint = endpoint;
      break;
    }

    if (!response) {
      return json({
        error: "Falha ao acessar endpoint de tokenização do Asaas.",
        step: "tokenize_card",
        reason_code: "ASAAS_TOKENIZE_ENDPOINT_UNAVAILABLE",
        trace_id: traceId,
      }, 503);
    }

    if (!response.ok) {
      console.error('[asaas-tokenize-card] Erro API Asaas:', data);
      const asaasError = asaasErrorMessage(data) || 'Erro ao tokenizar cartão';
      const isIpUnauthorized = /ip n[aã]o autorizado/i.test(asaasError);
      await monitorDb("tokenize_request_failed", {
        customer_id,
        status: response.status,
        reason_code: isIpUnauthorized
          ? "ASAAS_IP_NOT_AUTHORIZED"
          : "ASAAS_TOKENIZE_REJECTED",
        asaas_error: asaasError,
        endpoint: selectedEndpoint,
        errors: data?.errors ?? null,
      });
      return json({
        error: isIpUnauthorized
          ? 'Ambiente de pagamento indisponível para tokenização de cartão.'
          : asaasError,
        step: 'tokenize_card',
        reason_code: isIpUnauthorized
          ? 'ASAAS_IP_NOT_AUTHORIZED'
          : 'ASAAS_TOKENIZE_REJECTED',
        trace_id: traceId,
        asaas_error: asaasError,
        endpoint: selectedEndpoint,
        errors: data?.errors ?? null,
      }, 400);
    }

    await monitorDb("tokenize_request_success", {
      customer_id,
      token_suffix: nonEmpty(data?.creditCardToken).slice(-8),
      brand: nonEmpty(data?.creditCardBrand),
      remote_ip: remoteIp,
      endpoint: selectedEndpoint,
    });

    return json({
      success: true,
      creditCardToken: data.creditCardToken,
      brand: data.creditCardBrand,
      last4: nonEmpty(data?.creditCardNumber).slice(-4) || nonEmpty(creditCard?.number).slice(-4),
      trace_id: traceId,
    });

  } catch (error: any) {
    console.error('[asaas-tokenize-card] Erro inesperado:', error);
    const isTimeout =
      nonEmpty(error?.name).toLowerCase().includes("abort") ||
      /timed out|timeout/i.test(nonEmpty(error?.message));
    return json({
      error: isTimeout
        ? "Tempo limite excedido na tokenização do cartão."
        : error?.message ?? "Erro inesperado na tokenização do cartão.",
      step: "tokenize_card",
      reason_code: isTimeout
        ? "ASAAS_TOKENIZE_TIMEOUT"
        : "ASAAS_TOKENIZE_INTERNAL_ERROR",
      trace_id: traceId,
    }, 500);
  }
});
