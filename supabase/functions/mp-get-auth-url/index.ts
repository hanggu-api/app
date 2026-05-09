const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  console.log("🚀 [DEBUG-1] Recebida requisição:", req.method);

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let userId: string | null = null;
    let userRole: string = "driver";

    // Tentar ler o corpo da requisição
    try {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = await req.json();
        userId = body.userId?.toString() || null;
        userRole = body.role?.toString() || "driver";
        console.log("✅ [DEBUG-4] Body capturado - UserId:", userId, "Role:", userRole);
      }
    } catch (err) {
      console.warn("⚠️ [DEBUG-5] Erro ao ler body JSON:", err.message);
    }

    // Fallback para URL
    if (!userId) {
      const url = new URL(req.url);
      userId = url.searchParams.get("userId");
      userRole = url.searchParams.get("role") || userRole;
      console.log("✅ [DEBUG-7] URL capturada - UserId:", userId, "Role:", userRole);
    }

    if (!userId || userId === "null" || userId === "undefined") {
      console.error("❌ [DEBUG-8] ERRO: userId não encontrado.");
      return new Response(
        JSON.stringify({ error: "ID do usuário não identificado no servidor." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificação de Secrets
    const MP_CLIENT_ID = Deno.env.get("MP_CLIENT_ID");
    const MP_REDIRECT_URI = Deno.env.get("MP_REDIRECT_URI");

    if (!MP_CLIENT_ID || !MP_REDIRECT_URI) {
      return new Response(
        JSON.stringify({ error: "Configuração do Mercado Pago ausente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gerar state como "userId:role"
    const state = `${userId}:${userRole}`;
    // OAuth Mercado Pago:
    // - `platform_id=mp` é recomendado na documentação.
    // - `scope` garante refresh_token e permissões padrão (split/wallet).
    // - `prompt=login` tenta forçar a tela de login/consent quando o usuário já tem sessão ativa.
    // Escopos mais compatíveis com a família Mercado Libre/Mercado Pago.
    const scope = encodeURIComponent("offline_access read write");
    const authUrl =
      `https://auth.mercadopago.com.br/authorization` +
      `?client_id=${MP_CLIENT_ID}` +
      `&response_type=code` +
      `&platform_id=mp` +
      `&redirect_uri=${encodeURIComponent(MP_REDIRECT_URI)}` +
      `&state=${encodeURIComponent(state)}` +
      `&scope=${scope}` +
      `&prompt=login`;

    console.log("✅ [DEBUG-12] URL Gerada com sucesso!");
    console.log("🔗 URL:", authUrl);

    return new Response(
      JSON.stringify({ url: authUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("💥 [DEBUG-ERROR] Falha crítica:", error.message);
    return new Response(
      JSON.stringify({
        error: "Erro interno no servidor de autenticação.",
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
