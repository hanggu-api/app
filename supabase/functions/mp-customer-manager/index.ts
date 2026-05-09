import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function digits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function nonEmpty(value: unknown): string | null {
  const v = clean(value);
  return v.length > 0 ? v : null;
}

function safePersonNamePart(value: string, fallback: string): string {
  const v = clean(value)
    // Keep letters/spaces only (MP is strict with names)
    .replace(/[^\p{L}\s'-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const out = v.length >= 2 ? v : fallback;
  return out.slice(0, 60);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;
    const { admin, appUser } = auth;

    const isServiceRole = appUser?.id === "service_role";
    const body = await req.json().catch(() => ({}));
    const action = clean(body?.action || "ensure_customer").toLowerCase();

    // Permitir passar userId no body se for service_role
    let userId = Number(appUser?.id ?? NaN);
    if (isServiceRole && body?.userId) {
      userId = Number(body.userId);
    }

    if (!Number.isFinite(userId)) {
      return json(
        {
          error: "Usuário inválido ou não informado no body para service_role",
          step: "authenticate",
          reason_code: "INVALID_USER",
        },
        401,
      );
    }

    const MP_ACCESS_TOKEN =
      Deno.env.get("MP_ACCESS_TOKEN") ?? Deno.env.get("MP_ACCESS_TOKEN_SANDBOX");
    if (!MP_ACCESS_TOKEN) {
      return json(
        {
          error: "MP_ACCESS_TOKEN não configurado (nem MP_ACCESS_TOKEN_SANDBOX)",
          step: "validate_env",
          reason_code: "MISSING_MP_ACCESS_TOKEN",
        },
        500,
      );
    }

    const profile = await admin
      .from("users")
      .select("id, full_name, email, phone, document_value")
      .eq("id", userId)
      .maybeSingle();

    if (!profile.data) {
      return json(
        {
          error: "Perfil não encontrado",
          step: "load_user",
          reason_code: "USER_NOT_FOUND",
        },
        404,
      );
    }

    const name = nonEmpty(body?.name) || clean(profile.data.full_name) || "Cliente";
    const email = nonEmpty(body?.email) || clean(profile.data.email) || undefined;
    const phone = digits(body?.phone) || digits(profile.data.phone) || undefined;
    const cpf = digits(body?.cpfCnpj) || digits(profile.data.document_value) || undefined;

    const existing = await admin
      .from("payment_accounts")
      .select("id, external_id")
      .eq("user_id", userId)
      .eq("gateway_name", "mercado_pago")
      .maybeSingle();

    if (existing.data?.external_id) {
      return json({
        success: true,
        customer_id: existing.data.external_id,
        source: "payment_accounts",
      });
    }

    // 1. Tentar buscar cliente existente no Mercado Pago pelo e-mail
    if (email) {
      console.log(`🔍 [CUSTOMER-MGR] Buscando cliente por e-mail: ${email}`);
      const searchResponse = await fetch(`https://api.mercadopago.com/v1/customers/search?email=${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      });
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.results && searchData.results.length > 0) {
          const mpCustomer = searchData.results[0];
          console.log(`✅ [CUSTOMER-MGR] Cliente encontrado no MP: ${mpCustomer.id}`);
          
          // Salvar localmente e retornar
          await admin.from("payment_accounts").upsert({
            user_id: userId,
            gateway_name: "mercado_pago",
            external_id: String(mpCustomer.id),
            status: "active",
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,gateway_name" });

          return json({
            success: true,
            customer_id: String(mpCustomer.id),
            source: "mercado_pago_search",
          });
        }
      }
    }

    // 2. Se não encontrou, criar novo
    console.log(`➕ [CUSTOMER-MGR] Criando novo cliente no Mercado Pago para userId: ${userId}`);
    const phoneFull = digits(body?.phone) || digits(profile.data.phone) || "";
    let phoneObj: { area_code: string, number: string } | undefined = undefined;
    if (phoneFull.length >= 10) {
      phoneObj = {
        area_code: phoneFull.substring(0, 2),
        number: phoneFull.substring(2)
      };
    }

    const firstName = name.split(" ").slice(0, 1).join(" ") || "Cliente";
    let lastName = name.split(" ").slice(1).join(" ") || "Sobrenome";
    if (lastName.length < 2) lastName = lastName + " Cliente";

    const payload: Record<string, unknown> = {
      description: `cliente_${userId}`,
      first_name: safePersonNamePart(firstName, "Cliente"),
      last_name: safePersonNamePart(lastName, "Cliente"),
    };
    if (email) payload.email = email;
    if (phoneObj) payload.phone = phoneObj;
    if (cpf) payload.identification = { type: "CPF", number: cpf };

    const response = await fetch("https://api.mercadopago.com/v1/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data?.id) {
      console.error("❌ [CUSTOMER-MGR] Erro na criação Mercado Pago:", data);
      const status = response.status >= 400 && response.status <= 599
        ? response.status
        : 502;
      return json(
        {
          error: "Falha ao criar customer no Mercado Pago",
          step: "create_customer",
          reason_code: "MP_CUSTOMER_CREATE_FAILED",
          details: data,
          sent_payload: payload,
          mp_status: response.status
        },
        status,
      );
    }

    await admin.from("payment_accounts").upsert(
      {
        user_id: userId,
        gateway_name: "mercado_pago",
        external_id: String(data.id),
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,gateway_name" },
    );

    return json({
      success: true,
      customer_id: String(data.id),
      source: "mercado_pago",
    });
  } catch (error: any) {
    return json(
      {
        error: error?.message ?? "Falha no customer manager Mercado Pago",
        step: "internal_error",
        reason_code: "UNEXPECTED_EXCEPTION",
      },
      500,
    );
  }
});
