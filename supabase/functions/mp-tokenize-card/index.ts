import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function digits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function monthYearFromExpiry(expMonth: unknown, expYear: unknown) {
  const month = clean(expMonth).padStart(2, "0");
  const yearRaw = clean(expYear);
  const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
  return { month, year };
}

function luhnCheck(cardNumber: string): boolean {
  let sum = 0;
  let shouldDouble = false;
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = Number(cardNumber[i]);
    if (Number.isNaN(digit)) return false;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let traceId = req.headers.get("x-trace-id") || crypto.randomUUID();

  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;
    const { admin, appUser } = auth;
    const isServiceRole = appUser?.id === "service_role";
    const body = await req.json().catch(() => ({}));
    traceId = clean(body?.trace_id) || traceId;
    const action = clean(body?.action);

    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    if (!MP_ACCESS_TOKEN) {
      return json({
        error: "MP_ACCESS_TOKEN não configurado",
        step: "validate_env",
        reason_code: "MISSING_MP_ACCESS_TOKEN",
        trace_id: traceId,
        status_code: 500,
      }, 500);
    }

    // --- NOVA AÇÃO: Tokenizar cartão salvo ---
    if (action === "tokenize_saved_card") {
      const cardId = clean(body?.card_id);
      const securityCode = clean(body?.security_code);

      if (!cardId || !securityCode) {
        return json({
          error: "card_id e security_code obrigatórios para esta ação",
          step: "validate_input",
          trace_id: traceId,
          status_code: 400,
        }, 400);
      }

      const tokenRes = await fetch("https://api.mercadopago.com/v1/card_tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          card_id: cardId,
          security_code: securityCode,
        }),
      });

      const tokenData = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || !tokenData?.id) {
        return json({
          error: "Falha ao tokenizar cartão salvo no Mercado Pago",
          step: "tokenize_saved_card",
          reason_code: "MP_SAVED_CARD_TOKENIZE_FAILED",
          trace_id: traceId,
          status_code: 502,
          details: tokenData,
        }, 502);
      }

      return json({
        success: true,
        id: tokenData.id,
        token: tokenData.id,
        trace_id: traceId,
      });
    }

    const customerId = clean(body?.customer_id);

    // Permitir passar userId no body se for service_role
    let userId = Number(appUser?.id ?? NaN);
    if (isServiceRole && body?.userId) {
      userId = Number(body.userId);
    }

    const card = body?.creditCard ?? {};
    const holder = body?.creditCardHolderInfo ?? {};

    if (!customerId) {
      return json({
        error: "customer_id obrigatório",
        step: "validate_input",
        reason_code: "MISSING_CUSTOMER_ID",
        trace_id: traceId,
        status_code: 400,
      }, 400);
    }

    const number = digits(card?.number);
    const ccv = digits(card?.ccv);
    const holderName = clean(card?.holderName);
    const { month, year } = monthYearFromExpiry(card?.expiryMonth, card?.expiryYear);
    const doc = digits(holder?.cpfCnpj);

    if (!number || !ccv || !holderName || !month || !year || !doc) {
      return json({
        error: "Dados de cartão incompletos",
        step: "tokenize_card",
        reason_code: "INVALID_CREDIT_CARD_INPUT",
        trace_id: traceId,
        status_code: 400,
      }, 400);
    }
    if (number.length < 13 || number.length > 19 || !luhnCheck(number)) {
      return json({
        error: "Número do cartão inválido",
        step: "tokenize_card",
        reason_code: "INVALID_CARD_NUMBER",
        trace_id: traceId,
        status_code: 400,
      }, 400);
    }



    if (Number.isFinite(userId)) {
      const existing = await admin
        .from("user_payment_methods")
        .select("id")
        .eq("user_id", userId)
        .not("mp_card_id", "is", null)
        .limit(1)
        .maybeSingle();
      if (existing.data?.id) {
        return json({
          error: "Você já possui um cartão cadastrado. Remova o cartão atual para cadastrar outro.",
          step: "tokenize_card",
          reason_code: "CARD_ALREADY_EXISTS",
          trace_id: traceId,
          status_code: 409,
        }, 409);
      }
    }

    const tokenRes = await fetch("https://api.mercadopago.com/v1/card_tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        card_number: number,
        security_code: ccv,
        expiration_month: Number(month),
        expiration_year: Number(year),
        cardholder: {
          name: holderName,
          identification: {
            type: "CPF",
            number: doc,
          },
        },
      }),
    });
    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenData?.id) {
      return json({
        error: "Falha ao tokenizar cartão no Mercado Pago",
        step: "tokenize_card",
        reason_code: "MP_CARD_TOKENIZE_FAILED",
        trace_id: traceId,
        status_code: 502,
        details: tokenData,
      }, 502);
    }

    const paymentMethodsRes = await fetch(
      `https://api.mercadopago.com/v1/payment_methods/search?bin=${encodeURIComponent(number.slice(0, 6))}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        },
      },
    );
    const paymentMethodsData = await paymentMethodsRes.json().catch(() => ({}));
    const paymentMethod = Array.isArray(paymentMethodsData?.results) ? paymentMethodsData.results[0] : null;
    const paymentTypeId = clean(paymentMethod?.payment_type_id).toLowerCase();
    if (paymentTypeId && paymentTypeId !== "credit_card") {
      return json({
        error: "Apenas cartão de crédito é aceito neste momento.",
        step: "tokenize_card",
        reason_code: "CARD_TYPE_NOT_ALLOWED",
        trace_id: traceId,
        status_code: 400,
        details: { payment_type_id: paymentTypeId },
      }, 400);
    }

    const cardRes = await fetch(`https://api.mercadopago.com/v1/customers/${customerId}/cards`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ token: String(tokenData.id) }),
    });
    const cardData = await cardRes.json().catch(() => ({}));
    if (!cardRes.ok || !cardData?.id) {
      return json({
        error: "Falha ao salvar cartão no customer Mercado Pago",
        step: "save_card",
        reason_code: "MP_SAVE_CARD_FAILED",
        trace_id: traceId,
        status_code: 502,
        details: cardData,
      }, 502);
    }

    return json({
      success: true,
      card_id: String(cardData.id),
      creditCardToken: String(cardData.id),
      mp_payment_method_id: clean(cardData?.payment_method?.id),
      brand: clean(cardData?.payment_method?.name) || clean(cardData?.payment_method?.id) || "Cartão",
      last4: clean(cardData?.last_four_digits) || number.slice(-4),
      step: "completed",
      trace_id: traceId,
    });
  } catch (error: any) {
    return json({
      error: error?.message ?? "Falha ao tokenizar cartão",
      step: "internal_error",
      reason_code: "UNHANDLED_EXCEPTION",
      trace_id: traceId,
      status_code: 500,
    }, 500);
  }
});
