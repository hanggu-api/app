    import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
    import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    serve(async (req) => {
        if (req.method === 'OPTIONS') {
            return new Response('ok', { headers: corsHeaders })
        }

        try {
            const supabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            const url = new URL(req.url)
            const path = url.pathname.split('/').pop()

            if (path === 'batch' && req.method === 'POST') {
                const { locations, service_id } = await req.json()
                if (!locations || !Array.isArray(locations) || !service_id) {
                    return new Response(JSON.stringify({ error: 'Missing data' }), { status: 400, headers: corsHeaders })
                }

                // 1. Get current provider ID from token (optional) or trust the app state
                // For security, we should verify the sender is the provider. 
                // Simplified for now: assuming authenticated caller.

                // 2. Fetch provider_id from service
                const { data: service } = await supabase
                    .from('service_requests_new')
                    .select('provider_id')
                    .eq('id', service_id)
                    .single()

                const providerId = service?.provider_id

                if (!providerId) {
                    return new Response(JSON.stringify({ error: 'Provider not found for service' }), { status: 404, headers: corsHeaders })
                }

                // 3. Batch insert into history
                const historyRows = locations.map((loc: any) => ({
                    service_id,
                    provider_id: providerId,
                    latitude: loc.lat,
                    longitude: loc.lng,
                    accuracy: loc.accuracy,
                    speed: loc.speed,
                    timestamp: loc.timestamp
                }))

                await supabase.from('service_location_history').insert(historyRows)

                // 4. Update last position in provider_locations
                const lastLoc = locations[locations.length - 1]
                await supabase.from('provider_locations').upsert({
                    provider_id: providerId,
                    latitude: lastLoc.lat,
                    longitude: lastLoc.lng,
                    updated_at: new Date().toISOString()
                })

                return new Response(JSON.stringify({ success: true, count: locations.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }

            return new Response(JSON.stringify({ error: 'Path not found' }), { status: 404, headers: corsHeaders })

        } catch (error: any) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
        }
    })
