import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)
        // On edge functions, the path might be different depending on how it's called
        // We'll be permissive and accept anything to /analytics or /analytics/log

        const body = await req.json()
        console.log(`📊 [Analytics] Received event(s)`)

        return new Response(JSON.stringify({ success: true, processed: 1 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: corsHeaders,
        })
    }
})
