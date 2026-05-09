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

  if (action === "update-status") {
    const auth = await requireUser(req);
    if ("error" in auth) return auth.error;
    const denied = requireRole(auth.profile, [
      "driver",
      "provider_mobile",
      "provider_fixed",
    ]);
    if (denied) return denied;

    const requestId = body?.request_id as string | undefined;
    const status = body?.status as string | undefined;

    if (!requestId) return badRequest("request_id is required");
    if (!status) return badRequest("status is required");
    if (!["in_progress", "completed", "cancelled"].includes(status)) {
      return badRequest("invalid status transition");
    }

    const { data, error } = await auth.admin
      .from("service_requests")
      .update({ status })
      .eq("id", requestId)
      .eq("assigned_to", auth.user.id)
      .select("*")
      .single();

    if (error) return badRequest(error.message);

    if (status === "completed") {
      await auth.admin
        .from("assignments")
        .update({ completed_at: new Date().toISOString() })
        .eq("request_id", requestId)
        .eq("provider_id", auth.user.id);
    }

    return ok({ success: true, service_request: data });
  }

  return badRequest(`Action not implemented: ${action}`);
});
