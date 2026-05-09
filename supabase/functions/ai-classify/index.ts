
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders, getAuthenticatedUser, json } from '../_shared/auth.ts'
import { CerebrasService } from '../_shared/cerebras.ts'

// Configurações do Cerebras
const CEREBRAS_API_KEY = Deno.env.get('CEREBRAS_API_KEY') || '';
const CEREBRAS_MODEL = 'llama3.1-8b';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const auth = await getAuthenticatedUser(req)
    if ('error' in auth) return auth.error

    const { query } = await req.json()
    if (!query) throw new Error('Query não fornecida')

    // Inicializa Supabase e Cerebras
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )
    const cerebras = new CerebrasService(CEREBRAS_API_KEY, CEREBRAS_MODEL)

    // 0. Normalização da Query para Cache
    const normalizedQuery = query.trim().toLowerCase();
    
    // 1. Tentar ler do Cache (TTL: 7 dias)
    const SEVEN_DAYS_AGO = new Date();
    SEVEN_DAYS_AGO.setDate(SEVEN_DAYS_AGO.getDate() - 7);

    const { data: cacheRecord, error: cacheError } = await supabase
      .from('ai_classification_cache')
      .select('response_data')
      .eq('query_hash', normalizedQuery)
      .gt('created_at', SEVEN_DAYS_AGO.toISOString())
      .single();

    if (cacheRecord && !cacheError) {
      console.log(`Cache HIT para: "${normalizedQuery}"`);
      return json({ 
        ...cacheRecord.response_data, 
        cache_hit: true 
      }, 200);
    }

    console.log(`Cache MISS para: "${normalizedQuery}". Processando via Cerebras...`);

    // 2. Coleta profissões para contexto
    const { data: professions } = await supabase
      .from('professions')
      .select('id, name')
      .order('name');
    
    // 2. Classifica a profissão via Cerebras
    console.log(`Classificando query: "${query}"`);
    const professionId = await cerebras.classifyProfession(query, professions || []);
    console.log(`Profissão ID detectada: ${professionId}`);
    
    // 3. Expande a query (Pedindo formato limpo)
    const expandedRaw = await (async () => {
      try {
        const prompt = `Liste 5 palavras-chave curtas (apenas as palavras) relacionadas a: "${query}". Responda apenas com as palavras separadas por vírgula.`;
        return await cerebras.chat(prompt, 0.1, 50);
      } catch (e) {
        return query;
      }
    })();
    
    // Limpa a lista de termos (remove hífens, espaços extras e quebras de linha)
    const terms = expandedRaw
      .split(/[\n,;]+/)
      .map(t => t.replace(/^[-\s*]+/, '').trim())
      .filter(t => t.length > 2);
    
    console.log(`Termos de busca limpos:`, terms);

    // 4. Busca no catálogo de tarefas
    let searchQuery = supabase.from('task_catalog').select('*, professions(name)');
    
    // Filtro por profissão (Prioridade)
    if (professionId) {
      searchQuery = searchQuery.eq('profession_id', professionId);
    }

    // Criamos um filtro OR dinâmico para os termos
    // Ex: name.ilike.%barba%,keywords.ilike.%barba%,name.ilike.%corte% ...
    const orFilter = terms.flatMap(term => [
      `name.ilike.%${term}%`,
      `keywords.ilike.%${term}%`
    ]).join(',');

    const { data: results, error: searchError } = await searchQuery
      .or(orFilter)
      .eq('active', true)
      .limit(10);

    if (searchError) throw searchError;

    // 5. Reranking Simples
    const sorted = results?.sort((a, b) => {
       const aScore = (a.name.toLowerCase().includes(query.toLowerCase()) ? 2 : 0) + 
                     (a.profession_id === professionId ? 1 : 0);
       const bScore = (b.name.toLowerCase().includes(query.toLowerCase()) ? 2 : 0) + 
                     (b.profession_id === professionId ? 1 : 0);
       return bScore - aScore;
    });

    if (!sorted || sorted.length === 0) {
      return json({
        found: false,
        ambiguous: false, 
        message: 'Nenhum serviço encontrado',
        query,
        terms
      }, 200);
    }

    const bestMatch = sorted[0];

    const response = {
      ...formatResponse(bestMatch),
      candidates: sorted.map(task => ({
        id: task.id,
        task_id: task.id,
        name: task.name,
        task_name: task.name,
        unit_price: task.unit_price,
        price: task.unit_price,
        profession_name: task.professions?.name,
        profession_id: task.profession_id
      }))
    };

    // 6. Salva no Cache para futuras requisições
    // Não aguardamos o insert (fire-and-forget) para não aumentar a latência
    supabase.from('ai_classification_cache')
      .upsert({
        query_hash: normalizedQuery,
        query_text: query,
        response_data: response,
        created_at: new Date().toISOString()
      })
      .then(res => {
        if (res.error) console.error('Erro ao salvar cache:', res.error);
        else console.log('Resultado salvo no cache com sucesso.');
      });

    // Formata a resposta com o melhor match + lista de candidatos
    return json(response, 200);

  } catch (err: any) {
    console.error('Edge function error:', err);
    return json({ 
       error: 'Internal Server Error', 
       details: err.message,
       found: false 
    }, 500);
  }
})

function formatResponse(task: any) {
  return {
    encontrado: true,
    found: true,
    profissao: task.professions?.name || 'Geral',
    profession_name: task.professions?.name || 'Geral', // Compatibilidade UI
    profession_id: task.profession_id,
    task_id: task.id,
    name: task.name,
    task_name: task.name,
    price: task.unit_price,
    pricing_type: task.pricing_type,
    unit_name: task.unit_name,
    engine: 'cerebras_llama3.1',
    score: 0.95, // Dummy score para a UI
    cache_hit: false
  };
}
