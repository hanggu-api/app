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

  if (action === "create") {
    const auth = await requireUser(req);
    if ("error" in auth) return auth.error;
    const denied = requireRole(auth.profile, [
      "driver",
      "provider_mobile",
      "provider_fixed",
    ]);
    if (denied) return denied;

    const requestId = body?.request_id as string | undefined;
    const amountCents = Number(body?.amount_cents);

    if (!requestId) return badRequest("request_id is required");
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return badRequest("amount_cents must be greater than zero");
    }

    const { data, error } = await auth.admin
      .from("offers")
      .insert({
        request_id: requestId,
        provider_id: auth.user.id,
        amount_cents: amountCents,
        message: body?.message ?? null,
        status: "pending",
      })
      .select("*")
      .single();

    if (error) return badRequest(error.message);

    await auth.admin
      .from("service_requests")
      .update({ status: "offered" })
      .eq("id", requestId)
      .eq("status", "pending");

    return ok({ success: true, offer: data });
  }

  return badRequest(`Action not implemented: ${action}`);
});
