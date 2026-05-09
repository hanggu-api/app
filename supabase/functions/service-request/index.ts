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
    const denied = requireRole(auth.profile, ["passenger"]);
    if (denied) return denied;

    const category = body?.category as string | undefined;
    if (!category) return badRequest("category is required");

    const { data, error } = await auth.admin
      .from("service_requests")
      .insert({
        client_id: auth.user.id,
        category,
        status: "pending",
        origin: body?.origin ?? null,
        destination: body?.destination ?? null,
        notes: body?.notes ?? null,
        scheduled_to: body?.scheduled_to ?? null,
      })
      .select("*")
      .single();

    if (error) return badRequest(error.message);
    return ok({ success: true, service_request: data });
  }

  if (action === "list") {
    const auth = await requireUser(req);
    if ("error" in auth) return auth.error;

    const role = auth.profile?.role;
    if (!role) return badRequest("Profile role is required");

    let query = auth.admin
      .from("service_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (role === "passenger") {
      query = query.eq("client_id", auth.user.id);
    } else {
      query = query.or(
        `assigned_to.eq.${auth.user.id},status.eq.pending,status.eq.offered`,
      );
    }

    const { data, error } = await query;
    if (error) return badRequest(error.message);
    return ok({ success: true, items: data ?? [] });
  }

  return badRequest(`Action not implemented: ${action}`);
});
