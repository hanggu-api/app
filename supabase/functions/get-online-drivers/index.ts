import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

// Deploy marker 2026-03-10: debug JWT logs ativos

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido" }, 405);
  }

  const auth = await getAuthenticatedUser(req);
  if ("error" in auth) return auth.error;

  const admin = auth.admin;

  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("driver_locations")
    .select(`
      driver_id,
      latitude,
      longitude,
      updated_at,
      users!inner(
        id,
        role,
        is_active,
        last_seen_at,
        accepts_pix_direct,
        accepts_card_machine
      )
    `)
    .gte("updated_at", cutoff);

  if (error) {
    return json({ error: error.message }, 400);
  }

  const drivers = (data ?? [])
    .map((row: any) => {
      const user = row.users;
      if (!user || user.role !== "driver" || user.is_active !== true) {
        return null;
      }

      return {
        driver_id: row.driver_id,
        latitude: row.latitude,
        longitude: row.longitude,
        updated_at: row.updated_at,
        vehicle_type_id: null,
        accepts_pix_direct: user.accepts_pix_direct ?? true,
        accepts_card_machine: user.accepts_card_machine ?? false,
      };
    })
    .filter(Boolean);

  return json({ success: true, drivers });
});
