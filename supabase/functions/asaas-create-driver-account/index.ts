import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  corsHeaders,
  getAuthenticatedUser,
  json,
} from "../_shared/auth.ts";
import { resolveSubaccountAccessToken } from "../_shared/asaas_subaccount_token.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("🔧 [EnvCheck] PROJECT_URL set:", !!Deno.env.get("PROJECT_URL"));
    console.log("🔧 [EnvCheck] SUPABASE_URL set:", !!Deno.env.get("SUPABASE_URL"));
    console.log(
      "🔧 [EnvCheck] PROJECT_SERVICE_KEY set:",
      !!Deno.env.get("PROJECT_SERVICE_KEY"),
    );
    console.log(
      "🔧 [EnvCheck] SUPABASE_SERVICE_ROLE_KEY set:",
      !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    );
    console.log(
      "🔧 [EnvCheck] PROJECT_ANON_KEY set:",
      !!Deno.env.get("PROJECT_ANON_KEY"),
    );
    console.log(
      "🔧 [EnvCheck] SUPABASE_ANON_KEY set:",
      !!Deno.env.get("SUPABASE_ANON_KEY"),
    );

    const payload = await req.json();
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;

    const admin = auth.admin;
    const appUser = auth.appUser;
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    const ASAAS_URL = Deno.env.get("ASAAS_URL") || "https://sandbox.asaas.com/api/v3";
    const ASAAS_PROXY_URL = String(Deno.env.get("ASAAS_PROXY_URL") ?? "").trim();
    const ASAAS_PROXY_INTERNAL_KEY = String(
      Deno.env.get("ASAAS_PROXY_INTERNAL_KEY") ?? "",
    ).trim();

    if (!ASAAS_API_KEY) {
      console.error("❌ [Asaas] ASAAS_API_KEY não configurado");
      return json({ error: "ASAAS_API_KEY não configurado" }, 500);
    }

    const callAsaas = async (
      path: string,
      init: {
        method?: "GET" | "POST" | "PATCH";
        body?: Record<string, unknown>;
      } = {},
    ) => {
      const method = init.method ?? "GET";
      const usingProxy = ASAAS_PROXY_URL.length > 0 && ASAAS_PROXY_INTERNAL_KEY.length > 0;
      const base = usingProxy
        ? `${ASAAS_PROXY_URL.replace(/\/+$/, "")}/asaas`
        : ASAAS_URL;
      const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (usingProxy) {
        headers["x-internal-key"] = ASAAS_PROXY_INTERNAL_KEY;
      } else {
        headers["access_token"] = ASAAS_API_KEY;
      }

      return await fetch(url, {
        method,
        headers,
        body: init.body ? JSON.stringify(init.body) : undefined,
      });
    };

    const { driver_id, latitude, longitude, city: reqCity, state: reqState } = payload;
    const appUserRole = String(appUser?.role ?? "").toLowerCase();
    const authenticatedUserId = Number(appUser?.id ?? NaN);
    const requestedDriverId = Number(driver_id ?? authenticatedUserId);
    const isServiceContext = appUserRole === "service_role";

    if (!isServiceContext && appUserRole !== "driver" && appUserRole !== "provider") {
      return json(
        {
          error: "Apenas motoristas podem provisionar conta Asaas",
          step: "authorize_driver_scope",
          reason_code: "ROLE_NOT_ALLOWED",
          status_code: 403,
        },
        403,
      );
    }

    if (!Number.isFinite(requestedDriverId) || requestedDriverId <= 0) {
      return json(
        {
          error: "driver_id inválido ou ausente",
          step: "validate_input",
          reason_code: "INVALID_DRIVER_ID",
          status_code: 400,
        },
        400,
      );
    }

    if (
      !isServiceContext &&
      Number.isFinite(authenticatedUserId) &&
      requestedDriverId !== authenticatedUserId
    ) {
      return json(
        {
          error: "Sem permissão para provisionar conta de outro motorista",
          step: "authorize_driver_scope",
          reason_code: "DRIVER_SCOPE_DENIED",
          status_code: 403,
        },
        403,
      );
    }

    const idToProcess = requestedDriverId;
    const dbUserId = requestedDriverId;
    if (!Number.isFinite(dbUserId) || dbUserId <= 0) {
      return json(
        {
          error: "driver_id inválido ou ausente",
          step: "validate_input",
          reason_code: "INVALID_DRIVER_ID",
          status_code: 400,
        },
        400,
      );
    }

    console.log(`🏦 [Asaas] Iniciando provisionamento para motorista ID: ${idToProcess}`);

    const syncPaymentAccount = async (
      walletId: string,
      opts?: { subaccountApiKey?: string; source?: string; accountId?: string },
    ) => {
      const { data: existing, error: existingErr } = await admin
        .from("payment_accounts")
        .select("metadata, asaas_access_token")
        .eq("user_id", dbUserId)
        .eq("gateway_name", "asaas")
        .maybeSingle();

      if (existingErr) {
        console.warn("⚠️ [Asaas] Falha ao buscar payment_accounts atual:", existingErr.message);
      }

      const metadata =
        existing && typeof existing.metadata === "object" && existing.metadata !== null
          ? { ...existing.metadata }
          : {};

      const token = String(opts?.subaccountApiKey ?? "").trim();
      if (token) {
        metadata.subaccount_api_key = token;
        metadata.subaccount_api_key_source = String(opts?.source ?? "account_creation");
        metadata.subaccount_api_key_updated_at = new Date().toISOString();
        if ("subaccount_api_key_invalidated_at" in metadata) {
          delete metadata.subaccount_api_key_invalidated_at;
        }
      }

      const finalToken = token || String(existing?.asaas_access_token ?? "").trim();

      await admin.from("payment_accounts").upsert(
        {
          user_id: dbUserId,
          gateway_name: "asaas",
          external_id: String(opts?.accountId ?? existing?.external_id ?? walletId),
          wallet_id: walletId,
          status: "active",
          metadata,
          asaas_access_token: finalToken || undefined,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,gateway_name" },
      );
    };


    const warmSubaccountToken = async (walletId: string) => {
      const tokenResult = await resolveSubaccountAccessToken({
        admin,
        userId: dbUserId,
        walletId,
        asaasUrl: ASAAS_URL,
        platformApiKey: ASAAS_API_KEY,
        tokenNamePrefix: "driver-onboarding",
      });
      if (!tokenResult.ok) {
        console.warn(
          "⚠️ [Asaas] Conta vinculada, mas não foi possível pré-gerar token da subconta:",
          JSON.stringify(tokenResult.error),
        );
      }
    };

    // 1. Buscar perfil canônico do motorista (users)
    const { data: driver, error: driverError } = await admin
      .from("users")
      .select("*")
      .eq("id", idToProcess)
      .single();

    if (driverError || !driver) {
      console.error("❌ [Asaas] Super Perfil não encontrado:", driverError);
      return json({ error: "Perfil completo não encontrado. Tente ficar online para sincronizar." }, 404);
    }

    if (driver.asaas_wallet_id && driver.asaas_status === 'active') {
      console.log(`✅ [Asaas] Motorista já possui conta ativa: ${driver.asaas_wallet_id}`);
      await syncPaymentAccount(driver.asaas_wallet_id);
      await warmSubaccountToken(driver.asaas_wallet_id);
      return json({ 
        success: true, 
        walletId: driver.asaas_wallet_id, 
        message: "Conta já existe e está ativa" 
      });
    }

    // 2. Geocodificação Reversa (Manter apenas para atualizar o perfil, não enviar no payload)
    let city = reqCity || driver.city;
    let state = reqState || driver.state;

    if ((!city || city === "Não informado") && latitude && longitude) {
      const MAPBOX_TOKEN = Deno.env.get("MAPBOX_TOKEN");
      if (MAPBOX_TOKEN) {
        try {
          const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&types=place,region&limit=1&language=pt`;
          const geoRes = await fetch(mapboxUrl);
          const geoData = await geoRes.json();
          if (geoData.features && geoData.features.length > 0) {
            const feat = geoData.features[0];
            city = feat.text;
            const region = feat.context?.find((c: any) => c.id.startsWith('region'));
            state = region?.short_code?.includes('-') ? region.short_code.split('-')[1] : (region?.text || "MA");
          }
        } catch (e: any) {
          console.error("⚠️ [Geo] Erro na geocodificação:", e.message);
        }
      }
    }

    city = (city && city !== "Não informado") ? city : "Imperatriz";
    state = (state && state !== "Não informado") ? state : "MA";

    // 3. Validação e Tratamento de CEP (Único campo que define a cidade no Asaas)
    const rawCep = driver.postal_code?.replace(/\D/g, "") || "";
    let postalCode;

    const isValidCep = (cep: string) => cep.length === 8 && /^\d{8}$/.test(cep);

    if (isValidCep(rawCep)) {
      postalCode = rawCep;
    } else {
      // Em sandbox, usamos um CEP válido conhecido para evitar o erro de cidade
      postalCode = "01001000"; // CEP Praça da Sé, SP (Altamente confiável para testes)
      console.warn(`⚠️ [Asaas] CEP inválido ou ausente ("${rawCep}"), usando fallback sandbox: ${postalCode}`);
    }

    // 4. Validação de CPF/CNPJ e Telefone
    const rawCpfCnpj = driver.document_value?.replace(/\D/g, "") || "";
    if (rawCpfCnpj.length !== 11 && rawCpfCnpj.length !== 14) {
      return json({ error: "CPF ou CNPJ válido é obrigatório", details: `Formato inválido: ${driver.document_value}` }, 400);
    }

    const isSandbox = ASAAS_URL.includes("sandbox");

    const sanitizePhone = (p?: string) => {
      if (!p) return "";
      let cleaned = p.replace(/\D/g, "");
      if (cleaned.startsWith("55") && cleaned.length > 11) cleaned = cleaned.substring(2);
      
      // Garantir 11 dígitos para celular (DDD + 9 + 8 dígitos)
      if (cleaned.length === 10) {
        // Tenta inserir o '9' se for 10 dígitos (DDD + 8 dígitos)
        cleaned = cleaned.substring(0, 2) + "9" + cleaned.substring(2);
      } else if (cleaned.length === 11 && cleaned[2] !== '9') {
        // Se tem 11 dígitos mas o 3º dígito (início do número) não é 9,
        // pode ser que o usuário tenha digitado um número de 9 dígitos sem o 9 no lugar certo.
        // Em Sandbox, vamos forçar o 9 se possível.
        console.warn(`⚠️ [Asaas] Telefone de 11 dígitos sem o '9' na 3ª posição: ${cleaned}`);
        // Se for Sandbox, vamos usar um número de teste garantido se o atual for suspeito
        if (isSandbox) {
          return "11988887777";
        }
      }
      return cleaned;
    };

    let phone = sanitizePhone(driver.phone);

    // [Asaas Security] Fallback final para Sandbox se o telefone não for móvel válido
    if (isSandbox && (phone.length !== 11 || phone[2] !== '9')) {
      console.warn(`⚠️ [Asaas] Telefone "${phone}" inválido para Sandbox. Usando fallback garantido.`);
      phone = "11988887777";
    }

    // Validar número móvel brasileiro:
    const isValidPhone = (p: string) => p.length === 11 && p[2] === '9';
    
    if (!phone || phone.length < 10) {
      return json({
        error: "Celular obrigatório",
        details: "Informe seu número de celular nas configurações do perfil para ativar recebimentos.",
      }, 400);
    }

    if (!isValidPhone(phone)) {
      return json({
        error: "Número de celular inválido",
        details: "O número deve ter 10 ou 11 dígitos (DDD + telefone). Ex: 11987654321.",
      }, 400);
    }
    const personType = driver.person_type || (rawCpfCnpj.length === 11 ? 'PF' : 'PJ');

    // Payload para atualizar conta existente (dados que faltam). Não envia email para não sobrescrever o já cadastrado no Asaas.
    const buildUpdatePayload = () => ({
      name: driver.full_name,
      phone,
      mobilePhone: phone,
      address: driver.address || "Endereço não informado",
      addressNumber: driver.address_number || "S/N",
      province: driver.province || "Centro",
      postalCode,
    });

    const updateExistingAccount = async (
      walletId: string,
      source: string,
      accountId?: string,
    ) => {
      const updatePayload = buildUpdatePayload();
      console.log(`🔄 [Asaas] Atualizando conta existente (${source}) com dados atuais:`, updatePayload);
      const patchRes = await callAsaas(`/accounts/${walletId}`, {
        method: "PATCH",
        body: updatePayload,
      });
      if (!patchRes.ok) {
        const errBody = await patchRes.json();
        console.warn(`⚠️ [Asaas] PATCH conta falhou (continuando):`, errBody);
      }
      await admin.from("users").update({
        asaas_wallet_id: walletId,
        asaas_status: "active",
        city,
        state,
        postal_code: postalCode,
        updated_at: new Date().toISOString(),
      }).eq("id", idToProcess);
      await syncPaymentAccount(walletId, { accountId });
      await warmSubaccountToken(walletId);
      return json({ success: true, walletId, status: "active", message: "Conta atualizada e vinculada com sucesso" });
    };

    // 4.1 Prioridade 1: conta já vinculada ao usuário (por id) — só atualizar dados e reativar
    if (driver.asaas_wallet_id) {
      console.log(`🔍 [Asaas] Conta já vinculada ao usuário (id): ${driver.asaas_wallet_id}. Atualizando dados.`);
      return await updateExistingAccount(driver.asaas_wallet_id, "wallet_id");
    }

    // 4.2 Prioridade 2: buscar por externalReference (id do usuário)
    let checkRes = await callAsaas(
      `/accounts?externalReference=${encodeURIComponent(idToProcess)}`,
      { method: "GET" },
    );
    let checkData = await checkRes.json();
    let existingAccount = checkData.data && checkData.data.length > 0 ? checkData.data[0] : null;

    if (existingAccount) {
      const extCpf = String(existingAccount.cpfCnpj ?? "").replace(/\D/g, "");
      const extEmail = String(existingAccount.email ?? "").trim().toLowerCase();
      const drvCpf = String(rawCpfCnpj ?? "").replace(/\D/g, "");
      const drvEmail = String(driver.email ?? "").trim().toLowerCase();
      const consistentWithDriver =
        (drvCpf && extCpf && drvCpf === extCpf) ||
        (drvEmail && extEmail && drvEmail === extEmail);

      if (consistentWithDriver) {
        console.log(
          `✅ [Asaas] Conta encontrada por ID do usuário (externalReference) e validada por CPF/Email: ${existingAccount.walletId}`,
        );
        return await updateExistingAccount(
          existingAccount.walletId,
          "externalReference",
          String(existingAccount.id ?? ""),
        );
      }

      console.warn(
        `⚠️ [Asaas] Conta por externalReference inconsistente com motorista atual. Ignorando resultado para evitar vinculação cruzada.`,
        {
          returned_wallet: existingAccount.walletId,
          returned_email: existingAccount.email,
          returned_cpf: existingAccount.cpfCnpj,
          driver_email: driver.email,
          driver_cpf: rawCpfCnpj,
        },
      );
    }

    // 4.3 Prioridade 3: por CPF/CNPJ
    console.log(`🔍 [Asaas] Verificando se já existe conta para CPF/CNPJ: ${rawCpfCnpj}`);
    checkRes = await callAsaas(`/accounts?cpfCnpj=${rawCpfCnpj}`, {
      method: "GET",
    });
    checkData = await checkRes.json();
    existingAccount = checkData.data && checkData.data.length > 0 ? checkData.data[0] : null;

    if (!existingAccount) {
      console.log(`🔍 [Asaas] Não encontrado por CPF/CNPJ. Verificando por EMAIL: ${driver.email}`);
      checkRes = await callAsaas(
        `/accounts?email=${encodeURIComponent(driver.email)}`,
        { method: "GET" },
      );
      checkData = await checkRes.json();
      existingAccount = checkData.data && checkData.data.length > 0 ? checkData.data[0] : null;
    }

    if (existingAccount) {
      const walletId = existingAccount.walletId;
      console.log(`✅ [Asaas] Conta encontrada (CPF ou Email): ${walletId}. Atualizando dados (email existente preservado).`);
      return await updateExistingAccount(
        walletId,
        "cpf_or_email",
        String(existingAccount.id ?? ""),
      );
    }

    // 5. Montar Payload CONFORME DOCUMENTAÇÃO OFICIAL (v3)
    const accountPayload: any = {
      name: driver.full_name,
      email: driver.email,
      cpfCnpj: rawCpfCnpj,
      phone: phone,
      mobilePhone: phone,
      address: driver.address || "Endereço não informado",
      addressNumber: driver.address_number || "S/N",
      province: driver.province || "Centro",
      postalCode: postalCode, // A cidade será derivada automaticamente deste campo
      incomeValue: 2500,
      monthlyIncome: 2500,
      externalReference: idToProcess,
    };

    if (personType === 'PF' || personType === 'MEI') {
      accountPayload.birthDate = driver.birth_date;
      if (!accountPayload.birthDate) {
        return json({ error: "Data de nascimento é obrigatória para PF/MEI" }, 400);
      }
      if (personType === 'MEI') accountPayload.companyType = 'MEI';
    } else {
      accountPayload.companyType = driver.company_type || 'LIMITED';
    }

    console.log("📦 [Asaas] Payload Final (Cidade via CEP):", {
      postalCode: accountPayload.postalCode,
      addressNumber: accountPayload.addressNumber,
      province: accountPayload.province
    });

    console.log("🚀 [Asaas] Enviando payload para /v3/accounts:", JSON.stringify(accountPayload, null, 2));

    // 6. Chamada para API do Asaas (URL Limpa)
    const asaasResponse = await callAsaas("/accounts", {
      method: "POST",
      body: accountPayload,
    });

    const asaasData = await asaasResponse.json();

    if (!asaasResponse.ok) {
      console.error("❌ [Asaas] Erro na API:", JSON.stringify(asaasData, null, 2));
      const descriptions = (asaasData.errors || []).map((e: any) => e.description).filter(Boolean);
      const description = descriptions[0] || "Erro desconhecido na API do Asaas";
      const emailAlreadyInUse = descriptions.some((d: string) =>
        typeof d === "string" && (d.includes("já está em uso") || d.toLowerCase().includes("email") && d.toLowerCase().includes("uso"))
      );

      // Se o erro for "email já em uso", buscar conta por email, atualizar dados e vincular ao usuário (id)
      if (emailAlreadyInUse && driver.email) {
        try {
          const checkRes = await callAsaas(
            `/accounts?email=${encodeURIComponent(driver.email)}`,
            { method: "GET" },
          );
          const checkData = await checkRes.json();
          const existing = checkData.data && checkData.data.length > 0 ? checkData.data[0] : null;
          if (existing && existing.walletId) {
            console.log(`✅ [Asaas] Conta existente (email já em uso). Atualizando dados e vinculando ao usuário.`);
            return await updateExistingAccount(
              existing.walletId,
              "email_ja_em_uso",
              String(existing.id ?? ""),
            );
          }
        } catch (linkErr: any) {
          console.error("⚠️ [Asaas] Falha ao vincular conta existente:", linkErr.message);
        }
      }

      return json({ 
        error: "Erro na API do Asaas", 
        details: description, 
        fullError: asaasData,
        attemptedPayload: accountPayload 
      }, 400);
    }

    const walletId = String(asaasData.walletId ?? "").trim();
    const accountId = String(asaasData.id ?? "").trim();
    
    // 7. Atualizar o banco de dados
    await admin
      .from("users")
      .update({
        asaas_wallet_id: walletId,
        asaas_status: 'active',
        city,
        state,
        postal_code: postalCode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", idToProcess);

    const createdAccountApiKey = String(asaasData?.apiKey ?? "").trim();
    await syncPaymentAccount(walletId, {
      subaccountApiKey: createdAccountApiKey || undefined,
      source: createdAccountApiKey ? "account_creation" : undefined,
      accountId: accountId || undefined,
    });
    if (!createdAccountApiKey) {
      await warmSubaccountToken(walletId);
    } else {
      console.log("✅ [Asaas] apiKey da subconta salva em payment_accounts.metadata");
    }

    console.log(`✅ [Asaas] Conta criada: ${walletId}`);

    return json({ success: true, walletId: walletId, status: 'active' });

  } catch (error: any) {
    console.error("❌ [Asaas] CRITICAL ERROR:", error.message);
    return json({ error: error.message }, 500);
  }
});
