import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;

    const { admin, appUser } = auth;
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    const ASAAS_URL = Deno.env.get("ASAAS_URL") || "https://sandbox.asaas.com/api/v3";

    if (!ASAAS_API_KEY) {
      return json({ error: "ASAAS_API_KEY não configurado" }, 500);
    }

    const body = await req.json();
    const { action, name, email, cpfCnpj, phone: rawPhone, postalCode: rawPostalCode } = body;

    if (action !== 'create' && action !== 'update') {
        return json({ error: "Ação inválida. Use 'create' ou 'update'." }, 400);
    }

    const isSandbox = ASAAS_URL.includes("sandbox");

    // --- Sanitização e Validação ---

    const sanitizePhone = (p?: string) => {
      if (!p) return "";
      let cleaned = p.replace(/\D/g, "");
      if (cleaned.startsWith("55") && cleaned.length > 11) cleaned = cleaned.substring(2);
      
      // Garantir 11 dígitos para celular (DDD + 9 + 8 dígitos)
      if (cleaned.length === 10) {
        cleaned = cleaned.substring(0, 2) + "9" + cleaned.substring(2);
      } else if (cleaned.length === 11 && cleaned[2] !== '9') {
        if (isSandbox) return "11988887777";
      }
      return cleaned;
    };

    let phone = sanitizePhone(rawPhone || appUser?.phone);
    if (isSandbox && (phone.length !== 11 || phone[2] !== '9')) {
      phone = "11988887777";
    }

    const documentValue = cpfCnpj?.replace(/\D/g, "") || "";
    if (!documentValue && action === 'create') {
        return json({ error: "CPF ou CNPJ é obrigatório para criar um cliente." }, 400);
    }

    let postalCode = rawPostalCode?.replace(/\D/g, "");
    if (isSandbox && (!postalCode || postalCode.length !== 8)) {
        postalCode = "01001000"; // CEP da Praça da Sé (Válido)
    }

    console.log(`👤 [asaas-customer-manager] ${action.toUpperCase()} para: ${name || appUser?.full_name}`);

    // --- Chamada API Asaas ---

    const payload: any = {
      name: name || appUser?.full_name,
      email: email || appUser?.email,
      phone: phone, // Asaas às vezes aceita fixo aqui, mas mobilePhone é preferível para SMS
      mobilePhone: phone,
      cpfCnpj: documentValue,
      postalCode: postalCode,
      externalReference: appUser?.id?.toString(),
      notificationDisabled: true, // Evitar spam durante testes
    };

    // Remover campos vazios
    Object.keys(payload).forEach(key => (payload[key] === undefined || payload[key] === "") && delete payload[key]);

    let asaasCustomerId = appUser?.asaas_customer_id;
    let endpoint = `${ASAAS_URL}/customers`;
    let method = "POST";

    if (asaasCustomerId && action === 'update') {
        endpoint = `${ASAAS_URL}/customers/${asaasCustomerId}`;
    }

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ [asaas-customer-manager] Erro Asaas (${response.status}):`, data);
      return json({ 
          error: "Erro na API do Asaas", 
          details: data.errors?.[0]?.description || "Erro desconhecido",
          code: data.errors?.[0]?.code
      }, 400);
    }

    const newCustomerId = data.id;
    const isPassenger =
      appUser?.role !== "provider" && appUser?.role !== "driver";

    // Se for criação ou o ID for novo, atualizar no banco
    if (newCustomerId && newCustomerId !== asaasCustomerId) {
        console.log(`✅ [asaas-customer-manager] Novo Customer ID: ${newCustomerId}. Atualizando banco...`);
        const { error: updateError } = await admin
            .from("users")
            .update({
              asaas_customer_id: newCustomerId,
              ...(isPassenger ? { asaas_status: "active" } : {}),
            })
            .eq("id", appUser.id);
        
        if (updateError) {
            console.error("❌ [asaas-customer-manager] Erro ao salvar asaas_customer_id:", updateError);
        }

        try {
          await admin.from("payment_accounts").upsert(
            {
              user_id: appUser.id,
              gateway_name: "asaas",
              external_id: newCustomerId,
              ...(isPassenger ? { status: "active" } : {}),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,gateway_name" },
          );
        } catch (paymentAccErr) {
          console.warn(
            "⚠️ [asaas-customer-manager] Falha ao sincronizar payment_accounts:",
            paymentAccErr,
          );
        }

    }

    return json({
      success: true,
      id: newCustomerId,
      data: data
    });

  } catch (error: any) {
    console.error("❌ [asaas-customer-manager] CRITICAL ERROR:", error.message);
    return json({ error: error.message }, 500);
  }
});
