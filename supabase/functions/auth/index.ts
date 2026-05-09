import { badRequest, corsHeaders, ok } from "../_v1_shared/http.ts";
import { requireUser } from "../_v1_shared/supabase.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

  if (action === "session") {
    const auth = await requireUser(req);
    if ("error" in auth) return auth.error;
    return ok({
      success: true,
      user: {
        id: auth.user.id,
        email: auth.user.email,
        role: auth.profile?.role ?? null,
      },
    });
  }

  if (action === "seed-demo-users") {
    const adminKey = req.headers.get("x-admin-seed-key");
    const expectedKey = Deno.env.get("DEMO_SEED_KEY") ?? "local-demo-seed-key";
    if (adminKey != expectedKey) {
      return badRequest("Invalid seed key");
    }

    const url = Deno.env.get("SUPABASE_URL");
    if (!url) return badRequest("Missing Supabase environment");
    const publicKey = req.headers.get("apikey");
    if (!publicKey) {
      return badRequest("Missing apikey header");
    }

    const publicClient = createClient(url, publicKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const demoUsers: Array<{
      email: string;
      password: string;
      role: string;
      fullName: string;
    }> = [
      {
        email: "demo.passenger@play101.app",
        password: "demo123456",
        role: "passenger",
        fullName: "Demo Cliente",
      },
      {
        email: "demo.driver@play101.app",
        password: "demo123456",
        role: "driver",
        fullName: "Demo Motorista",
      },
      {
        email: "demo.provider.mobile@play101.app",
        password: "demo123456",
        role: "provider_mobile",
        fullName: "Demo Prestador Móvel",
      },
      {
        email: "demo.provider.fixed@play101.app",
        password: "demo123456",
        role: "provider_fixed",
        fullName: "Demo Prestador Fixo",
      },
    ];

    const seeded: Array<{ email: string; role: string }> = [];

    for (const entry of demoUsers) {
      const signUpResponse = await publicClient.auth.signUp({
        email: entry.email,
        password: entry.password,
      });
      if (
        signUpResponse.error != null &&
        !signUpResponse.error.message.toLowerCase().includes("already")
      ) {
        return badRequest(`signUp ${entry.email}: ${signUpResponse.error.message}`);
      }

      const signInResponse = await publicClient.auth.signInWithPassword({
        email: entry.email,
        password: entry.password,
      });
      if (signInResponse.error != null || signInResponse.data.user == null) {
        return badRequest(
          `signIn ${entry.email}: ${
            signInResponse.error?.message ?? `Failed to sign in ${entry.email}`
          }`,
        );
      }
      const userId = signInResponse.data.user.id;

      const accessToken = signInResponse.data.session?.access_token;
      if (!accessToken) return badRequest(`Missing session for ${entry.email}`);

      const userClient = createClient(url, publicKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      });

      const { error: profileError } = await userClient.from("profiles").upsert(
        {
          id: userId,
          role: entry.role,
          full_name: entry.fullName,
        },
        {
          onConflict: "id",
        },
      );
      if (profileError != null) {
        return badRequest(`profile ${entry.email}: ${profileError.message}`);
      }

      seeded.push({
        email: entry.email,
        role: entry.role,
      });
    }

    return ok({ success: true, seeded });
  }

  if (action === "debug-env") {
    return ok({
      success: true,
      hasUrl: Boolean(Deno.env.get("SUPABASE_URL")),
      hasServiceRole: Boolean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")),
      hasSecretA: Boolean(Deno.env.get("SUPABASE_SECRET_KEY")),
      hasSecretB: Boolean(Deno.env.get("SECRET_KEY")),
      servicePrefix: (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").slice(
        0,
        20,
      ),
      secretPrefix: (Deno.env.get("SECRET_KEY") ?? "").slice(0, 20),
    });
  }

  return badRequest(`Action not implemented: ${action}`);
});
