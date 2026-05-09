import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const url = new URL(req.url);
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // ─────────────────────────────────────────────────────────────────────────
    // ROTA 1: POST /payments (processo de pagamento pelo app)
    // ─────────────────────────────────────────────────────────────────────────
    if (req.method === 'POST' && !url.searchParams.has('webhook')) {
        const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
        if (!MP_ACCESS_TOKEN) {
            return json({ success: false, error: 'MP_ACCESS_TOKEN não configurado' }, 500);
        }

        let body: Record<string, unknown>;
        try {
            body = await req.json();
        } catch {
            return json({ success: false, error: 'JSON inválido' }, 400);
        }

        const {
            transaction_amount,
            token,
            description,
            installments,
            payment_method_id,
            payer,
            service_id,
            device_id,
            issuer_id,
            payment_type,
        } = body as Record<string, unknown>;

        if (!transaction_amount || !token || !service_id) {
            return json({ success: false, error: 'Campos obrigatórios: transaction_amount, token, service_id' }, 400);
        }

        // Montar payload para o MP
        const mpPayload: Record<string, unknown> = {
            transaction_amount: Number(transaction_amount),
            token,
            description: description ?? 'Pagamento Serviço',
            installments: Number(installments ?? 1),
            payment_method_id,
            payer,
        };
        if (issuer_id) mpPayload.issuer_id = issuer_id;
        if (device_id) mpPayload.metadata = { device_id };

        console.log(`[payments] Processando pagamento serviceId=${service_id} amount=${transaction_amount}`);

        // Chamar API do Mercado Pago
        const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                'X-Idempotency-Key': `srvc-${service_id}-${Date.now()}`,
            },
            body: JSON.stringify(mpPayload),
        });

        const mpData = await mpRes.json() as Record<string, unknown>;
        console.log(`[payments] MP status=${mpData.status} id=${mpData.id}`);

        if (!mpRes.ok || (mpData.status !== 'approved' && mpData.status !== 'in_process' && mpData.status !== 'pending')) {
            // Falha definitiva
            const cause = (mpData.cause as Array<{ description?: string }>)?.[0]?.description
                ?? mpData.message
                ?? 'Pagamento recusado';
            return json({ success: false, error: cause }, 400);
        }

        // Salvar pagamento no Supabase
        const { error: dbError } = await supabase.from('payments').upsert({
            id: String(mpData.id),
            service_id: String(service_id),
            status: mpData.status,
            amount: Number(transaction_amount),
            payment_method: payment_method_id,
            payment_type: payment_type ?? mpData.payment_type_id,
            mp_response: mpData,
            created_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        if (dbError) {
            console.error('[payments] Erro ao salvar payment no DB:', dbError);
            // Não falhamos a resposta — o pagamento foi aprovado, log do erro
        }

        // Se aprovado, atualizar status do serviço
        if (mpData.status === 'approved') {
            await supabase
                .from('service_requests')
                .update({ payment_status: 'paid', status: 'accepted' })
                .eq('id', String(service_id));
        }

        return json({
            success: true,
            payment: {
                id: mpData.id,
                status: mpData.status,
                status_detail: mpData.status_detail,
                payment_method_id,
                transaction_amount,
            },
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ROTA 2: POST /payments?webhook=1  (Webhook do Mercado Pago)
    // ─────────────────────────────────────────────────────────────────────────
    if (req.method === 'POST' && url.searchParams.has('webhook')) {
        const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
        if (!MP_ACCESS_TOKEN) return json({ received: true }); // Aceitar mesmo sem token configurado

        const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET');

        // — Verificar assinatura HMAC (opcional mas recomendado) —
        if (MP_WEBHOOK_SECRET) {
            const signature = req.headers.get('x-signature') ?? '';
            const requestId = req.headers.get('x-request-id') ?? '';
            const ts = signature.match(/ts=(\d+)/)?.[1] ?? '';
            const v1 = signature.match(/v1=([a-f0-9]+)/)?.[1] ?? '';

            if (!ts || !v1) {
                return json({ error: 'Assinatura inválida' }, 401);
            }

            const cloned = req.clone();
            const rawBody = await cloned.text();
            const manifest = `id:${url.searchParams.get('data.id') ?? ''};request-id:${requestId};ts:${ts};`;
            const key = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(MP_WEBHOOK_SECRET),
                { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
            );
            const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
            const expected = Array.from(new Uint8Array(sigBytes)).map(b => b.toString(16).padStart(2, '0')).join('');

            if (v1 !== expected) {
                console.warn('[payments/webhook] Assinatura inválida - rejeitando');
                return json({ error: 'Assinatura inválida' }, 401);
            }
        }

        // Parsear o corpo do webhook
        let webhookBody: Record<string, unknown>;
        try {
            const rawText = await req.text();
            webhookBody = JSON.parse(rawText) as Record<string, unknown>;
        } catch {
            return json({ received: true }); // MP espera 200 mesmo em erro
        }

        const type = webhookBody.type as string;
        const dataId = (webhookBody.data as Record<string, unknown>)?.id as string;

        console.log(`[payments/webhook] type=${type} id=${dataId}`);

        // Só processar eventos de pagamento
        if (type !== 'payment' || !dataId) {
            return json({ received: true });
        }

        // Buscar detalhes do pagamento no MP
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
            headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
        });
        const mpPayment = await mpRes.json() as Record<string, unknown>;

        const status = mpPayment.status as string;
        const serviceId = (mpPayment.metadata as Record<string, unknown>)?.service_id as string
            ?? (mpPayment.external_reference as string);

        console.log(`[payments/webhook] paymentId=${dataId} status=${status} serviceId=${serviceId}`);

        // Atualizar pagamento no DB
        await supabase.from('payments').upsert({
            id: String(dataId),
            service_id: serviceId ?? null,
            status,
            amount: mpPayment.transaction_amount,
            payment_method: mpPayment.payment_method_id,
            mp_response: mpPayment,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        // Atualizar serviço se tiver serviceId
        if (serviceId) {
            if (status === 'approved') {
                await supabase
                    .from('service_requests')
                    .update({ payment_status: 'paid', status: 'accepted' })
                    .eq('id', serviceId);
            } else if (status === 'rejected' || status === 'cancelled') {
                await supabase
                    .from('service_requests')
                    .update({ payment_status: 'failed' })
                    .eq('id', serviceId);
            }
        }

        return json({ received: true });
    }

    return json({ error: 'Rota não encontrada' }, 404);
});
