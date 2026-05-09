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
  const messageId = Number(body?.message_id);
  if (!Number.isInteger(messageId) || messageId <= 0) {
    return json({ error: "message_id inválido" }, 400);
  }

  const { data: message, error: messageError } = await auth.admin
    .from("chat_messages")
    .select("id, service_id")
    .eq("id", messageId)
    .maybeSingle();

  if (messageError || !message) {
    return json({ error: "Mensagem não encontrada" }, 404);
  }

  const { data: serviceCurrent } = await auth.admin
    .from("service_requests")
    .select("id, client_id, provider_id")
    .eq("id", message.service_id)
    .maybeSingle();

  const { data: fixedBooking } = await auth.admin
    .from("agendamento_servico")
    .select("id, cliente_user_id, prestador_user_id")
    .eq("id", message.service_id)
    .maybeSingle();

  const isServiceParticipant = serviceCurrent != null && auth.appUser &&
    (serviceCurrent.client_id === auth.appUser.id || serviceCurrent.provider_id === auth.appUser.id);
  const isFixedBookingParticipant = fixedBooking != null && auth.appUser &&
    (fixedBooking.cliente_user_id === auth.appUser.id ||
      fixedBooking.prestador_user_id === auth.appUser.id);

  if (!isServiceParticipant && !isFixedBookingParticipant) {
    return json({ error: "Usuário não participa desta conversa" }, 403);
  }

  const { error } = await auth.admin
    .from("chat_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) {
    return json({ error: error.message }, 400);
  }

  return json({ success: true });
});
