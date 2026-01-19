# Guia de Deploy - Projeto Central

Este guia descreve como colocar a aplicação em produção.

## 1. Backend (API) - Cloudflare Workers 🚀

O backend principal e o webhook de pagamentos agora rodam na borda (Edge) via Cloudflare Workers.

**URL de Produção**: `https://projeto-central-backend.carrobomebarato.workers.dev/api`
**Webhook Mercado Pago**: `https://projeto-central-backend.carrobomebarato.workers.dev/api/payment/webhook`

### Configuração
- **Banco de Dados**: Cloudflare D1 (SQLite na Borda).
- **IA Bridge**: Integração interna via Service Bindings com o `ai-service`.
- **Deploy**: Realizado via Wrangler.

### Sistemas Críticos
- **Escalonamento de Notificações**: O backend implementa um loop de 30 segundos. Ele notifica os prestadores um por um, começando pelo mais próximo, e repete o ciclo indefinidamente até que o serviço seja aceito.
- **Data-Only Notifications**: Notificações para novos serviços são enviadas como mensagens silenciosas (data payload), permitindo que o Flutter controle o despertar do app.

## 2. Aplicativo Mobile (Android) 📱

### Permissões Críticas
Para que o app funcione como um app de emergência/serviço rápido:
1.  **Sobreposição de Tela (`SYSTEM_ALERT_WINDOW`)**: Necessária para que o app abra automaticamente quando houver um serviço, mesmo que o prestador esteja em outro app.
2.  **Full Screen Intent**: Permite que a oferta ocupe a tela bloqueada.

### Comandos de Compilação
```bash
# Debug com auto-install
flutter build apk --debug && adb install -r build/app/outputs/flutter-apk/app-debug.apk
```

## 3. Frontend (Web) - Firebase Hosting

O frontend web está hospedado no Firebase Hosting.

**URL de Acesso**: `https://cardapyia-service-2025.web.app`

### Como Atualizar
Ao realizar mudanças no app ou precisar apontar para um novo backend:
1. Reconstruir (dentro da pasta `mobile_app`):
   ```bash
   flutter build web --release --dart-define API_URL=https://projeto-central-backend.carrobomebarato.workers.dev/api
   ```
2. Enviar para o Firebase:
   ```bash
   firebase deploy --only hosting
   ```

## 4. Pagamentos (Mercado Pago)

1. **Webhook**:
   Configure no painel do Mercado Pago a URL de notificação:
   `https://projeto-central-backend.carrobomebarato.workers.dev/api/payment/webhook`

2. **Status**:
   O sistema utiliza a API REST direta para máxima compatibilidade na borda, processando confirmações de pagamento instantaneamente.
