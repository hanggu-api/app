import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  return new Response(
    JSON.stringify({
      success: true,
      theme: {
        version: 1,
        name: "Play 101 Default",
        colors: {
          primary: "#FFD700",
          primaryBlue: "#2196F3",
          secondary: "#000000",
          background: "#FFFFFF",
          surface: "#F5F5F5",
          textPrimary: "#000000",
          buttonPrimaryBg: "#FFD700",
          buttonPrimaryText: "#000000"
        },
        borders: {
          radiusMedium: 12
        },
        typography: {
          sizeMedium: 14,
          sizeTitle: 32
        }
      }
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  )
})
