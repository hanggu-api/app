import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

const ALLOWED_BUCKETS = new Set(["avatars", "portfolio", "chat_media", "service_media"]);

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
  const key = body?.key?.toString().trim();
  const expiresIn = Number(body?.expires_in ?? 3600);

  if (!key || !key.includes("/")) {
    return json({ error: "key inválida" }, 400);
  }

  const slash = key.indexOf("/");
  const bucket = key.substring(0, slash);
  const path = key.substring(slash + 1);

  if (!ALLOWED_BUCKETS.has(bucket) || !path) {
    return json({ error: "bucket não permitido" }, 403);
  }

  const { data, error } = await auth.admin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    return json({ error: error?.message ?? "Falha ao criar URL assinada" }, 400);
  }

  return json({
    success: true,
    signed_url: data.signedUrl,
    expires_in: expiresIn,
  });
});
