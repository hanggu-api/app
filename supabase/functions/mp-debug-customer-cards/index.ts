import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const body = await req.json().catch(() => ({}));
    const customerId = body?.customer_id;

    if (!customerId) {
      return json({ error: "customer_id obrigatório" }, 400);
    }

    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    if (!MP_ACCESS_TOKEN) {
      return json({ error: "MP_ACCESS_TOKEN não configurado" }, 500);
    }

    const res = await fetch(`https://api.mercadopago.com/v1/customers/${customerId}/cards`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });

    const data = await res.json();
    return json({ 
      status: res.status,
      customerId,
      cards: data 
    });
  } catch (error: any) {
    return json({ error: error.message }, 500);
  }
});
