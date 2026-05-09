import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

const TRIP_RUNTIME_ENABLED = false;

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;

    const supabase = auth.admin;
    const supabaseKey = Deno.env.get("PROJECT_SERVICE_KEY") ??
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
        "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

    try {
        if (!TRIP_RUNTIME_ENABLED) {
            return json({
                success: true,
                skipped: true,
                reason: "trip_runtime_disabled",
            });
        }

        const body = await req.json().catch(() => ({}));
        const { trip_id, vehicle_type_id } = body;

        if (!trip_id || !vehicle_type_id) {
            return json({ error: "trip_id e vehicle_type_id são obrigatórios" }, 400);
        }

        // 1. Buscar detalhes da viagem
        const { data: trip, error: tripError } = await supabase
            .from("trips")
            .select("*")
            .eq("id", trip_id)
            .single();

        if (tripError || !trip) {
            return json({ error: "Viagem não encontrada" }, 404);
        }

        // 2. Localizar motoristas próximos via RPC
        const { data: drivers, error: driverError } = await supabase.rpc(
            "find_nearby_drivers",
            {
                p_lat: trip.pickup_lat,
                p_lon: trip.pickup_lon,
                p_radius_km: 10, // Raio inicial de 10km
                p_vehicle_type_id: vehicle_type_id,
                p_payment_method: (trip.payment_method_id ?? "").toString(),
            }
        );

        if (driverError || !drivers || drivers.length === 0) {
            console.log(`[notify-drivers] Nenhum motorista encontrado para trip ${trip_id}`);
            return json({ success: true, notified_count: 0 });
        }

        console.log(`[notify-drivers] Notificando ${drivers.length} motoristas para trip ${trip_id}`);

        // 3. Disparar push para cada motorista via a função central de push
        const PUSH_FN_URL = `${supabaseUrl}/functions/v1/push-notifications`;

        const notifications = drivers.map((driver: any) => {
            return fetch(PUSH_FN_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${supabaseKey}`,
                    "apikey": supabaseKey,
                },
                body: JSON.stringify({
                    token: driver.fcm_token,
                    title: "🚕 Nova corrida disponível!",
                    body: `Viagem de R$ ${trip.fare_estimated?.toFixed(2) ?? "0.00"} aguardando aceite.`,
                    data: {
                        type: "uber_trip_offer",
                        trip_id: trip_id,
                        id: trip_id,
                        pickup_address: trip.pickup_address,
                        dropoff_address: trip.dropoff_address,
                        fare: trip.fare_estimated?.toString() ?? "0",
                        fare_estimated: trip.fare_estimated?.toString() ?? "0",
                        vehicle_type_id: vehicle_type_id?.toString() ?? "",
                        click_action: "FLUTTER_NOTIFICATION_CLICK",
                    },
                }),
            }).catch(err => console.error(`Erro ao notificar driver ${driver.id}:`, err));
        });

        await Promise.all(notifications);

        return json({ success: true, notified_count: drivers.length });
    } catch (error) {
        console.error("[notify-drivers] Erro crítico:", error);
        return json({ error: error.message }, 500);
    }
});
