# 🚀 101 Service — Rodando 100% com Supabase

## 3 passos só:

### 1️⃣ Aplicar migration ao banco (RLS policies)
```powershell
.\RUN_MIGRATION.ps1
```
Se falhar, faça manualmente:
```
supabase login
supabase db connect
\i supabase/migrations/20260224120000_add_rls_patches.sql
exit
```

### 2️⃣ Rodar o app Flutter
```powershell
.\RUN_APP.ps1
```
Escolha device (Android, iOS, Web ou Mac).

### 3️⃣ Testar fluxo:
- Login com email/password (Supabase Auth)
- Criar serviço (POST → `service_requests_new`)
- Listar profissões (GET → leitura pública)
- Confirmar pagamento via Mercado Pago

---

## ✅ Checklist — app 100%:

| Item | Status |
|------|--------|
| Supabase Auth (email/Google) | ✅ Configurado em `main.dart` + Firebase |
| RLS Policies (read/write) | ✅ Aplicadas em migration |
| Realtime (live updates) | ✅ Ativado nas migrations |
| Storage buckets | ✅ Criados (avatars, portfolio, service_media, chat_media) |
| Edge Functions | ✅ ai-classify, geo, dispatch, payments, push-notifications |
| Payments (Mercado Pago) | ✅ Integrado em `paymentController` + Edge Function |
| Notifications (FCM + Supabase) | ✅ Firebase + Supabase Push |
| Location tracking | ✅ Realtime com Leaflet/Google Maps |
| App rodando | ⏳ Execute `.\RUN_APP.ps1` |

---

## 🔧 Troubleshooting rápido:

**"RLS policy error ao criar serviço"**
- Confirme que migration rodou (sem erros)
- Verifique se `users.supabase_uid` está preenchido (trigger `handle_new_user`)

**"app não conecta ao Supabase"**
- Confira `mobile_app/.env`: SUPABASE_URL e SUPABASE_ANON_KEY  
- Restart do app (`flutter clean && flutter run`)

**"Edge Functions retornam 404"**
- Confirme que funções foram deployadas no projeto (Dashboard → Functions)
- URL hardcoded: `https://mroesvsmylnaxelrhqtl.supabase.co/functions/v1`

**"FCM/Notifications não funcionam"**
- Android: ativa permissão `POST_NOTIFICATIONS` em `AndroidManifest.xml`
- iOS: ativa permissão no Xcode + provisioning profile com push entitlements
- Verifique que `firebase_options.dart` está correto para seu projeto Firebase

---

## 📁 Arquivos principais:

- **Backend**: `supabase/` (migrations, functions, config)
- **App**: `mobile_app/` (Flutter code + .env)
- **Auth**: Integration via Supabase Auth + Firebase
- **Docs**: `supabase/migrations/` contêm comentários detalhados

---

**v0.1 — 23 Fev 2026** | [Copilot Instructions](copilot-instructions.md)
