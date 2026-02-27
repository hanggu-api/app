import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

serve(async (req) => {
  return new Response(
    JSON.stringify({
      success: true,
      strings: {
        "welcome": "Bem-vindo ao 101 Service",
        "app_name": "101 Service"
      }
    }),
    { headers: { "Content-Type": "application/json" } },
  )
})
