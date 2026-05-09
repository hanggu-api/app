import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

function parseStorageRef(raw: string): { bucket: string; path: string } | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return null;

  const normalized = value.replace(/^\/+/, "");
  if (normalized.startsWith("avatars/")) {
    return { bucket: "avatars", path: normalized.slice("avatars/".length) };
  }

  const segments = normalized.split("/");
  if (segments.length >= 2) {
    return { bucket: segments[0], path: segments.slice(1).join("/") };
  }

  return null;
}

async function resolveAvatarUrl(admin: any, rawAvatar?: string | null) {
  try {
    const raw = rawAvatar?.trim();
    if (!raw) return null;

    const storageRef = parseStorageRef(raw);
    if (!storageRef) return raw;

    const { data, error } = await admin.storage
      .from(storageRef.bucket)
      .createSignedUrl(storageRef.path, 60 * 10);

    if (error || !data?.signedUrl) {
      console.warn("⚠️ [Avatar] Erro ao criar URL assinada:", error?.message || "Sem URL");
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error("❌ [Avatar] Exceção crítica:", err);
    return null;
  }
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return json({ error: "Método não permitido" }, 405);
    }

    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => null);
    const tripId = body?.trip_id?.toString().trim();
    const partyRole = body?.party_role?.toString().trim();

    if (!tripId) return json({ error: "trip_id é obrigatório" }, 400);
    if (partyRole !== "driver" && partyRole !== "client") {
      return json({ error: "party_role inválido" }, 400);
    }

    const { data: trip, error: tripError } = await auth.admin
      .from("trips")
      .select("id, status, client_id, driver_id")
      .eq("id", tripId)
      .maybeSingle();

    if (tripError || !trip) {
      return json({ error: "Corrida não encontrada" }, 404);
    }

    const isParticipant = auth.appUser &&
      (trip.client_id === auth.appUser.id || trip.driver_id === auth.appUser.id);
    if (!isParticipant) {
      return json({ error: "Usuário não participa desta corrida" }, 403);
    }

    const targetUserId = partyRole === "driver" ? trip.driver_id : trip.client_id;
    if (!targetUserId) {
      return json({ error: "Parte solicitada ainda não definida na corrida" }, 404);
    }

    const { data: profile, error: profileError } = await auth.admin
      .from("users")
      .select("id, full_name, avatar_url, phone, pix_key, is_active, role")
      .eq("id", targetUserId)
      .maybeSingle();

    if (profileError || !profile) {
      return json({ error: "Perfil não encontrado" }, 404);
    }

    const isSelf = auth.appUser && targetUserId === auth.appUser.id;
    const canShareDirectContact =
      trip.status !== "searching" && trip.driver_id != null && isParticipant;
    const canSharePix =
      profile.role === "driver" &&
      (isSelf || (auth.appUser && auth.appUser.id === trip.client_id)) &&
      trip.driver_id != null;

    const result: Record<string, unknown> = {
      id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
      is_active: profile.is_active,
      avatar_url: await resolveAvatarUrl(auth.admin, profile.avatar_url),
    };

    if (canShareDirectContact) {
      result.phone = profile.phone;
    }

    if (canSharePix && profile.pix_key) {
      result.pix_key = profile.pix_key;
    }

    if (partyRole === "driver") {
      try {
        const { data: vehicle, error: vehicleErr } = await auth.admin
          .from("vehicles")
          .select("model, color, plate, vehicle_type_id")
          .eq("driver_id", targetUserId)
          .maybeSingle();

        if (vehicleErr) {
          console.warn("⚠️ [Vehicle] Erro ao buscar veículo:", vehicleErr.message);
        } else if (vehicle) {
          result.vehicle_model = vehicle.model;
          result.vehicle_color = vehicle.color;
          result.vehicle_plate = vehicle.plate;
          result.vehicle_type_id = vehicle.vehicle_type_id;
        }
      } catch (err) {
        console.error("❌ [Vehicle] Exceção crítica:", err);
      }
    }

    return json({ success: true, profile: result });
  } catch (err) {
    console.error("🔥 [Global] Erro fatal na Edge Function:", err);
    return json({
      error: "Erro interno no servidor",
      technicalDetail: err instanceof Error ? err.message : String(err)
    }, 500);
  }
});
