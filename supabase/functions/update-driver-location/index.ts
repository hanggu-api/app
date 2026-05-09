import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  const auth = await getAuthenticatedUser(req);
  if ("error" in auth) return auth.error;

  if (auth.appUser && auth.appUser.role !== "driver") {
    return json({ error: "Apenas motoristas podem atualizar localização" }, 403);
  }

  const body = await req.json().catch(() => null);
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  const forceHistory = body?.force_history === true;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return json({ error: "latitude/longitude inválidas" }, 400);
  }

  const now = new Date().toISOString();

  const { error: realtimeError } = await auth.admin
    .from("driver_locations")
    .upsert({
      driver_id: auth.appUser?.id,
      latitude,
      longitude,
      updated_at: now,
    }, { onConflict: "driver_id" });

  if (realtimeError) {
    return json({ error: realtimeError.message }, 400);
  }

  if (forceHistory) {
    const { error: historyError } = await auth.admin
      .from("driver_location_history")
      .insert({
        driver_id: auth.appUser?.id,
        latitude,
        longitude,
        recorded_at: now,
      });

    if (historyError) {
      return json({ error: historyError.message }, 400);
    }
  }

  return json({ success: true });
});
