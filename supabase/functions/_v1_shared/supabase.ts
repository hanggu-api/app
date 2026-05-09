import { createClient } from "npm:@supabase/supabase-js@2";
import { badRequest, forbidden, unauthorized } from "./http.ts";

export function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.replace("Bearer ", "").trim();
}

export async function requireUser(req: Request) {
  const admin = getServiceClient();
  const token = extractBearerToken(req);

  if (!token) {
    return { error: unauthorized("Missing bearer token") };
  }

  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);

  if (error || !user) {
    return { error: unauthorized("Invalid auth token") };
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: badRequest(profileError.message) };
  }

  return { admin, user, profile };
}

export function requireRole(
  profile: { role?: string } | null,
  allowedRoles: string[],
) {
  const role = profile?.role;
  if (!role || !allowedRoles.includes(role)) {
    return forbidden("Role not allowed for this action");
  }
  return null;
}
