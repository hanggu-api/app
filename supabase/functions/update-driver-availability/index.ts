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
    return json({ error: "Apenas motoristas podem alterar disponibilidade" }, 403);
  }

  const body = await req.json().catch(() => null);
  const isActive = body?.is_active === true;
  const latitude = body?.latitude != null ? Number(body.latitude) : null;
  const longitude = body?.longitude != null ? Number(body.longitude) : null;
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = {
    is_active: isActive,
    last_seen_at: now,
  };

  if (isActive) {
    updates.activated_at = now;
  }

  const { error: userError } = await auth.admin
    .from("users")
    .update(updates)
    .eq("id", auth.appUser?.id);

  if (userError) {
    return json({ error: userError.message }, 400);
  }

  if (!isActive) {
    const { error: deleteError } = await auth.admin
      .from("driver_locations")
      .delete()
      .eq("driver_id", auth.appUser?.id);

    if (deleteError) {
      return json({ error: deleteError.message }, 400);
    }
  } else if (
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    const { error: locationError } = await auth.admin
      .from("driver_locations")
      .upsert({
        driver_id: auth.appUser?.id,
        latitude,
        longitude,
        updated_at: now,
      }, { onConflict: "driver_id" });

    if (locationError) {
      return json({ error: locationError.message }, 400);
    }
  }

  return json({ success: true });
});
