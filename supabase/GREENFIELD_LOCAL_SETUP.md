# Supabase Local Setup (Greenfield)

## O que foi feito

- Migrações legadas foram isoladas em `supabase/migrations_legacy/`.
- A pasta ativa `supabase/migrations/` mantém apenas:
  - `20260407210000_greenfield_v1.sql`
- Seed automático foi desativado em `supabase/config.toml` para evitar dependências do schema antigo.

## Subir ambiente local

```bash
cd supabase
supabase stop --no-backup
supabase start
```

## Verificar URLs/keys locais

```bash
supabase status -o env
```

## Smoke test das funções v1

```bash
ENV_OUT=$(supabase status -o env)
FUNCTIONS_URL=$(printf '%s\n' "$ENV_OUT" | rg '^FUNCTIONS_URL=' | sed 's/^FUNCTIONS_URL="\(.*\)"$/\1/')
ANON_KEY=$(printf '%s\n' "$ENV_OUT" | rg '^ANON_KEY=' | sed 's/^ANON_KEY="\(.*\)"$/\1/')

for fn in auth profile service-request offer assignment tracking payment rating notification; do
  curl -s "$FUNCTIONS_URL/$fn" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    -d '{"action":"ping"}'
  echo
 done
```

## Observação

O Supabase CLI ainda pode exibir warnings sobre funções legadas ausentes durante o boot. Isso não bloqueia o stack greenfield atual.
