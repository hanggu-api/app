import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

serve(async (req) => {
  return new Response(
    JSON.stringify({
      success: true,
      config: {
        "emergency_mode": false,
        "maintenance": false,
        "version": "1.0.0"
      }
    }),
    { headers: { "Content-Type": "application/json" } },
  )
})
