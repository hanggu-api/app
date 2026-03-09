import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

async function getAccessToken(serviceAccount: any): Promise<string | null> {
    try {
        const { client_email, private_key } = serviceAccount;

        const header = { alg: "RS256", typ: "JWT" };
        const now = Math.floor(Date.now() / 1000);
        const claims = {
            iss: client_email,
            scope: "https://www.googleapis.com/auth/firebase.messaging",
            aud: "https://oauth2.googleapis.com/token",
            exp: now + 3600,
            iat: now,
        };

        const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
        const encodedClaims = btoa(JSON.stringify(claims)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
        const signatureInput = `${encodedHeader}.${encodedClaims}`;

        const keyData = private_key
            .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, "")
            .replace(/\\n/g, "")
            .replace(/\s+/g, "");

        const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
        const cryptoKey = await crypto.subtle.importKey(
            "pkcs8",
            binaryKey,
            { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
            false,
            ["sign"],
        );

        const encoder = new TextEncoder();
        const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(signatureInput));
        const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
            .replace(/=/g, "")
            .replace(/\+/g, "-")
            .replace(/\//g, "_");

        const jwt = `${signatureInput}.${encodedSignature}`;

        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
                assertion: jwt,
            }),
        });

        const tokenData = await tokenResponse.json();
        return tokenData.access_token;
    } catch (error) {
        console.error("Error getting access token:", error);
        return null;
    }
}

function getAndroidChannelId(type?: string): string {
    if (type === "uber_trip_offer") return "uber_trip_offers_channel";
    if (type?.startsWith("uber_trip_")) return "uber_trip_updates_channel";
    if (type === "chat_message") return "chat_messages_channel";
    return "high_importance_channel_v3";
}

function sanitizeDataPayload(data: Record<string, unknown> = {}): Record<string, string> {
    return Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, value == null ? "" : String(value)]),
    );
}

async function sendPushMessage(
    accessToken: string,
    projectId: string,
    token: string,
    title: string,
    body: string,
    dataPayload: Record<string, string>,
) {
    const isUberTripEvent = dataPayload.type?.startsWith("uber_trip_") ?? false;
    const fcmPayload = {
        message: {
            token,
            data: dataPayload,
            android: {
                priority: "HIGH",
            },
        },
    };

    if (!isUberTripEvent) {
        fcmPayload.message.notification = { title, body };
        fcmPayload.message.android.notification = {
            channel_id: getAndroidChannelId(dataPayload.type),
            sound: "default",
        };
    }

    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(fcmPayload),
    });

    return await response.json();
}

serve(async (req) => {
    try {
        const payload = await req.json();
        console.log("Webhook payload received:", payload);

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, supabaseKey);

        const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
        if (!serviceAccountJson) {
            return new Response("FIREBASE_SERVICE_ACCOUNT not set", { status: 500 });
        }

        const serviceAccount = JSON.parse(serviceAccountJson);
        const accessToken = await getAccessToken(serviceAccount);
        if (!accessToken) {
            return new Response("Failed to get FCM access token", { status: 500 });
        }

        if (payload.token && payload.title && payload.body) {
            const result = await sendPushMessage(
                accessToken,
                serviceAccount.project_id,
                String(payload.token),
                String(payload.title),
                String(payload.body),
                sanitizeDataPayload(payload.data ?? {}),
            );

            console.log("FCM V1 direct send result:", result);
            return new Response(JSON.stringify({ success: true, result }), {
                headers: { "Content-Type": "application/json" },
            });
        }

        const record = payload.record;
        const oldRecord = payload.old_record;
        if (!record || !record.id) {
            return new Response("No record found in payload", { status: 400 });
        }

        let title = "Atualização de Serviço";
        let body = "O status do seu serviço foi atualizado.";
        let targetUserIds: number[] = [];
        let dataPayload: Record<string, string> = {};

        if (payload.table === "service_requests_new") {
            const status = record.status;
            const oldStatus = oldRecord?.status;

            if (status !== oldStatus) {
                if (status === "accepted") {
                    title = "Serviço Aceito!";
                    body = "Um prestador aceitou sua solicitação.";
                    targetUserIds = [Number(record.client_id)];
                } else if (status === "in_progress") {
                    title = "Serviço Iniciado";
                    body = "O prestador iniciou o serviço.";
                    targetUserIds = [Number(record.client_id)];
                } else if (status === "waiting_payment_remaining") {
                    title = "O Prestador Chegou!";
                    body = "Por favor, libere o pagamento restante.";
                    targetUserIds = [Number(record.client_id)];
                } else if (status === "completed") {
                    title = "Serviço Concluído";
                    body = "Obrigado por usar nossos serviços!";
                    targetUserIds = [Number(record.client_id)];
                } else if (status === "open_for_schedule" && !oldStatus) {
                    title = "Novo Serviço Disponível";
                    body = "Há uma nova solicitação na sua região.";
                }
            }

            dataPayload = {
                type: "status_update",
                service_id: record.id?.toString() ?? "",
                status: record.status?.toString() ?? "",
                click_action: "FLUTTER_NOTIFICATION_CLICK",
            };
        } else if (payload.table === "trips") {
            const status = record.status?.toString();
            const oldStatus = oldRecord?.status?.toString();
            const clientId = Number(record.client_id);
            const driverId = Number(record.driver_id);

            if (status && status !== oldStatus) {
                if (status === "accepted") {
                    title = "Motorista a caminho";
                    body = "Seu motorista aceitou a corrida e está indo até você.";
                    targetUserIds = Number.isNaN(clientId) ? [] : [clientId];
                    dataPayload = {
                        type: "uber_trip_accepted",
                        trip_id: record.id?.toString() ?? "",
                        status,
                        title,
                        body,
                        click_action: "FLUTTER_NOTIFICATION_CLICK",
                    };
                } else if (status === "arrived") {
                    title = "Motorista chegou";
                    body = "Seu motorista já está no local de embarque.";
                    targetUserIds = Number.isNaN(clientId) ? [] : [clientId];
                    dataPayload = {
                        type: "uber_trip_arrived",
                        trip_id: record.id?.toString() ?? "",
                        status,
                        title,
                        body,
                        click_action: "FLUTTER_NOTIFICATION_CLICK",
                    };
                } else if (status === "in_progress") {
                    title = "Corrida iniciada";
                    body = "Sua viagem começou.";
                    targetUserIds = Number.isNaN(clientId) ? [] : [clientId];
                    dataPayload = {
                        type: "uber_trip_started",
                        trip_id: record.id?.toString() ?? "",
                        status,
                        title,
                        body,
                        click_action: "FLUTTER_NOTIFICATION_CLICK",
                    };
                } else if (status === "completed") {
                    title = "Corrida concluída";
                    body = "Sua viagem foi finalizada.";
                    targetUserIds = Number.isNaN(clientId) ? [] : [clientId];
                    dataPayload = {
                        type: "uber_trip_completed",
                        trip_id: record.id?.toString() ?? "",
                        status,
                        title,
                        body,
                        click_action: "FLUTTER_NOTIFICATION_CLICK",
                    };
                } else if (status === "cancelled") {
                    title = "Corrida cancelada";
                    body = "A corrida foi cancelada.";
                    targetUserIds = [clientId, driverId].filter((id) => !Number.isNaN(id) && id > 0);
                    dataPayload = {
                        type: "uber_trip_cancelled",
                        trip_id: record.id?.toString() ?? "",
                        status,
                        title,
                        body,
                        click_action: "FLUTTER_NOTIFICATION_CLICK",
                    };
                }
            }
        } else if (payload.table === "chat_messages") {
            const serviceId = record.service_id?.toString();
            const senderId = Number(record.sender_id);
            if (!serviceId || Number.isNaN(senderId)) {
                return new Response("Invalid chat payload", { status: 200 });
            }

            let recipientId: number | null = null;
            let senderName = "Nova mensagem";

            const { data: senderUser } = await supabase
                .from("users")
                .select("full_name")
                .eq("id", senderId)
                .maybeSingle();

            if (senderUser?.full_name) {
                senderName = senderUser.full_name;
            }

            const { data: trip } = await supabase
                .from("trips")
                .select("client_id, driver_id")
                .eq("id", serviceId)
                .maybeSingle();

            if (trip) {
                recipientId = Number(trip.client_id) === senderId
                    ? Number(trip.driver_id)
                    : Number(trip.client_id);
            } else {
                const { data: serviceReq } = await supabase
                    .from("service_requests_new")
                    .select("client_id, provider_id")
                    .eq("id", serviceId)
                    .maybeSingle();

                if (serviceReq) {
                    recipientId = Number(serviceReq.client_id) === senderId
                        ? Number(serviceReq.provider_id)
                        : Number(serviceReq.client_id);
                }
            }

            if (recipientId && !Number.isNaN(recipientId)) {
                targetUserIds = [recipientId];
                title = senderName;
                body = (record.content?.toString() ?? "Nova mensagem").slice(0, 180);
                dataPayload = {
                    type: "chat_message",
                    service_id: serviceId,
                    message_id: record.id?.toString() ?? "",
                    sender_id: senderId.toString(),
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                };
            }
        }

        const uniqueTargetUserIds = [...new Set(targetUserIds)].filter((id) => !Number.isNaN(id) && id > 0);
        if (uniqueTargetUserIds.length === 0) {
            return new Response("No target user mapping", { status: 200 });
        }

        const { data: usersData } = await supabase
            .from("users")
            .select("fcm_token")
            .in("id", uniqueTargetUserIds);

        const tokens = (usersData ?? [])
            .map((user: { fcm_token?: string | null }) => user.fcm_token)
            .filter((token: string | null | undefined): token is string => Boolean(token));

        if (tokens.length === 0) {
            return new Response("FCM Token not found for user", { status: 200 });
        }

        const results = await Promise.all(
            tokens.map((token) =>
                sendPushMessage(
                    accessToken,
                    serviceAccount.project_id,
                    token,
                    title,
                    body,
                    dataPayload,
                )),
        );

        console.log("FCM V1 send result:", results);
        return new Response(JSON.stringify({ success: true, results }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error processing webhook:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
