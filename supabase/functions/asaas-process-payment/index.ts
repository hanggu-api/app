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

function clean(str: unknown): string {
  return String(str ?? "").replace(/[\n\r\t]/g, " ").trim();
}

function digits(str: unknown): string {
  return String(str ?? "").replace(/\D/g, "");
}

function pickEstimatedCreditDate(payload: any): string | null {
  const raw =
    payload?.estimatedCreditDate ??
    payload?.creditDate ??
    payload?.estimatedCreditDateCustomer ??
    null;
  if (!raw) return null;
  const value = String(raw).trim();
  return value.length > 0 ? value : null;
}

function mapSettlementStatusFromAsaas(asaasStatusRaw: unknown): string {
  const asaasStatus = String(asaasStatusRaw ?? "").toLowerCase();
  if (asaasStatus === "received" || asaasStatus === "paid") return "settled";
  if (asaasStatus === "confirmed") return "pending_settlement";
  if (
    asaasStatus === "canceled" ||
    asaasStatus === "cancelled" ||
    asaasStatus === "overdue" ||
    asaasStatus === "refunded" ||
    asaasStatus === "deleted"
  ) {
    return "cancelled";
  }
  return "pending";
}

const ASAAS_REQUEST_TIMEOUT_MS = 60000;
const TRIP_RUNTIME_ENABLED = false;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let traceId = (req.headers.get("x-trace-id") || crypto.randomUUID()).trim();

  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;

    const { admin, appUser } = auth;
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    const ASAAS_URL = Deno.env.get("ASAAS_URL") || "https://sandbox.asaas.com/api/v3";
    const ASAAS_PROXY_URL = String(Deno.env.get("ASAAS_PROXY_URL") ?? "").trim();
    const ASAAS_PROXY_INTERNAL_KEY = String(Deno.env.get("ASAAS_PROXY_INTERNAL_KEY") ?? "").trim();
    const usingProxy = ASAAS_PROXY_URL.length > 0 && ASAAS_PROXY_INTERNAL_KEY.length > 0;

    const asaasBaseUrl = usingProxy
      ? `${ASAAS_PROXY_URL.replace(/\/+$/, "")}/asaas`
      : ASAAS_URL.replace(/\/+$/, "");

    if (!ASAAS_API_KEY) {
      return json({ error: "ASAAS_API_KEY não configurado" }, 500);
    }

    async function asaasRequest(path: string, init: RequestInit = {}) {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      const url = `${asaasBaseUrl}${normalizedPath}`;
      const method = init.method ?? "GET";
      const headers = new Headers(init.headers ?? {});

      if (!headers.has("Content-Type") && method !== "GET" && method !== "HEAD") {
        headers.set("Content-Type", "application/json");
      }

      if (usingProxy) {
        headers.set("x-internal-key", ASAAS_PROXY_INTERNAL_KEY);
      } else {
        headers.set("access_token", ASAAS_API_KEY!);
      }

      return await fetch(url, {
        ...init,
        method,
        headers,
        signal: init.signal ?? AbortSignal.timeout(ASAAS_REQUEST_TIMEOUT_MS),
      });
    }

    const body = await req.json();
    const { trip_id, creditCardToken } = body;
    let { payment_method } = body;
    traceId = String(req.headers.get("x-trace-id") || body?.trace_id || traceId).trim();
    const monitor = (step: string, details: Record<string, unknown> = {}) => {
      console.log(
        `📡 [CardMonitor] ${JSON.stringify({
          trace_id: traceId,
          step,
          ...details,
        })}`,
      );
    };
    const monitorDb = async (
      event: string,
      details: Record<string, unknown> = {},
      opts: {
        paymentId?: number | null;
        asaasPaymentId?: string | null;
        status?: string | null;
        billingType?: string | null;
        amount?: number | null;
      } = {},
    ) => {
      monitor(event, details);
      try {
        await admin.from("payment_transaction_logs").insert({
          trace_id: traceId,
          trip_id: trip_id ?? null,
          payment_id: opts.paymentId ?? null,
          asaas_payment_id: opts.asaasPaymentId ?? null,
          provider: "asaas",
          channel: "edge",
          event,
          status: opts.status ?? null,
          billing_type: opts.billingType ?? null,
          amount: opts.amount ?? null,
          payload: details,
        });
      } catch (e) {
        console.warn("⚠️ [CardMonitor] Falha ao persistir payment_transaction_logs:", e);
      }
    };

    const createAndPersistAsaasCustomer = async () => {
      const customerRes = await asaasRequest(`/customers`, {
        method: "POST",
        body: JSON.stringify({
          name: trip.client.full_name,
          email: trip.client.email,
          phone: trip.client.phone?.replace(/\D/g, ""),
          cpfCnpj: documentValue,
          externalReference: trip.client.id.toString(),
        }),
      });
      const customerData = await customerRes.json();

      await monitorDb("create_customer_response", {
        trip_id,
        status: customerRes.status,
        asaas_error: asaasErrorMessage(customerData),
      });

      if (!customerRes.ok) {
        return {
          ok: false,
          status: customerRes.status,
          data: customerData,
          asaasError: asaasErrorMessage(customerData),
        };
      }

      const newCustomerId = customerData?.id ? String(customerData.id) : "";
      if (!newCustomerId) {
        return {
          ok: false,
          status: 400,
          data: customerData,
          asaasError: "Resposta do Asaas sem id de cliente",
        };
      }

      await admin
        .from("users")
        .update({ asaas_customer_id: newCustomerId })
        .eq("id", trip.client.id);

      await admin.from("payment_accounts").upsert(
        {
          user_id: trip.client.id,
          gateway_name: "asaas",
          external_id: newCustomerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,gateway_name" },
      );

      return {
        ok: true,
        customerId: newCustomerId,
      };
    };

    await monitorDb("request_received", {
      trip_id,
      payment_method,
      has_credit_card_token: Boolean(creditCardToken && String(creditCardToken).trim().length > 0),
      using_proxy: usingProxy,
    });

    if (!TRIP_RUNTIME_ENABLED) {
      return json({
        error: "Fluxo de corrida desativado neste ambiente",
        step: "validate_input",
        trace_id: traceId,
        reason_code: "TRIP_RUNTIME_DISABLED",
      }, 410);
    }

    // Se vier payment_method_id (como enviado pela update-trip-status), mapear para o tipo interno
    const paymentMethodId = body.payment_method_id;
    if (!payment_method && paymentMethodId) {
      if (paymentMethodId.includes('card')) payment_method = 'credit_card';
      else if (paymentMethodId.includes('pix')) payment_method = 'pix';
    }

    if (!trip_id) {
      monitor("validate_input_failed", { reason: "missing_trip_id" });
      return json({ error: "trip_id é obrigatório", step: "validate_input", trace_id: traceId }, 400);
    }

    // 1. Buscar dados da viagem e passageiro
    const { data: trip, error: tripError } = await admin
      .from("trips")
      .select(`
        *,
        client:users!trips_client_id_fkey(id, email, full_name, phone, asaas_customer_id, document_type, document_value)
      `)
      .eq("id", trip_id)
      .single();

    if (tripError || !trip) {
      console.error("❌ [AsaasPayment] Corrida não encontrada:", tripError);
      monitor("load_trip_failed", {
        trip_id,
        db_error: tripError?.message ?? null,
      });
      return json({ error: "Corrida não encontrada", step: "load_trip", trace_id: traceId }, 404);
    }

    // 1b. Buscar dados do motorista (asaas_wallet_id) na fonte canônica (users)
    let driverProfile: any = null;
    if (trip.driver_id) {
      const { data: dp } = await admin
        .from("users")
        .select("id, asaas_wallet_id, full_name, document_value")
        .eq("id", trip.driver_id)
        .maybeSingle();
      driverProfile = dp;
    }

    // 2. Definir valores e Split (taxa dinâmica via uber_config com cap)
    const totalAmount = trip.fare_final ?? trip.fare_estimated ?? 0;
    if (!totalAmount || Number(totalAmount) <= 0) {
      monitor("validate_amount_failed", { trip_id, total_amount: totalAmount });
      return json({
        error: "Valor da viagem inválido para cobrança no Asaas.",
        step: "validate_amount",
        trace_id: traceId,
      }, 400);
    }

    let commissionRate = 0.15;
    let commissionCapEnabled = false;
    let commissionCapAmount = 0;
    let driverPaymentMode = "platform";
    let driverDailyFeeAmount = 0;

    const { data: cfg } = await admin
      .from("uber_config")
      .select("commission_rate, commission_cap_enabled, commission_cap_amount")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cfg?.commission_rate != null) {
      commissionRate = Number(cfg.commission_rate);
    }
    if (cfg?.commission_cap_enabled != null) {
      commissionCapEnabled = cfg.commission_cap_enabled === true;
    }
    if (cfg?.commission_cap_amount != null) {
      commissionCapAmount = Number(cfg.commission_cap_amount);
    }

    if (trip.driver_id) {
      const { data: driverUser } = await admin
        .from("users")
        .select("driver_payment_mode, driver_daily_fee_amount, driver_platform_tx_fee_rate")
        .eq("id", trip.driver_id)
        .maybeSingle();

      driverPaymentMode = (driverUser?.driver_payment_mode ?? "platform").toString().trim().toLowerCase();
      driverDailyFeeAmount = Number(driverUser?.driver_daily_fee_amount ?? 0);

      if (driverPaymentMode === "fixed") {
        commissionRate = 0;
      } else if (driverPaymentMode === "direct") {
        commissionRate = 0;
      } else if (driverUser?.driver_platform_tx_fee_rate != null && Number(driverUser.driver_platform_tx_fee_rate) > 0) {
        commissionRate = Number(driverUser.driver_platform_tx_fee_rate);
      }
    }

    let platformFee = Number((totalAmount * commissionRate).toFixed(2));

    if (driverPaymentMode === "fixed") {
      const fixedFee = Number(driverDailyFeeAmount.toFixed(2));
      platformFee = Number.isFinite(fixedFee) && fixedFee > 0 ? Math.min(fixedFee, totalAmount) : 0;
    } else if (driverPaymentMode === "direct") {
      platformFee = 0;
    }

    if (commissionCapEnabled && commissionCapAmount > 0 && trip.driver_id && driverPaymentMode === "platform") {
      const { data: summary } = await admin
        .from("driver_commission_summary")
        .select("total_commission_paid")
        .eq("user_id", trip.driver_id)
        .maybeSingle();
      const totalPaid = Number(summary?.total_commission_paid ?? 0);
      if (totalPaid >= commissionCapAmount) {
        platformFee = 0;
        commissionRate = 0;
      } else if (totalPaid + platformFee > commissionCapAmount) {
        platformFee = Number((commissionCapAmount - totalPaid).toFixed(2));
        commissionRate = totalAmount > 0 ? Number((platformFee / totalAmount).toFixed(4)) : 0;
      }
    }

    const driverAmount = Number((totalAmount - platformFee).toFixed(2));

    console.log(`💰 [AsaasPayment] Processando ${payment_method} para Viagem: ${trip_id}`);
    console.log(`📊 [AsaasPayment] Total: ${totalAmount}, Fee: ${platformFee}, Motorista: ${driverAmount}`);
    monitor("amounts_computed", {
      trip_id,
      payment_method,
      total_amount: totalAmount,
      platform_fee: platformFee,
      driver_amount: driverAmount,
    });

    // 3. Garantir Cliente no Asaas para o Passageiro
    let asaasCustomerId = trip.client?.asaas_customer_id;
    const documentValue = trip.client?.document_value?.replace(/\D/g, "");
    console.log(`👤 [AsaasPayment] Cliente: ${trip.client?.full_name}, CPF (limpo): ${documentValue ? documentValue.substring(0, 3) + '***' : 'AUSENTE'}`);

    if (!documentValue) {
      console.error("❌ [AsaasPayment] CPF/CNPJ ausente para o cliente:", trip.client?.id);
      monitor("ensure_customer_document_failed", {
        trip_id,
        client_id: trip.client?.id,
      });
      return json({
        error: "CPF ou CNPJ obrigatório para processar o pagamento no Asaas. Por favor, complete seu cadastro.",
        step: "ensure_customer_document",
        trace_id: traceId,
      }, 400);
    }

    if (!asaasCustomerId) {
      console.log(`🆕 [AsaasPayment] Criando novo cliente Asaas para: ${trip.client.full_name}`);
      const customerCreation = await createAndPersistAsaasCustomer();
      if (customerCreation.ok) {
        asaasCustomerId = customerCreation.customerId;
        console.log(`✅ [AsaasPayment] Cliente criado: ${asaasCustomerId}`);
      } else {
        console.error("❌ [AsaasPayment] Erro ao criar cliente:", customerCreation.data);
        return json({
          error: "Erro ao registrar cliente no Asaas",
          details: customerCreation.data,
          step: "create_customer",
          trace_id: traceId,
          asaas_error: customerCreation.asaasError,
        }, 400);
      }
    } else {
      // Proactive Update: Garantir que o Asaas tenha o CPF se já temos ele no banco
      console.log(`🔄 [AsaasPayment] Garantindo CPF sincronizado para cliente: ${asaasCustomerId}`);
      const updateRes = await asaasRequest(`/customers/${asaasCustomerId}`, {
        method: "POST",
        body: JSON.stringify({
          cpfCnpj: documentValue,
        }),
      });
      let updateErrorData: any = null;
      if (!updateRes.ok) {
        updateErrorData = await updateRes.json();
      }
      monitor("sync_customer_document_response", {
        trip_id,
        customer_id: asaasCustomerId,
        status: updateRes.status,
        asaas_error: asaasErrorMessage(updateErrorData),
      });

      if (!updateRes.ok) {
        const updateError = updateErrorData;
        console.error(`❌ [AsaasPayment] Erro ao sincronizar CPF do cliente ${asaasCustomerId}:`, updateError);
        // Se o erro for que o CPF é inválido ou já existe, precisamos avisar o usuário
        const errorDetail = updateError.errors?.[0]?.description ?? "Erro desconhecido ao atualizar CPF";
        if (updateRes.status === 400) {
          return json({
            error: "Erro ao validar seu CPF no Asaas",
            details: errorDetail,
            step: "sync_customer_document",
            trace_id: traceId,
          }, 400);
        }
      } else {
        console.log(`✅ [AsaasPayment] CPF sincronizado com sucesso para ${asaasCustomerId}`);
      }
    }

    // 4. Montar Payload de Cobrança com Split
    const paymentPayload: any = {
      customer: asaasCustomerId,
      billingType: payment_method === 'credit_card' ? 'CREDIT_CARD' : 'PIX',
      value: totalAmount,
      dueDate: new Date().toISOString().split('T')[0],
      description: `Intermed. [Play101]: ${clean(trip.pickup_address).slice(0, 30)} -> ${clean(trip.dropoff_address).slice(0, 30)}. De: ${trip.client.full_name} (${documentValue}) Para: ${driverProfile?.full_name ?? 'Motorista'} (${driverProfile?.document_value?.replace(/\D/g, "") ?? 'CPF n/a'})`.slice(0, 255),
      externalReference: trip_id,
    };

    // Configurar Split se tiver motorista e walletId
    if (driverProfile?.asaas_wallet_id) {
      paymentPayload.split = [{
        walletId: driverProfile.asaas_wallet_id,
        fixedValue: driverAmount, // Valor fixo para o motorista
      }];
      console.log(`🔗 [AsaasPayment] Split configurado para Wallet: ${driverProfile.asaas_wallet_id}`);
    } else {
      console.warn("⚠️ [AsaasPayment] Motorista sem asaas_wallet_id. Pagamento integral para a plataforma.");
    }

    let resolvedCardTokenSource: string | null = null;
    let resolvedCardMethodId: string | null = null;
    if (payment_method === 'credit_card') {
      let activeToken = String(creditCardToken ?? "").trim();
      let tokenSource = activeToken ? "request" : "";
      let resolvedMethodId: string | null = null;
      const tripMethodRaw = String(trip.payment_method_id ?? paymentMethodId ?? "").trim();
      const tripMethodRawLower = tripMethodRaw.toLowerCase();

      const { data: userMethods } = await admin
        .from("user_payment_methods")
        .select("id, is_default, asaas_card_token, stripe_payment_method_id, pagarme_card_id, created_at")
        .eq("user_id", trip.client_id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false, nullsFirst: false });

      // 2) Resolver token a partir do payment_method_id da trip.
      // Regra rígida: quando vier um UUID (id de user_payment_methods), usar somente o token desse id.
      if (!activeToken && tripMethodRaw && Array.isArray(userMethods) && userMethods.length > 0) {
        const isUuidLike = /^[0-9a-fA-F-]{32,36}$/.test(tripMethodRaw);
        const methodById = userMethods.find(
          (row: any) =>
            String(row?.id ?? "").trim().toLowerCase() === tripMethodRawLower,
        );

        if (methodById) {
          activeToken = String(methodById?.asaas_card_token ?? "").trim();
          resolvedMethodId = String(methodById?.id ?? "").trim() || null;
          if (activeToken) {
            tokenSource = "trip_payment_method_id_exact";
          } else {
            await monitorDb("resolve_card_token_failed", {
              trip_id,
              client_id: trip.client_id,
              trip_payment_method_id: tripMethodRaw || null,
              resolved_method_id: resolvedMethodId,
              reason_code: "CARD_METHOD_WITHOUT_TOKEN",
            }, {
              billingType: "CREDIT_CARD",
              amount: Number(totalAmount),
            });
            return json({
              error: "Cartão selecionado não possui token válido para cobrança.",
              step: "resolve_card_token",
              reason_code: "CARD_METHOD_WITHOUT_TOKEN",
              trace_id: traceId,
              diagnostics: {
                trip_payment_method_id: tripMethodRaw,
                resolved_method_id: resolvedMethodId,
              },
            }, 400);
          }
        } else if (isUuidLike) {
          // Se veio UUID da trip e não encontramos o método, não fazemos fallback para outro cartão.
          await monitorDb("resolve_card_token_failed", {
            trip_id,
            client_id: trip.client_id,
            trip_payment_method_id: tripMethodRaw || null,
            reason_code: "CARD_METHOD_ID_NOT_FOUND",
          }, {
            billingType: "CREDIT_CARD",
            amount: Number(totalAmount),
          });
          return json({
            error: "Cartão selecionado não foi encontrado para esta cobrança.",
            step: "resolve_card_token",
            reason_code: "CARD_METHOD_ID_NOT_FOUND",
            trace_id: traceId,
            diagnostics: {
              trip_payment_method_id: tripMethodRaw,
            },
          }, 400);
        } else {
          // Compatibilidade para cenários legados (token/id técnico salvo na trip)
          const methodRow = userMethods.find((row: any) => {
            const asaasToken = String(row?.asaas_card_token ?? "").trim().toLowerCase();
            const stripePm = String(row?.stripe_payment_method_id ?? "").trim().toLowerCase();
            const pagarmeId = String(row?.pagarme_card_id ?? "").trim().toLowerCase();
            return (
              asaasToken === tripMethodRawLower ||
              stripePm === tripMethodRawLower ||
              pagarmeId === tripMethodRawLower
            );
          });

          activeToken = String(methodRow?.asaas_card_token ?? "").trim();
          if (activeToken) {
            tokenSource = "trip_payment_method_legacy_match";
            resolvedMethodId = String(methodRow?.id ?? "").trim() || null;
          }
        }
      }

      // 3) Fallback para cartão default do usuário
      if (!activeToken && Array.isArray(userMethods) && userMethods.length > 0) {
        const savedCard = userMethods.find(
          (row: any) =>
            row?.is_default === true &&
            String(row?.asaas_card_token ?? "").trim().length > 0,
        );

        activeToken = String(savedCard?.asaas_card_token ?? "").trim();
        if (activeToken) {
          tokenSource = "default_saved_card";
          resolvedMethodId = String(savedCard?.id ?? "").trim() || null;
        }
      }

      // 4) Fallback final: qualquer cartão salvo com token válido (mais recente pela ordenação da query)
      if (!activeToken && Array.isArray(userMethods) && userMethods.length > 0) {
        const anySavedCard = userMethods.find(
          (row: any) => String(row?.asaas_card_token ?? "").trim().length > 0,
        );
        activeToken = String(anySavedCard?.asaas_card_token ?? "").trim();
        if (activeToken) {
          tokenSource = "any_saved_card";
          resolvedMethodId = String(anySavedCard?.id ?? "").trim() || null;
        }
      }

      if (!activeToken) {
        const methodsCount = Array.isArray(userMethods) ? userMethods.length : 0;
        const methodsWithToken = Array.isArray(userMethods)
          ? userMethods.filter((row: any) => String(row?.asaas_card_token ?? "").trim().length > 0).length
          : 0;
        const defaultWithToken = Array.isArray(userMethods)
          ? userMethods.filter(
              (row: any) =>
                row?.is_default === true &&
                String(row?.asaas_card_token ?? "").trim().length > 0,
            ).length
          : 0;
        const matchedById = Array.isArray(userMethods)
          ? userMethods.some(
              (row: any) =>
                String(row?.id ?? "").trim().toLowerCase() === tripMethodRawLower,
            )
          : false;

        monitor("resolve_card_token_failed", {
          trip_id,
          client_id: trip.client_id,
          trip_payment_method_id: tripMethodRaw || null,
          has_user_methods: Array.isArray(userMethods),
          user_methods_count: methodsCount,
          user_methods_with_asaas_token: methodsWithToken,
          user_default_with_asaas_token: defaultWithToken,
          matched_saved_method_by_id: matchedById,
          reason_code: "CARD_TOKEN_NOT_FOUND",
          resolved_method_id: resolvedMethodId,
        });
        return json({
          error: "Nenhum cartão válido encontrado para esta cobrança.",
          step: "resolve_card_token",
          reason_code: "CARD_TOKEN_NOT_FOUND",
          trace_id: traceId,
          diagnostics: {
            user_methods_count: methodsCount,
            user_methods_with_asaas_token: methodsWithToken,
            user_default_with_asaas_token: defaultWithToken,
            matched_saved_method_by_id: matchedById,
            resolved_method_id: resolvedMethodId,
          },
        }, 400);
      }
      paymentPayload.creditCardToken = activeToken;
      resolvedCardTokenSource = tokenSource;
      resolvedCardMethodId = resolvedMethodId;
      monitor("resolve_card_token_ok", {
        trip_id,
        source: tokenSource,
        trip_payment_method_id: tripMethodRaw || null,
        resolved_method_id: resolvedMethodId,
        reason_code: "CARD_TOKEN_RESOLVED",
        trace_id: traceId,
      });
    }

    // 5. Verificar se já existe uma cobrança para esta Trip (Evitar Duplicidade)
    const { data: existingPayment } = await admin
      .from("payments")
      .select("asaas_payment_id, amount, status, pix_payload, pix_qr_code")
      .eq("trip_id", trip_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let payData: any = null;
    let pixData: any = null;

    if (existingPayment?.asaas_payment_id) {
      console.log(`🔄 [AsaasPayment] Cobrança existente encontrada: ${existingPayment.asaas_payment_id}`);
      
      // Se o valor mudou (ex: corrida finalizou com valor diferente do estimado), tentar atualizar a cobrança
      const currentAmount = Number(existingPayment.amount ?? 0);
      if (currentAmount !== Number(totalAmount)) {
        console.log(`📈 [AsaasPayment] Atualizando valor: ${existingPayment.amount} -> ${totalAmount}`);
        const updateRes = await asaasRequest(`/payments/${existingPayment.asaas_payment_id}`, {
          method: "POST",
          body: JSON.stringify({
            value: totalAmount,
            ...(driverProfile?.asaas_wallet_id
              ? {
                  split: [
                    {
                      walletId: driverProfile.asaas_wallet_id,
                      fixedValue: driverAmount,
                    },
                  ],
                }
              : {}),
          }),
        });
        
        payData = await updateRes.json();
        monitor("update_existing_payment_response", {
          trip_id, 
          asaas_payment_id: existingPayment.asaas_payment_id,
          status: updateRes.status,
          asaas_error: asaasErrorMessage(payData),
        });
        
        if (updateRes.ok) {
          await admin.from("payments").update({
            amount: totalAmount,
            commission_amount: platformFee,
            commission_rate: commissionRate,
          }).eq("asaas_payment_id", existingPayment.asaas_payment_id);
          console.log("✅ [AsaasPayment] Valor atualizado com sucesso no Asaas e Banco.");
        } else {
          console.warn(`⚠️ [AsaasPayment] Falha ao atualizar valor no Asaas: ${payData.errors?.[0]?.description ?? 'Erro desconhecido'}`);
          console.log("🔄 [AsaasPayment] Usando dados persistidos como fallback.");
          
          // Fallback: Se não deu pra atualizar (ex: já paga ou mudou status), usamos o que temos no banco
          payData = { id: existingPayment.asaas_payment_id, status: existingPayment.status };
          if (existingPayment.pix_payload) {
            pixData = { 
              encodedImage: existingPayment.pix_qr_code, 
              payload: existingPayment.pix_payload 
            };
          }
        }
      } else {
        payData = { id: existingPayment.asaas_payment_id, status: existingPayment.status };
        if (existingPayment.pix_payload) {
          pixData = { 
            encodedImage: existingPayment.pix_qr_code, 
            payload: existingPayment.pix_payload 
          };
        }
      }
    } else {
      // Criar nova cobrança
      const payRes = await asaasRequest(`/payments`, {
        method: "POST",
        body: JSON.stringify(paymentPayload),
      });

      payData = await payRes.json();
      await monitorDb("create_payment_response", {
        trip_id,
        status: payRes.status,
        payment_method,
        asaas_payment_id: payData?.id ?? null,
        asaas_status: payData?.status ?? null,
        asaas_error: asaasErrorMessage(payData),
      }, {
        asaasPaymentId: payData?.id ?? null,
        status: String(payData?.status ?? "").toLowerCase(),
        billingType: payment_method === "credit_card" ? "CREDIT_CARD" : "PIX",
        amount: Number(totalAmount),
      });

      if (!payRes.ok) {
        const asaasErrorCode = String(payData?.errors?.[0]?.code ?? "").toLowerCase();

        if (payment_method === "credit_card" && asaasErrorCode === "invalid_customer") {
          await monitorDb("create_payment_invalid_customer_detected", {
            trip_id,
            asaas_payment_id: payData?.id ?? null,
            asaas_error: asaasErrorMessage(payData),
            asaas_error_code: asaasErrorCode,
            customer_before_recreate: paymentPayload.customer ?? null,
          }, {
            status: String(payData?.status ?? "").toLowerCase(),
            billingType: "CREDIT_CARD",
            amount: Number(totalAmount),
          });

          const recoveredCustomer = await createAndPersistAsaasCustomer();
          if (!recoveredCustomer.ok || !recoveredCustomer.customerId) {
            return json({
              error: "Cadastro de pagamento inconsistente no Asaas.",
              step: "recover_customer",
              reason_code: "CUSTOMER_REMOVED_RECREATE_FAILED",
              trace_id: traceId,
              asaas_error: recoveredCustomer.asaasError ?? "Falha ao recriar cliente removido.",
              details: recoveredCustomer.data ?? null,
              errors: recoveredCustomer.data?.errors ?? null,
            }, 400);
          }

          paymentPayload.customer = recoveredCustomer.customerId;
          const previousCustomerId = asaasCustomerId;
          await monitorDb("customer_recreated_after_invalid_customer", {
            trip_id,
            old_customer_id: previousCustomerId ?? null,
            new_customer_id: recoveredCustomer.customerId,
          }, {
            billingType: "CREDIT_CARD",
            amount: Number(totalAmount),
          });
          asaasCustomerId = recoveredCustomer.customerId;
          const { data: invalidatedCards, error: invalidateError } = await admin
            .from("user_payment_methods")
            .update({ asaas_card_token: null })
            .eq("user_id", trip.client_id)
            .not("asaas_card_token", "is", null)
            .select("id");

          await monitorDb("card_tokens_invalidated_after_customer_recreate", {
            trip_id,
            client_id: trip.client_id,
            invalidated_count: Array.isArray(invalidatedCards) ? invalidatedCards.length : 0,
            invalidate_error: invalidateError?.message ?? null,
          }, {
            billingType: "CREDIT_CARD",
            amount: Number(totalAmount),
          });

          return json({
            error: "Cadastro de pagamento atualizado. Recadastre seu cartão para continuar.",
            step: "resolve_card_token",
            reason_code: "CARD_REBIND_REQUIRED",
            trace_id: traceId,
            asaas_error: "Cliente Asaas recriado; token de cartão anterior foi invalidado.",
            details: {
              old_customer_id: previousCustomerId ?? null,
              new_customer_id: recoveredCustomer.customerId,
              invalidated_cards: Array.isArray(invalidatedCards) ? invalidatedCards.length : 0,
            },
          }, 400);
        } else if (payment_method === "credit_card" && asaasErrorCode === "invalid_creditcard") {
          await monitorDb("create_payment_invalid_credit_card_token_detected", {
            trip_id,
            asaas_payment_id: payData?.id ?? null,
            asaas_error: asaasErrorMessage(payData),
            asaas_error_code: asaasErrorCode,
            token_source: resolvedCardTokenSource,
            resolved_method_id: resolvedCardMethodId,
          }, {
            status: String(payData?.status ?? "").toLowerCase(),
            billingType: "CREDIT_CARD",
            amount: Number(totalAmount),
          });

          const rejectedToken = String(paymentPayload.creditCardToken ?? "").trim();
          const rejectedTokenLower = rejectedToken.toLowerCase();

          const { data: invalidatedRows, error: invalidateError } = await admin
            .from("user_payment_methods")
            .update({ asaas_card_token: null, is_default: false })
            .eq("user_id", trip.client_id)
            .eq("asaas_card_token", rejectedToken)
            .select("id");

          await monitorDb("invalid_card_token_invalidated", {
            trip_id,
            token_source: resolvedCardTokenSource,
            rejected_token_suffix: rejectedToken.slice(-8),
            resolved_method_id: resolvedCardMethodId,
            invalidated_rows: Array.isArray(invalidatedRows) ? invalidatedRows.length : 0,
            invalidate_error: invalidateError?.message ?? null,
          }, {
            billingType: "CREDIT_CARD",
            amount: Number(totalAmount),
          });

          const { data: freshMethods } = await admin
            .from("user_payment_methods")
            .select("id, is_default, asaas_card_token, created_at")
            .eq("user_id", trip.client_id)
            .order("is_default", { ascending: false })
            .order("created_at", { ascending: false, nullsFirst: false });

          const retryCandidate = Array.isArray(freshMethods)
            ? freshMethods.find((row: any) => {
                const candidateToken = String(row?.asaas_card_token ?? "").trim();
                if (!candidateToken) return false;
                return candidateToken.toLowerCase() != rejectedTokenLower;
              })
            : null;

          const retryToken = String(retryCandidate?.asaas_card_token ?? "").trim();
          const retryMethodId = String(retryCandidate?.id ?? "").trim();

          if (!retryToken) {
            return json({
              error: "Cartão selecionado não disponível para cobrança.",
              details: payData,
              step: "resolve_card_token",
              reason_code: "CARD_TOKEN_INVALID_OR_REVOKED",
              trace_id: traceId,
              asaas_error: asaasErrorMessage(payData),
              errors: payData?.errors ?? null,
              diagnostics: {
                rejected_method_id: resolvedCardMethodId,
                rejected_token_suffix: rejectedToken.slice(-8),
                retry_candidate_found: false,
              },
            }, 400);
          }

          const previousResolvedMethodId = resolvedCardMethodId;
          paymentPayload.creditCardToken = retryToken;
          resolvedCardTokenSource = "retry_after_invalid_card_token";
          resolvedCardMethodId = retryMethodId.length > 0 ? retryMethodId : null;
          await monitorDb("create_payment_retry_after_invalid_card_token", {
            trip_id,
            previous_method_id: previousResolvedMethodId,
            retry_method_id: resolvedCardMethodId,
            retry_token_suffix: retryToken.slice(-8),
          }, {
            billingType: "CREDIT_CARD",
            amount: Number(totalAmount),
          });

          const retryRes = await asaasRequest(`/payments`, {
            method: "POST",
            body: JSON.stringify(paymentPayload),
          });
          const retryData = await retryRes.json();
          await monitorDb("create_payment_retry_response", {
            trip_id,
            status: retryRes.status,
            payment_method,
            asaas_payment_id: retryData?.id ?? null,
            asaas_status: retryData?.status ?? null,
            asaas_error: asaasErrorMessage(retryData),
            token_source: resolvedCardTokenSource,
            resolved_method_id: resolvedCardMethodId,
          }, {
            asaasPaymentId: retryData?.id ?? null,
            status: String(retryData?.status ?? "").toLowerCase(),
            billingType: "CREDIT_CARD",
            amount: Number(totalAmount),
          });

          if (!retryRes.ok) {
            return json({
              error: "Erro ao processar pagamento no Asaas",
              details: retryData,
              step: "create_payment",
              reason_code: "ASAAS_PAYMENT_REJECTED",
              trace_id: traceId,
              asaas_error: asaasErrorMessage(retryData),
              errors: retryData?.errors ?? null,
            }, 400);
          }

          payData = retryData;
        } else {
        console.error("❌ [AsaasPayment] Erro na cobrança:", payData);
        return json({
          error: "Erro ao processar pagamento no Asaas",
          details: payData,
          step: "create_payment",
          reason_code: "ASAAS_PAYMENT_REJECTED",
          trace_id: traceId,
          asaas_error: asaasErrorMessage(payData),
          errors: payData?.errors ?? null,
        }, 400);
        }
      }

      // Registrar na tabela de pagamentos (novo registro)
      const asaasStatus = String(payData?.status ?? "").toLowerCase();
      const settlementStatus = mapSettlementStatusFromAsaas(asaasStatus);
      const estimatedCreditDate = pickEstimatedCreditDate(payData);

      await admin.from("payments").insert({
        trip_id: trip_id,
        user_id: trip.client_id,
        amount: totalAmount,
        status:
          payData.status === 'CONFIRMED' || payData.status === 'RECEIVED'
            ? 'paid'
            : 'pending',
        asaas_payment_id: payData.id,
        payment_method_id: payment_method,
        commission_amount: platformFee,
        commission_rate: commissionRate,
        billing_type: payment_method === 'credit_card' ? 'CREDIT_CARD' : 'PIX',
        asaas_status: asaasStatus || null,
        settlement_status: settlementStatus,
        estimated_credit_date: estimatedCreditDate,
      });
    }

    // Liquidação de Multas Pendentes (Novo)
    const asaasStatusUpper = String(payData?.status ?? "").toUpperCase();
    if (asaasStatusUpper === 'CONFIRMED' || asaasStatusUpper === 'RECEIVED') {
      const feeIds = trip.pending_fees_included;
      if (Array.isArray(feeIds) && feeIds.length > 0) {
        console.log(`💸 [Asaas-Process] Liquidando ${feeIds.length} multas para trip ${trip_id}`);
        for (const feeId of feeIds) {
          const { data: fee } = await admin
            .from("trip_cancellation_fees")
            .select("victim_driver_id, amount")
            .eq("id", feeId)
            .eq("status", "pending")
            .maybeSingle();

          if (fee) {
            await admin.from("trip_cancellation_fees").update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              new_trip_id: trip_id
            }).eq("id", feeId);

            await admin.from("payments").insert({
              user_id: fee.victim_driver_id,
              trip_id: trip_id,
              amount: fee.amount,
              status: 'paid',
              payment_method_id: 'CANCELLATION_CREDIT',
              provider: 'platform',
              billing_type: 'CREDIT',
              payout_status: 'pending'
            });
            console.log(`✅ [Asaas-Process] Multa de R$ ${fee.amount} repassada ao motorista ${fee.victim_driver_id}`);
          }
        }
      }
    }

    // 6. Tratar Resposta PIX (Gerar QR Code se for necessário e ainda não tivermos no fallback)
    if (payment_method === 'pix' && !pixData) {
      console.log(`📲 [AsaasPayment] Gerando novo QR Code PIX para: ${payData.id}`);
      const pixRes = await asaasRequest(`/payments/${payData.id}/pixQrCode`, {
        method: "GET",
      });
      pixData = await pixRes.json();
      monitor("pix_qrcode_response", {
        trip_id,
        asaas_payment_id: payData.id,
        status: pixRes.status,
        asaas_error: asaasErrorMessage(pixData),
      });

      if (pixRes.ok) {
        // Persistir payload para fallback futuro
        await admin.from("payments").update({
          pix_payload: pixData.payload,
          pix_qr_code: pixData.encodedImage
        }).eq("asaas_payment_id", payData.id);
        console.log("💾 [AsaasPayment] Dados PIX persistidos para fallback.");
      }
    }

    if (payment_method === "credit_card") {
      const invoiceRef =
        payData?.invoiceUrl ??
        payData?.invoiceNumber ??
        payData?.bankSlipUrl ??
        payData?.id ??
        "N/A";
      const asaasStatus = String(payData?.status ?? "unknown");
      const estimatedCreditDate = pickEstimatedCreditDate(payData) ?? "N/A";
      console.log(
        `✅ [AsaasCard] Pagamento com cartão realizado com sucesso | trip=${trip_id} | payment_id=${payData?.id ?? "N/A"} | status=${asaasStatus} | fatura=${invoiceRef} | repasse_previsto=${estimatedCreditDate}`,
      );
      await monitorDb("card_payment_success", {
        trip_id,
        payment_id: payData?.id ?? null,
        asaas_status: asaasStatus,
        invoice_ref: invoiceRef,
        estimated_credit_date: estimatedCreditDate,
      }, {
        asaasPaymentId: payData?.id ?? null,
        status: asaasStatus.toLowerCase(),
        billingType: "CREDIT_CARD",
        amount: Number(totalAmount),
      });
    }

    await monitorDb("response_success", {
      trip_id,
      asaas_payment_id: payData?.id ?? null,
      asaas_status: payData?.status ?? null,
      payment_method,
    }, {
      asaasPaymentId: payData?.id ?? null,
      status: String(payData?.status ?? "").toLowerCase(),
      billingType: payment_method === "credit_card" ? "CREDIT_CARD" : "PIX",
      amount: Number(totalAmount),
    });

    return json({
      success: true,
      paymentId: payData.id,
      status: payData.status,
      pix: pixData,
      invoiceUrl: payData.invoiceUrl,
      trace_id: traceId,
      step: "completed",
    });

  } catch (error: any) {
    console.error("❌ [AsaasPayment] CRITICAL ERROR:", error.message);
    return json({
      error: "Erro interno ao processar pagamento no Asaas.",
      details: error.message,
      step: "internal_error",
      trace_id: traceId,
    }, 500);
  }
});
