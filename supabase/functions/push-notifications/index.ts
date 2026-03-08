import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

/**
 * Helper: Generate OAuth 2.0 Access Token from Service Account (JWT)
 */
async function getAccessToken(serviceAccount: any): Promise<string | null> {
    try {
        const { client_email, private_key } = serviceAccount;

        const header = { alg: 'RS256', typ: 'JWT' };
        const now = Math.floor(Date.now() / 1000);
        const claims = {
            iss: client_email,
            scope: 'https://www.googleapis.com/auth/firebase.messaging',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now
        };

        const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        const encodedClaims = btoa(JSON.stringify(claims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        const signatureInput = `${encodedHeader}.${encodedClaims}`;

        const keyData = private_key
            .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, '')
            .replace(/\\n/g, '')
            .replace(/\s+/g, '');

        const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
        const cryptoKey = await crypto.subtle.importKey(
            'pkcs8',
            binaryKey,
            { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const encoder = new TextEncoder();
        const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, encoder.encode(signatureInput));
        const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
            .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

        const jwt = `${signatureInput}.${encodedSignature}`;

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: jwt
            })
        });

        const tokenData = await tokenResponse.json();
        return tokenData.access_token;
    } catch (error) {
        console.error('Error getting access token:', error);
        return null;
    }
}

serve(async (req) => {
    try {
        const payload = await req.json();
        console.log("Webhook payload received:", payload);

        const record = payload.record;
        const oldRecord = payload.old_record;

        if (!record || !record.id) {
            return new Response("No record found in payload", { status: 400 });
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, supabaseKey);

        const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
        if (!serviceAccountJson) {
            return new Response("FIREBASE_SERVICE_ACCOUNT not set", { status: 500 });
        }
        const serviceAccount = JSON.parse(serviceAccountJson);

        let title = "Atualização de Serviço";
        let body = "O status do seu serviço foi atualizado.";
        let targetUserId: number | null = null;
        let dataPayload: Record<string, string> = {};

        if (payload.table === 'service_requests_new') {
            const status = record.status;
            const oldStatus = oldRecord?.status;

            if (status !== oldStatus) {
                if (status === 'accepted') {
                    title = "Serviço Aceito!";
                    body = "Um prestador aceitou sua solicitação.";
                    targetUserId = Number(record.client_id);
                } else if (status === 'in_progress') {
                    title = "Serviço Iniciado";
                    body = "O prestador iniciou o serviço.";
                    targetUserId = Number(record.client_id);
                } else if (status === 'waiting_payment_remaining') {
                    title = "O Prestador Chegou!";
                    body = "Por favor, libere o pagamento restante.";
                    targetUserId = Number(record.client_id);
                } else if (status === 'completed') {
                    title = "Serviço Concluído";
                    body = "Obrigado por usar nossos serviços!";
                    targetUserId = Number(record.client_id);
                } else if (status === 'open_for_schedule' && !oldStatus) {
                    title = "Novo Serviço Disponível";
                    body = "Há uma nova solicitação na sua região.";
                    // This would normally be broadcasted, for now we skip or log
                }
            }
            dataPayload = {
                type: 'status_update',
                service_id: record.id?.toString() ?? '',
                status: record.status?.toString() ?? '',
                click_action: "FLUTTER_NOTIFICATION_CLICK",
            };
        } else if (payload.table === 'chat_messages') {
            const serviceId = record.service_id?.toString();
            const senderId = Number(record.sender_id);
            if (!serviceId || Number.isNaN(senderId)) {
                return new Response("Invalid chat payload", { status: 200 });
            }

            let recipientId: number | null = null;
            let senderName = 'Nova mensagem';

            const { data: senderUser } = await supabase
                .from('users')
                .select('full_name')
                .eq('id', senderId)
                .maybeSingle();

            if (senderUser?.full_name) {
                senderName = senderUser.full_name;
            }

            const { data: trip } = await supabase
                .from('trips')
                .select('client_id, driver_id')
                .eq('id', serviceId)
                .maybeSingle();

            if (trip) {
                recipientId = Number(trip.client_id) === senderId
                    ? Number(trip.driver_id)
                    : Number(trip.client_id);
            } else {
                const { data: serviceReq } = await supabase
                    .from('service_requests_new')
                    .select('client_id, provider_id')
                    .eq('id', serviceId)
                    .maybeSingle();

                if (serviceReq) {
                    recipientId = Number(serviceReq.client_id) === senderId
                        ? Number(serviceReq.provider_id)
                        : Number(serviceReq.client_id);
                }
            }

            if (recipientId && !Number.isNaN(recipientId)) {
                targetUserId = recipientId;
                title = senderName;
                body = (record.content?.toString() ?? 'Nova mensagem').slice(0, 180);
                dataPayload = {
                    type: 'chat_message',
                    service_id: serviceId,
                    message_id: record.id?.toString() ?? '',
                    sender_id: senderId.toString(),
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                };
            }
        }

        if (!targetUserId || Number.isNaN(targetUserId)) {
            return new Response("No target user mapping", { status: 200 });
        }

        const { data: userData } = await supabase
            .from('users')
            .select('fcm_token')
            .eq('id', targetUserId)
            .single();

        if (!userData?.fcm_token) {
            return new Response("FCM Token not found for user", { status: 200 });
        }

        const accessToken = await getAccessToken(serviceAccount);
        if (!accessToken) {
            return new Response("Failed to get FCM access token", { status: 500 });
        }

        const fcmPayload = {
            message: {
                token: userData.fcm_token,
                notification: { title, body },
                data: dataPayload,
                android: {
                    priority: "HIGH",
                    notification: {
                        channel_id: "high_importance_channel_v3",
                        sound: "default"
                    }
                }
            }
        };

        const fcmResponse = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify(fcmPayload)
        });

        const result = await fcmResponse.json();
        console.log("FCM V1 send result:", result);

        return new Response(JSON.stringify({ success: true, result }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Error processing webhook:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
});
