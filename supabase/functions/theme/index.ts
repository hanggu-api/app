import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

serve(async (req) => {
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
    { headers: { "Content-Type": "application/json" } },
  )
})
