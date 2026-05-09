import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, getAuthenticatedUser, json } from "../_shared/auth.ts";

serve(async (req) => {
    const MAPBOX_TOKEN = Deno.env.get('MAPBOX_TOKEN')
    const TOMTOM_KEY = Deno.env.get('TOMTOM_API_KEY')

    if (!MAPBOX_TOKEN) console.error('⚠️ MAPBOX_TOKEN is not set in Supabase Secrets')
    if (!TOMTOM_KEY) console.error('⚠️ TOMTOM_API_KEY is not set in Supabase Secrets')

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)
        let path = url.pathname.split('/').pop()
        if (path === 'geo' || path === '') {
            path = url.searchParams.get('path') || path;
        }
        const isPublicPath = path === 'reverse' || path === 'search'
        const auth = await getAuthenticatedUser(req, isPublicPath);
        if ("error" in auth) return auth.error;

        // 1. REVERSE GEOCODING
        if (path === 'reverse') {
            const lat = url.searchParams.get('lat')
            const lon = url.searchParams.get('lon')
            if (!lat || !lon) return new Response(JSON.stringify({ error: 'Missing lat/lon' }), { status: 400, headers: corsHeaders })

            const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,poi&limit=5&language=pt`
            const res = await fetch(mapboxUrl)
            const data = await res.json()
            console.log(
                `📍 [geo/reverse] status=${res.status} code=${data?.code ?? 'n/a'} features=${Array.isArray(data?.features) ? data.features.length : 0
                } lat=${lat} lon=${lon}`,
            )

            const readContext = (feat: any, typePrefix: string) =>
                feat?.context?.find((c: any) => c.id?.startsWith(typePrefix))

            const safeStateCode = (region: any) => {
                const shortCode = region?.short_code ?? ''
                if (!shortCode || typeof shortCode !== 'string') return ''
                const parts = shortCode.split('-')
                return parts.length > 1 ? parts[1].toUpperCase() : shortCode.toUpperCase()
            }

            if (data.features && data.features.length > 0) {
                const features = data.features as any[]
                const feat =
                    features.find((f: any) => Array.isArray(f?.place_type) && f.place_type.includes('address')) ??
                    features[0]
                const region = readContext(feat, 'region')
                const place = readContext(feat, 'place') ?? readContext(feat, 'locality')
                const neighborhoodCtx =
                    readContext(feat, 'neighborhood') ??
                    readContext(feat, 'district') ??
                    readContext(feat, 'locality')

                const placeName = (feat.place_name ?? '').toString()
                const placeParts = placeName
                    .split(',')
                    .map((p: string) => p.trim())
                    .filter(Boolean)

                const stateText = (region?.text ?? '').toString()
                const cityText = (place?.text ?? '').toString()
                const neighborhoodText = (neighborhoodCtx?.text ?? '').toString()

                const streetText =
                    (feat.text ?? feat.properties?.name ?? '').toString().trim()
                const houseNumber =
                    (feat.address ??
                        feat.properties?.address ??
                        feat.properties?.house_number ??
                        '').toString().trim()

                const fallbackCity =
                    cityText ||
                    placeParts.find((p: string) => p !== stateText) ||
                    ''
                const fallbackState = stateText || placeParts[placeParts.length - 1] || ''

                // Nominatim-like response for compatibility + normalized fields
                return new Response(JSON.stringify({
                    display_name: feat.place_name,
                    street: streetText || '',
                    house_number: houseNumber || '',
                    neighborhood: neighborhoodText || '',
                    suburb: neighborhoodText || '',
                    neighbourhood: neighborhoodText || '',
                    city: fallbackCity || '',
                    state: fallbackState || '',
                    state_code: safeStateCode(region) || '',
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
            return new Response(JSON.stringify({}), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 2. SEARCH (AUTOCOMPLETE via TOMTOM)
        if (path === 'search') {
            const q = url.searchParams.get('q')
            const proximity = url.searchParams.get('proximity') // lat,lon
            const radiusKm = url.searchParams.get('radius') || '50'
            const radiusMeters = Math.round(parseFloat(radiusKm) * 1000)

            if (!q) return new Response(JSON.stringify({ error: 'Missing query' }), { status: 400, headers: corsHeaders })

            let tomtomUrl = `https://api.tomtom.com/search/2/search/${encodeURIComponent(q)}.json?key=${TOMTOM_KEY}&limit=10&language=pt-BR&countrySet=BR`

            if (proximity) {
                const [plat, plon] = proximity.split(',')
                // Use radius for biasing and strict limiting if possible
                tomtomUrl += `&lat=${plat}&lon=${plon}&radius=${radiusMeters}`
            }

            const res = await fetch(tomtomUrl)
            const data = await res.json()

            // Pós-filtro por distância Haversine — TomTom radius é apenas biasing, não filtro rígido
            let results = data.results || []
            if (proximity && results.length > 0) {
                const [plat, plon] = proximity.split(',').map(Number)
                const radiusKmNum = parseFloat(radiusKm)

                results = results.filter((r: any) => {
                    const rLat = r.position?.lat
                    const rLon = r.position?.lon
                    if (rLat == null || rLon == null) return true // Manter se sem coordenada
                    // Haversine
                    const R = 6371
                    const dLat = (rLat - plat) * Math.PI / 180
                    const dLon = (rLon - plon) * Math.PI / 180
                    const a = Math.sin(dLat / 2) ** 2 + Math.cos(plat * Math.PI / 180) * Math.cos(rLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2
                    const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
                    return distKm <= radiusKmNum
                })
            }

            // Retornar resultados já filtrados
            return new Response(JSON.stringify(results), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 3. ROUTE
        if (path === 'route' && req.method === 'POST') {
            const { from, to } = await req.json()
            if (!from || !to) return new Response(JSON.stringify({ error: 'Missing coordinates' }), { status: 400, headers: corsHeaders })

            const mapboxRouteUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=polyline&access_token=${MAPBOX_TOKEN}`
            const res = await fetch(mapboxRouteUrl)
            const data = await res.json()

            if (data.code !== 'Ok') {
                return new Response(JSON.stringify({ error: data.code }), { status: 404, headers: corsHeaders })
            }

            const route = data.routes[0]
            return new Response(JSON.stringify({
                distance_km: (route.distance / 1000).toFixed(1),
                duration_min: Math.round(route.duration / 60),
                polyline: route.geometry,
                distance_value: route.distance,
                duration_value: route.duration
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 4. FUEL PRICES
        if (path === 'fuel') {
            const state = url.searchParams.get('state')
            const city = url.searchParams.get('city')

            // Mock data consistent with previous expectations
            // In real world, this would fetch from a fuel price API
            return new Response(JSON.stringify({
                success: true,
                state: state || 'SP',
                city: city || 'Sao Paulo',
                prices: {
                    gasoline: 5.89,
                    alcohol: 3.49,
                    diesel: 6.12
                },
                updated_at: new Date().toISOString()
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 5. UBER CALCULATE FARE
        if (path === 'calculate-fare' && req.method === 'POST') {
            const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, vehicle_type_id } = await req.json()

            // 1. Get Route info from Mapbox
            const mapboxRouteUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup_lng},${pickup_lat};${dropoff_lng},${dropoff_lat}?overview=full&access_token=${MAPBOX_TOKEN}`
            const routeRes = await fetch(mapboxRouteUrl)
            const routeData = await routeRes.json()

            if (routeData.code !== 'Ok') {
                return new Response(JSON.stringify({ error: 'Route not found' }), { status: 404, headers: corsHeaders })
            }

            const route = routeData.routes[0]
            const distance_km = route.distance / 1000
            const duration_min = route.duration / 60

            // 2. Mock Vehicle Rates (In real world, fetch from vehicle_types table)
            let base = 5.0, km_rate = 2.0, min_rate = 0.5, min_fare = 8.0
            if (vehicle_type_id === 2) { // Comfort
                base = 7.0; km_rate = 2.5; min_rate = 0.6; min_fare = 12.0
            } else if (vehicle_type_id === 3) { // Moto
                base = 3.0; km_rate = 1.2; min_rate = 0.3; min_fare = 6.0
            }

            let estimated = base + (distance_km * km_rate) + (duration_min * min_rate)
            if (estimated < min_fare) estimated = min_fare

            return new Response(JSON.stringify({
                fare: {
                    estimated: parseFloat(estimated.toFixed(2)),
                    distance_km: parseFloat(distance_km.toFixed(2)),
                    duration_min: Math.round(duration_min)
                }
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        return new Response(JSON.stringify({ error: 'Path not found' }), { status: 404, headers: corsHeaders })


    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
    }
})
