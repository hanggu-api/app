import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders, getAuthenticatedUser, json } from '../_shared/auth.ts'

// IA desativada/removida do projeto.
serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const auth = await getAuthenticatedUser(req)
  if ('error' in auth) return auth.error

  return json({ error: 'AI disabled' }, 410)
})

