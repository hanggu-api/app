import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.10.0?target=deno";
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) return auth.error;

    if (!auth.appUser) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUid = auth.appUser.supabase_uid;
    const internalId = auth.appUser.id;
    const stripeCustomerId = auth.appUser.stripe_customer_id;

    const { data: providerRow } = await auth.admin
      .from("providers")
      .select("stripe_account_id")
      .eq("user_id", internalId)
      .maybeSingle();

    const stripeAccountId = providerRow?.stripe_account_id;

    console.log(`🗑️ Iniciando exclusão para usuário ${internalId} (${supabaseUid})`);

    // 3. Clean up Stripe
    if (stripeAccountId) {
      try {
        console.log(`Stripe: Deletando conta Connect ${stripeAccountId}`);
        await stripe.accounts.del(stripeAccountId);
      } catch (e) {
        console.error(`Erro ao deletar conta Stripe: ${e.message}`);
      }
    }

    if (stripeCustomerId) {
      try {
        console.log(`Stripe: Deletando cliente ${stripeCustomerId}`);
        await stripe.customers.del(stripeCustomerId);
      } catch (e) {
        console.error(`Erro ao deletar cliente Stripe: ${e.message}`);
      }
    }

    // 4. Delete from Supabase Auth (Service Role required)
    const { error: deleteError } = await auth.admin.auth.admin.deleteUser(supabaseUid);

    if (deleteError) {
      throw new Error(`Erro ao deletar usuário do Auth: ${deleteError.message}`);
    }

    console.log(`✅ Usuário ${supabaseUid} excluído com sucesso.`);

    return json({ success: true, message: "Conta excluída permanentemente." });

  } catch (error) {
    console.error("❌ Erro na exclusão de conta:", error.message);
    return json({ error: error.message }, 400);
  }
});
