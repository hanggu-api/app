import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

const supabaseAdmin = () => createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Raio de busca inicial e incremento por round
const SEARCH_RADIUS_KM = [5, 10, 20, 50];
const NOTIFY_TIMEOUT_SECONDS = 30; // quanto tempo o prestador tem para aceitar

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const supabase = supabaseAdmin();
    let body: Record<string, unknown>;

    try {
        body = await req.json();
    } catch {
        return json({ error: 'JSON inválido' }, 400);
    }

    const { serviceId, action } = body as { serviceId?: string; action?: string };

    if (!serviceId) return json({ error: 'serviceId é obrigatório' }, 400);

    // ─────────────────────────────────────────────────────────────────────────
    // Buscar dados do serviço
    // ─────────────────────────────────────────────────────────────────────────
    const { data: service, error: sErr } = await supabase
        .from('service_requests_new')
        .select('id, status, profession_id, latitude, longitude, dispatch_round, dispatch_started_at')
        .eq('id', serviceId)
        .single();

    if (sErr || !service) {
        return json({ error: 'Serviço não encontrado' }, 404);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AÇÃO: start_dispatch — inicia o processo de busca por prestadores
    // ─────────────────────────────────────────────────────────────────────────
    if (!action || action === 'start_dispatch') {
        console.log(`[dispatch] Iniciando dispatch para serviço ${serviceId}`);

        // Registrar log
        await logEvent(supabase, serviceId, 'DISPATCH_STARTED', 'Buscando prestadores próximos...');

        // Atualizar estado do serviço
        await supabase
            .from('service_requests_new')
            .update({
                status: 'searching',
                dispatch_round: 0,
                dispatch_started_at: new Date().toISOString(),
            })
            .eq('id', serviceId);

        // Buscar e notificar prestadores no round 0
        const notified = await notifyNearbyProviders(supabase, service, 0);

        return json({ success: true, round: 0, notified });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AÇÃO: next_round — chamado pelo cron/timeout quando ninguém aceitou
    // ─────────────────────────────────────────────────────────────────────────
    if (action === 'next_round') {
        const currentRound = (service.dispatch_round as number) ?? 0;
        const nextRound = currentRound + 1;

        // Se esgotou todos os raios, marcar como open_for_schedule
        if (nextRound >= SEARCH_RADIUS_KM.length) {
            console.log(`[dispatch] Serviço ${serviceId} sem prestadores → open_for_schedule`);

            await supabase
                .from('service_requests_new')
                .update({ status: 'open_for_schedule' })
                .eq('id', serviceId);

            await logEvent(supabase, serviceId, 'OPEN_FOR_SCHEDULE',
                'Nenhum prestador disponível no momento. Serviço disponível para agendamento.');

            return json({ success: true, status: 'open_for_schedule' });
        }

        console.log(`[dispatch] Próximo round (${nextRound}) para serviço ${serviceId}`);
        await logEvent(supabase, serviceId, 'DISPATCH_TIMEOUT',
            `Expandindo busca... (raio: ${SEARCH_RADIUS_KM[nextRound]}km)`);

        await supabase
            .from('service_requests_new')
            .update({ dispatch_round: nextRound })
            .eq('id', serviceId);

        const notified = await notifyNearbyProviders(supabase, service, nextRound);
        return json({ success: true, round: nextRound, notified });
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function logEvent(
    supabase: ReturnType<typeof createClient>,
    serviceId: string,
    eventType: string,
    message: string,
) {
    await supabase.from('service_logs').insert({
        service_id: serviceId,
        event_type: eventType,
        message,
        created_at: new Date().toISOString(),
    });
}

async function notifyNearbyProviders(
    supabase: ReturnType<typeof createClient>,
    service: Record<string, unknown>,
    round: number,
): Promise<number> {
    const serviceId = service.id as string;
    const lat = service.latitude as number;
    const lon = service.longitude as number;
    const professionId = service.profession_id as number;
    const radiusKm = SEARCH_RADIUS_KM[round];

    // Buscar prestadores disponíveis dentro do raio (via Haversine puro SQL)
    const { data: providers, error } = await supabase.rpc('find_nearby_providers', {
        p_lat: lat,
        p_lon: lon,
        p_radius_km: radiusKm,
        p_profession_id: professionId,
    });

    if (error || !providers || providers.length === 0) {
        console.log(`[dispatch] Nenhum prestador no raio ${radiusKm}km (round ${round})`);
        await logEvent(supabase, serviceId, 'PROVIDER_NOT_FOUND',
            `Nenhum prestador disponível em ${radiusKm}km. Buscando mais longe...`);
        return 0;
    }

    console.log(`[dispatch] ${providers.length} prestadores encontrados no raio ${radiusKm}km`);

    // Notificar cada prestador via FCM Cloud Function (usando pg_net via DB ou HTTP direto)
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const PUSH_FN_URL = `${SUPABASE_URL}/functions/v1/push-notifications`;

    let notifiedCount = 0;

    for (const provider of providers as Array<Record<string, unknown>>) {
        const providerId = String(provider.id); // BIGINT → string
        const fcmToken = provider.fcm_token as string | null;

        if (!fcmToken) continue;

        // Registrar oferta (para rastrear quem foi notificado)
        await supabase.from('service_offers').upsert({
            service_id: serviceId,
            provider_id: providerId,
            status: 'offered',
            round,
            offered_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + NOTIFY_TIMEOUT_SECONDS * 1000).toISOString(),
        }, { onConflict: 'service_id,provider_id' });

        // Enviar push notification via Edge Function push-notifications
        try {
            await fetch(PUSH_FN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                    'apikey': SUPABASE_SERVICE_KEY,
                },
                body: JSON.stringify({
                    token: fcmToken,
                    title: '🔔 Nova solicitação de serviço!',
                    body: `Serviço disponível a ${Math.round((provider.distance_km as number) * 10) / 10}km de você`,
                    data: {
                        type: 'SERVICE_REQUEST',
                        serviceId,
                        round: String(round),
                    },
                }),
            });
            notifiedCount++;
        } catch (e) {
            console.error(`[dispatch] Falha ao notificar prestador ${providerId}:`, e);
        }

        await logEvent(supabase, serviceId, 'PROVIDER_NOTIFIED',
            `Prestador ${provider.name ?? providerId} notificado (${Math.round((provider.distance_km as number) * 10) / 10}km)`);
    }

    return notifiedCount;
}
