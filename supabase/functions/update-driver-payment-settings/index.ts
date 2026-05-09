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

  if (auth.appUser && auth.appUser.role !== "driver") {
    return json({ error: "Apenas motoristas podem atualizar pagamentos" }, 403);
  }

  const body = await req.json().catch(() => null);
  const acceptsPixDirect = body?.accepts_pix_direct === true;
  const acceptsCardMachine = body?.accepts_card_machine === true;
  const pixKey = body?.pix_key?.toString().trim() || null;

  const { error } = await auth.admin
    .from("users")
    .update({
      accepts_pix_direct: acceptsPixDirect,
      accepts_card_machine: acceptsCardMachine,
      pix_key: pixKey,
    })
    .eq("id", auth.appUser?.id);

  if (error) {
    return json({ error: error.message }, 400);
  }

  return json({ success: true });
});
