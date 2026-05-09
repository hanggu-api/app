import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/auth.ts";

const ABSTRACT_API_KEY = "eefbb66c212647bd8a2915f5127545ce";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();

    if (!phone) {
      return new Response(JSON.stringify({ error: "Telefone não fornecido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limpar o número: manter apenas dígitos
    let cleanPhone = phone.replace(/\D/g, "");
    
    // Adicionar DDI Brasil se não estiver presente
    if (!cleanPhone.startsWith("55")) {
      cleanPhone = "55" + cleanPhone;
    }

    const url = `https://phonevalidation.abstractapi.com/v1/?api_key=${ABSTRACT_API_KEY}&number=${cleanPhone}`;
    
    try {
      const response = await fetch(url).timeout(5000).catch(() => null);
      
      if (!response || !response.ok) {
          console.warn(`⚠️ Abstract API indisponível ou erro ${response?.status}. Usando fallback (valid=true).`);
          return new Response(JSON.stringify({
            valid: true, 
            format: phone,
            carrier: "unknown",
            location: "unknown",
            type: "unknown",
            fallback: true
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
      }
      
      const data = await response.json();

      return new Response(JSON.stringify({
        valid: data.valid ?? true,
        format: data.format ?? phone,
        carrier: data.carrier,
        location: data.location,
        type: data.type,
        original_data: data
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("❌ Erro interno ao chamar Abstract API:", e);
      return new Response(JSON.stringify({
        valid: true,
        format: phone,
        fallback: true,
        error: e.message
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
  } catch (error) {
    console.error("❌ Erro crítico na função validate-phone:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
