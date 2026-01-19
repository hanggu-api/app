import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Google/Firebase Service Account needs to be set in Edge Function secrets or handled via HTTP v1 API
// For simplicity, we assume we will hit the FCM Legacy API using FIREBASE_SERVER_KEY 
// or the user sets it up in the Supabase Dashboard.

serve(async (req) => {
    try {
        const payload = await req.json();
        console.log("Webhook payload received:", payload);

        const record = payload.record;
        const oldRecord = payload.old_record;

        // Check if the trigger is what we expect
        if (!record || !record.id) {
            return new Response("No record found in payload", { status: 400 });
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get FCM Server Key
        const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");
        if (!fcmServerKey) {
            console.log("FCM_SERVER_KEY not set");
            return new Response("FCM keys missing", { status: 500 });
        }

        // Determine notification logic based on table changes (e.g. status)
        let title = "Atualização de Serviço";
        let body = "O status do seu serviço foi atualizado.";
        let targetUserId = null; // Who receives the notification

        if (payload.table === 'service_requests_new') {
            const status = record.status;
            const oldStatus = oldRecord?.status;

            if (status !== oldStatus) {
                if (status === 'accepted') {
                    title = "Serviço Aceito!";
                    body = "Um prestador aceitou sua solicitação.";
                    targetUserId = record.client_id;
                } else if (status === 'in_progress') {
                    title = "Serviço Iniciado";
                    body = "O prestador iniciou o serviço.";
                    targetUserId = record.client_id;
                } else if (status === 'waiting_payment_remaining') {
                    title = "O Prestador Chegou!";
                    body = "Por favor, libere o pagamento restante.";
                    targetUserId = record.client_id;
                } else if (status === 'completed') {
                    title = "Serviço Concluído";
                    body = "Obrigado por usar nossos serviços!";
                    targetUserId = record.client_id;
                }
            }
        }

        if (!targetUserId) {
            return new Response("No target user for notification", { status: 200 });
        }

        // Fetch User's FCM Token from users table
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('fcm_token')
            .eq('id', targetUserId)
            .single();

        if (userError || !userData?.fcm_token) {
            console.log("FCM Token not found for user", targetUserId);
            return new Response("Token not found", { status: 200 });
        }

        const fcmToken = userData.fcm_token;

        // Send Push Notification via FCM
        const fcmPayload = {
            to: fcmToken,
            notification: {
                title: title,
                body: body,
                sound: "default",
            },
            data: {
                serviceId: record.id,
                status: record.status,
                click_action: "FLUTTER_NOTIFICATION_CLICK"
            }
        };

        const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `key=${fcmServerKey}`
            },
            body: JSON.stringify(fcmPayload)
        });

        const fcmResult = await fcmResponse.json();
        console.log("FCM send result:", fcmResult);

        return new Response(JSON.stringify({ success: true, result: fcmResult }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Error processing webhook:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
});
