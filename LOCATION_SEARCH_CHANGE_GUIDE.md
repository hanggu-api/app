# Guia prático — Busca inteligente (TomTom) e segurança

Objetivo: instruções passo-a-passo para aplicar manualmente as mudanças no backend/mobile para proteger a chave TomTom, reduzir chamadas externas, e adicionar suporte a aliases/variantes.

**Resumo rápido**
- Remover chave hard-coded e usar `TOMTOM_API_KEY` nas configurações/ambiente.
- Adicionar rate-limiter na rota `/api/location/search` (recomendo Workers KV para contadores).
- Mover o mapa de aliases para D1 (tabela `aliases`) e criar endpoints admin mínimos.
- Gerar variantes do termo pesquisado e consultar cache D1 (`cached_addresses`) por variante antes de acionar TomTom.
- Atualizar o cliente móvel para enviar `proximity=lat,lon` quando disponível.

**Arquivos principais a editar**
- [backend/worker/index.ts](backend/worker/index.ts#L1) — rota `/api/location/search`, geração de variantes, chamada TomTom.
- [mobile_app/lib/services/api_service.dart](mobile_app/lib/services/api_service.dart#L1) — incluir `proximity` no `searchLocation()`.

---

**Passo 1 — Rotacionar e remover chave TomTom (urgente)**
1. No painel TomTom, gere uma nova API key.
2. Configure a nova chave como segredo/binding no ambiente de execução (Cloudflare Workers `wrangler secret put TOMTOM_API_KEY` ou a UI de secrets do seu host).
3. Antes de commitar, remova a chave antiga do código. No arquivo `backend/worker/index.ts`:
   - Substitua qualquer string com a chave pelo uso de `env.TOMTOM_API_KEY` (ou `process.env.TOMTOM_API_KEY` dependendo do runtime).
   - Exemplo (Cloudflare Workers style):

```ts
const TOMTOM_KEY = env.TOMTOM_API_KEY;
if (!TOMTOM_KEY) {
  console.error('TOMTOM_API_KEY não configurada em ambiente');
  return c.json({ success: false, error: 'TOMTOM API key não configurada' }, 500);
}
// usar TOMTOM_KEY na URL
```

4. Rotacione (desative) a chave antiga no painel TomTom e garanta que nenhum outro serviço dependa dela.
5. (Opcional) Limpe o histórico Git se a chave ficou comprometida (`git filter-repo` / `git filter-branch`), e force-push para o repositório remoto **após** coordenar com a equipe.

---

**Passo 2 — Adicionar rate-limiter na rota `/api/location/search`**
Recomendação: usar Workers KV (rapidez e persistência simples). Política sugerida: 60 requisições por minuto por IP.

1. Criar namespace KV: `wrangler.toml` adicione `kv_namespaces` ou via painel.
2. Implementação mínima (exemplo conceitual para `backend/worker/index.ts`):

```ts
// pseudocódigo
const key = `rl:${ip}`;
const now = Date.now();
const bucket = await RATE_KV.get(key);
if (bucket && bucket.count >= 60 && now - bucket.ts < 60000) {
  return c.json({ success: false, error: 'Rate limit' }, 429);
}
// incrementar contador com ttl 60s
```

3. Alternativa: se estiver usando Node/Express no local, use `rate-limiter-flexible` com Redis ou memória local (dev).
4. Adicione cabeçalho `Retry-After` nas respostas 429.

---

**Passo 3 — Persistir `ALIAS_MAP` em D1 (schema e migration manual)**
Criar tabela `aliases` (D1/SQLite). Sugestão de esquema:

```sql
CREATE TABLE IF NOT EXISTS aliases (
  id TEXT PRIMARY KEY,
  canonical TEXT NOT NULL,
  variant TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_alias_variant ON aliases(variant);
```

1. Execute a criação via D1 console ou script SQL (`backend/ai_service/d1_schema.sql` ou equivalente).
2. Popular inicialmente com os pares atuais (`mix mateus`, `farmacia rodoviaria`, etc.).

---

**Passo 4 — Scaffold de endpoints admin para aliases**
Adicionar endpoints (protegidos por autenticação/ACL) para CRUD básico:
- `GET /api/admin/aliases` — lista aliases
- `POST /api/admin/aliases` — body: `{ canonical: string, variant: string }`
- `DELETE /api/admin/aliases/:id`

Implementar no mesmo arquivo `backend/worker/index.ts` como rota protegida, ou criar `backend/src/routes/aliases.ts` se usar Express.
Exemplo curl para criação:

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"canonical":"mix mateus","variant":"mix da rodoviaria"}' \
  https://API_URL/api/admin/aliases
```

---

**Passo 5 — Gerar variantes e consultar cache D1 antes de chamar TomTom**
No handler de `/api/location/search`:
1. Normalizar a query (remover acentos, pontuação, toLowerCase, colapsar espaços). Função `normalizeString()`.
2. Gerar variantes:
   - tokens individuais
   - bigrams (pares de tokens adjacentes)
   - expandir variantes a partir da tabela `aliases` (buscar where variant LIKE '%token%') e incluir `canonical` e outras `variant`s
3. Para cada variante (preferir as mais longas primeiro) executar consulta em `cached_addresses`:

```sql
SELECT * FROM cached_addresses WHERE search_query LIKE '%' || ? || '%' LIMIT 20
```

4. Se houver hits, retornar imediatamente com `source: 'cache'` e qual variante casou.
5. Só se não houver hits, chamar TomTom usando `TOMTOM_API_KEY` e parâmetros de `proximity` (biasLat,biasLon).
6. Persistir resultado de TomTom em `cached_addresses` (fire-and-forget) com `search_query` normalizado e TTL/`updated_at`.

---

**Passo 6 — Atualizar cliente móvel para enviar `proximity`**
Arquivo a editar: [mobile_app/lib/services/api_service.dart](mobile_app/lib/services/api_service.dart#L1)
1. Modificar `searchLocation(q, {double? lat, double? lng})` para anexar `&proximity=${lat},${lng}` quando `lat`/`lng` existirem.
2. Testar no emulador: quando o app pedir autocomplete, verifique no backend logs que `proximity` foi recebido.

Exemplo de URL: `/api/location/search?q=mix%20da%20rodoviaria&proximity=-23.561,-46.656`

---

**Passo 7 — Testes manuais e verificação**
1. Teste local: após atualizar `TOMTOM_API_KEY` e aplicar rate-limiter, enviar requests:

```bash
curl "https://API_URL/api/location/search?q=mix%20da%20rodoviaria"
curl "https://API_URL/api/location/search?q=farmacia%20rodoviaria&proximity=-23.561,-46.656"
```

2. Verificar respostas: cache hits devem vir com `source: 'cache'` e `matched_variant`.
3. Forçar 429 testando >60 requisições/min pelo mesmo IP.
4. Testar admin aliases CRUD com curl.

---

**Passo 8 — Monitoramento e follow-ups**
- Adicionar logs para contagem de TomTom calls (metric) e alertas quando > X/day.
- Implementar circuit-breaker/backoff para 429/5xx do TomTom.
- Considerar TTL de cache (ex.: 7 dias) e limpeza de `cached_addresses` periódica.

---

**Snippets úteis**
- Normalização (TS): use `str.normalize('NFKD').replace(/\p{Diacritic}/gu, '')` e regex para remover não-alfa.
- Exemplo curto para substituir key na URL:

```ts
const key = env.TOMTOM_API_KEY;
const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(q)}.json?key=${key}&limit=10&lat=${lat}&lon=${lon}`;
```

---

Se quiser, posso também: (A) aplicar automaticamente as mudanças A+B (remover chave + rate-limiter simples), ou (B) gerar os patches/PRs para você revisar. Diz qual opção prefere.
