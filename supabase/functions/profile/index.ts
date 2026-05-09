import { badRequest, corsHeaders, ok } from "../_v1_shared/http.ts";
import { requireUser } from "../_v1_shared/supabase.ts";

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

  if (action === "create-or-update") {
    const auth = await requireUser(req);
    if ("error" in auth) return auth.error;

    const { full_name, phone } = body ?? {};
    const role = body?.role as string | undefined;

    if (!role) return badRequest("role is required");

    const { data, error } = await auth.admin
      .from("profiles")
      .upsert(
        {
          id: auth.user.id,
          role,
          full_name: full_name ?? null,
          phone: phone ?? null,
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();

    if (error) return badRequest(error.message);
    return ok({ success: true, profile: data });
  }

  if (action === "get-me") {
    const auth = await requireUser(req);
    if ("error" in auth) return auth.error;
    return ok({ success: true, profile: auth.profile });
  }

  return badRequest(`Action not implemented: ${action}`);
});
