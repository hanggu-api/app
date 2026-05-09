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

  const body = await req.json().catch(() => null);
  const tripId = body?.trip_id?.toString().trim();
  const revieweeId = Number(body?.reviewee_id);
  const rating = Number(body?.rating);
  const comment = body?.comment?.toString() ?? null;

  if (!tripId) return json({ error: "trip_id é obrigatório" }, 400);
  if (!Number.isInteger(revieweeId) || revieweeId <= 0) {
    return json({ error: "reviewee_id inválido" }, 400);
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return json({ error: "rating inválido" }, 400);
  }

  const { data: trip, error: tripError } = await auth.admin
    .from("trips")
    .select("id, client_id, driver_id")
    .eq("id", tripId)
    .maybeSingle();

  if (tripError || !trip) {
    return json({ error: "Corrida não encontrada" }, 404);
  }

  const reviewerId = auth.appUser.id;
  const isParticipant = trip.client_id === reviewerId || trip.driver_id === reviewerId;
  const isRevieweeParticipant = trip.client_id === revieweeId || trip.driver_id === revieweeId;

  if (!isParticipant || !isRevieweeParticipant || reviewerId === revieweeId) {
    return json({ error: "Avaliação inválida para esta corrida" }, 403);
  }

  const { data, error } = await auth.admin
    .from("trips_reviews")
    .insert({
      trip_id: tripId,
      reviewer_id: reviewerId,
      reviewee_id: revieweeId,
      rating,
      comment,
    })
    .select()
    .single();

  if (error) {
    return json({ error: error.message }, 400);
  }

  return json({ success: true, review: data });
});
