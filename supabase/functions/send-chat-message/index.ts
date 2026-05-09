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
  if ("error" in auth) {
    return auth.error ?? json({ error: "Falha de autenticação" }, 401);
  }

  const body = await req.json().catch(() => null);
  const serviceId = body?.service_id?.toString().trim();
  const content = body?.content?.toString() ?? "";
  const type = body?.type?.toString().trim() || "text";

  if (!serviceId) return json({ error: "service_id é obrigatório" }, 400);
  if (!content.trim()) return json({ error: "content é obrigatório" }, 400);

  const { data: service } = await auth.admin
    .from("service_requests")
    .select("id, client_id, provider_id")
    .eq("id", serviceId)
    .maybeSingle();

  const { data: fixedBooking } = await auth.admin
    .from("agendamento_servico")
    .select("id, cliente_user_id, prestador_user_id")
    .eq("id", serviceId)
    .maybeSingle();

  const isServiceParticipant = service != null && auth.appUser &&
    (service.client_id === auth.appUser.id ||
      service.provider_id === auth.appUser.id);
  const isFixedBookingParticipant = fixedBooking != null && auth.appUser &&
    (fixedBooking.cliente_user_id === auth.appUser.id ||
      fixedBooking.prestador_user_id === auth.appUser.id);

  if (
    !isServiceParticipant && !isFixedBookingParticipant
  ) {
    return json({ error: "Usuário não participa desta conversa" }, 403);
  }

  const { data, error } = await auth.admin
    .from("chat_messages")
    .insert({
      service_id: serviceId,
      sender_id: auth.appUser?.id,
      content,
      type,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[send-chat-message] insert error:", error);
    return json({ error: error.message }, 400);
  }

  // Dispara push para o destinatário (fire-and-forget)
  try {
    let recipientId: number | null = null;
    if (service) {
      recipientId = auth.appUser?.id === service.client_id
        ? service.provider_id
        : service.client_id;
    } else if (fixedBooking) {
      recipientId = auth.appUser?.id === fixedBooking.cliente_user_id
        ? fixedBooking.prestador_user_id
        : fixedBooking.cliente_user_id;
    }

    if (recipientId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const edgeUrl = `${supabaseUrl}/functions/v1/push-notifications`;
      const srvKey = Deno.env.get("PROJECT_SERVICE_KEY") ??
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
        "";

      fetch(edgeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${srvKey}`,
          apikey: srvKey,
        },
        body: JSON.stringify({
          type: "chat_message",
          user_id: recipientId,
          service_id: serviceId,
          title: "Nova mensagem",
          body: content.slice(0, 120),
          data: {
            service_id: serviceId,
            message_id: data?.id?.toString() ?? "",
            sender_id: auth.appUser?.id,
          },
        }),
      }).catch((err) => console.error("push chat error", err));
    }
  } catch (err) {
    console.error("push chat dispatch failed", err);
  }

  return json({ success: true, message: data });
});
