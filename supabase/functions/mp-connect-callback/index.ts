import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  console.log("🚀 [CALLBACK-1] Início do processamento de retorno do Mercado Pago.");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // O state contém o user_id

    console.log("📋 [CALLBACK-2] Parâmetros recebidos - Code presente:", !!code, "| State:", state);

    if (!code || !state) {
      console.error("❌ [CALLBACK-3] Código ou Estado ausente na requisição.");
      return new Response("Dados de autorização incompletos", { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/plain; charset=UTF-8" }
      });
    }

    const MP_CLIENT_ID = Deno.env.get("MP_CLIENT_ID")?.trim();
    const MP_CLIENT_SECRET = Deno.env.get("MP_CLIENT_SECRET")?.trim();
    const MP_REDIRECT_URI = Deno.env.get("MP_REDIRECT_URI")?.trim();

    if (!MP_CLIENT_ID || !MP_CLIENT_SECRET || !MP_REDIRECT_URI) {
      console.error("❌ [CALLBACK-8] Credenciais MP não configuradas no Supabase.");
      return new Response("Erro de configuração no servidor", { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/plain; charset=UTF-8" }
      });
    }

    // 1. Trocar o CODE pelo ACCESS_TOKEN do motorista
    const mpResponse = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "accept": "application/json"
      },
      body: new URLSearchParams({
        client_secret: MP_CLIENT_SECRET,
        client_id: MP_CLIENT_ID,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: MP_REDIRECT_URI,
      }),
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("❌ [CALLBACK-9] Erro do Mercado Pago:", data);
      return new Response(`Falha na autenticação do Mercado Pago: ${data.message || 'Erro de credenciais'}`, { 
        status: mpResponse.status,
        headers: { ...corsHeaders, "Content-Type": "text/plain; charset=UTF-8" }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const [userIdRaw, role] = state.split(':');
    const userId = parseInt(userIdRaw);

    if (isNaN(userId)) {
      return new Response("ID do usuário inválido.", { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/plain; charset=UTF-8" }
      });
    }

    const targetTable = (role === 'passenger') ? "passenger_mercadopago_accounts" : "driver_mercadopago_accounts";

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 15552000));

    const { error: dbError } = await supabaseAdmin
      .from(targetTable)
      .upsert({
        user_id: userId,
        mp_user_id: String(data.user_id),
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        scope: data.scope,
        live_mode: data.live_mode || false,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (dbError) {
      return new Response("Erro ao salvar conta no banco de dados.", { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/plain; charset=UTF-8" }
      });
    }

    // 3. Sucesso! Entregar uma página visível ao usuário, tentando retornar ao app.
    // Em alguns navegadores o redirect direto para deep link resulta em tela branca.
    const deepLink = "service101://app";
    console.log("🏁 [CALLBACK-SUCCESS] Autorização concluída. deepLink:", deepLink);

    const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Conta Mercado Pago conectada</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#fff;margin:0;padding:24px;color:#111}
      .card{max-width:520px;margin:0 auto;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:20px}
      h1{font-size:20px;margin:0 0 8px 0}
      p{margin:0 0 16px 0;color:#444;line-height:1.4}
      a.btn{display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 16px;border-radius:12px;font-weight:700}
      .hint{margin-top:14px;font-size:12px;color:#666}
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Conta Mercado Pago conectada</h1>
      <p>Autorização concluída com sucesso. Para sua segurança, esta tela é exibida pelo navegador.</p>
      <a class="btn" href="${deepLink}">Voltar ao app</a>
      <div class="hint">Se o app não abrir, volte manualmente ou toque no botão acima.</div>
    </div>
  </body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=UTF-8",
        "Cache-Control": "no-store",
      },
    });

  } catch (error: any) {
    console.error("💥 [CALLBACK-ERROR] Falha inesperada:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
