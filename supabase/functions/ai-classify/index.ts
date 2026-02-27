import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// AI features are available via Supabase.ai in Edge Functions (certain regions/versions)
// Alternatively, we can use Transformers.js via esm.sh
// For maximum stability, we use the match_tasks RPC assuming embeddings are generated here.

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { text } = await req.json()
        if (!text) {
            return new Response(JSON.stringify({ error: 'Missing text' }), { status: 400, headers: corsHeaders })
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Gerar Embedding para o texto de consulta via Gemini API
        let queryEmbedding: number[];

        try {
            const geminiKey = Deno.env.get('GEMINI_API_KEY');
            if (!geminiKey) throw new Error('GEMINI_API_KEY is not set in Edge Function');

            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiKey}`;
            const geminiResponse = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'models/gemini-embedding-001',
                    content: { parts: [{ text: text }] },
                    outputDimensionality: 768
                })
            });

            if (!geminiResponse.ok) {
                const errBody = await geminiResponse.text();
                throw new Error(`Gemini API error: ${geminiResponse.status} - ${errBody}`);
            }

            const geminiData = await geminiResponse.json();
            queryEmbedding = geminiData.embedding.values;
        } catch (e: any) {
            console.error('Gemini Embedding error:', e);
            throw new Error('Falha ao gerar embedding com Gemini API: ' + e.message);
        }

        // 2. Chamar o RPC match_tasks
        const { data: matches, error: matchError } = await supabase.rpc('match_tasks', {
            query_embedding: queryEmbedding,
            match_threshold: 0.5, // Similaridade mínima
            match_count: 5        // Top 5 resultados
        })

        if (matchError) {
            console.error('Match error:', matchError);
            throw matchError;
        }

        const bestMatch = matches && matches.length > 0 ? matches[0] : null;

        return new Response(JSON.stringify({
            encontrado: !!bestMatch,
            profissao: bestMatch ? bestMatch.profession_name : 'Geral',
            id: bestMatch ? bestMatch.profession_id : 0, // Adicionado para compatibilidade com o app
            name: bestMatch ? bestMatch.profession_name : '', // Adicionado para compatibilidade
            category_id: bestMatch ? bestMatch.category_id : 1,
            category_name: 'Geral', // Placeholder
            task_id: bestMatch ? bestMatch.id : null,
            task_name: bestMatch ? bestMatch.task_name : null,
            price: bestMatch ? bestMatch.unit_price : 0,
            pricing_type: bestMatch ? bestMatch.pricing_type : 'fixed',
            unit_name: bestMatch ? bestMatch.unit_name : 'unidade',
            service_type: bestMatch ? bestMatch.service_type : 'at_client',
            score: bestMatch ? bestMatch.similarity : 0,
            candidates: matches ? matches.map(m => ({
                id: m.profession_id,
                name: m.profession_name,
                task_name: m.task_name,
                price: m.unit_price,
                service_type: m.service_type,
                score: m.similarity
            })) : []
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (error: any) {
        console.error('Edge Function Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
