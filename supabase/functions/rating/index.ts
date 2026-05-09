import { badRequest, corsHeaders, ok } from '../_v1_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  const action = body?.action ?? 'ping';

  if (action === 'ping') {
    return ok({
      success: true,
      action,
      timestamp: new Date().toISOString(),
    });
  }

  return badRequest(`Action not implemented: ${action}`);
});
