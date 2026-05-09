import { badRequest, corsHeaders, ok } from "../_v1_shared/http.ts";
import { requireRole, requireUser } from "../_v1_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  const action = body?.action ?? "ping";

  if (action === "ping") {
    return ok({
      success: true,
      action,
      timestamp: new Date().toISOString(),
    });
  }

  if (action === "accept") {
    const auth = await requireUser(req);
    if ("error" in auth) return auth.error;
    const denied = requireRole(auth.profile, [
      "driver",
      "provider_mobile",
      "provider_fixed",
    ]);
    if (denied) return denied;

    const requestId = body?.request_id as string | undefined;
    if (!requestId) return badRequest("request_id is required");

    // Buscar o user_id numérico a partir do supabase_uid
    const { data: providerUser, error: providerError } = await auth.admin
      .from("users")
      .select("id")
      .eq("supabase_uid", auth.user.id)
      .maybeSingle();

    if (providerError || !providerUser) return badRequest("Prestador não encontrado no sistema");

    const providerNumericId = providerUser.id;

    // Atualizar service_requests com provider_id (coluna correta)
    const { error: requestError } = await auth.admin
      .from("service_requests")
      .update({
        provider_id: providerNumericId,
        status: "accepted",
        status_updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .in("status", ["searching", "searching_provider", "open_for_schedule"]);

    if (requestError) return badRequest(requestError.message);

    // Marcar notificação como respondida
    await auth.admin
      .from("notificacao_de_servicos")
      .update({ status: "accepted", answered_at: new Date().toISOString() })
      .eq("service_id", requestId)
      .eq("provider_user_id", providerNumericId);

    return ok({ success: true, provider_id: providerNumericId, status: "accepted" });
  }

  return badRequest(`Action not implemented: ${action}`);
});
