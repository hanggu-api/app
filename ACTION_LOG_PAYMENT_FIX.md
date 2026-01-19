### 💳 Fluxo de Pagamento Restante - 2026-01-30
- **Refatoração do ServiceCard:**
  - Implementadas funções auxiliares `_buildWaitingView()`, `_buildActionButtons()` e `_buildStatusChip()` para centralizar lógica de botões e evitar duplicação.
  - **Correção de Null Safety:** Substituído acesso direto a `detail['price_estimated'] - detail['entry_amount']` por uso seguro de `_toDouble()` com verificações de null.
  - **Feedback Visual:** Adicionado `LinearProgressIndicator` na tela de busca de prestador para melhor UX.
  - **Botão Desabilitado:** Estados "Buscando prestador" e "Aguardando prestador" agora exibem botão cinza desabilitado, prevenindo cliques acidentais.
- **Status `waiting_payment_remaining`:**
  - **Prestador:** Exibe botão cinza desabilitado com texto "Aguardando Pagamento Seguro".
  - **Cliente:** Exibe botão verde ativo "Pagar Restante: R$ X" com cálculo automático do valor (70% do total).
- **Correção de Crashes:** Eliminados erros "NoSuchMethodError: '-'" e "RenderBox with no size" causados por operações aritméticas em valores nulos.
- **Correção de TypeError:** Removido código duplicado de botão de pagamento que usava `as num?` em vez de `_toDouble()`, causando erro "String is not a subtype of num" quando backend retornava valores como String.
- **Chip de Status:** Removido do cabeçalho do card (cliente e prestador) para UI mais limpa.
- **Correção de Cálculo de Pagamento:** Ajustado cálculo do valor restante para mostrar corretamente 70% do valor total (ex: R$ 15,00 → R$ 10,50) usando `price * 0.7` em vez de `price - entry`.
- **Correção de Atualização de Status Pós-Pagamento:**
  - Backend (`paymentController.ts`) agora atualiza status de `waiting_payment_remaining` → `in_progress` após aprovação do pagamento restante.
  - Notificações enviadas para cliente ("Pagamento Confirmado") e prestador ("Pagamento Recebido").
  - **Atualização Automática de UI:** Adicionado evento Socket.IO `payment_confirmed` e listener em `home_screen.dart` para recarregar lista de serviços automaticamente após pagamento, eliminando necessidade de refresh manual.

### ✅ Fluxo de Conclusão Seguro - 2026-01-30
- **Segurança de Conclusão:**
  - Implementado sistema de código de verificação para garantir que o prestador só pode concluir o serviço com a aprovação do cliente.
  - Adicionado campo `completion_code` e status `awaiting_confirmation` no backend.
  - Endpoint GET `/services/:id` sanitizado para ocultar o código de conclusão do prestador.
- **Fluxo do Prestador:**
  - Botão "Concluir Serviço" agora inicia uma solicitação (`request-completion`).
  - Nova API `/request-completion` gera código e notifica cliente.
  - Prestador deve inserir o código fornecido pelo cliente para finalizar.
- **Fluxo do Cliente:**
  - Tela de acompanhamento (`TrackingScreen`) exibe o código de verificação em destaque quando o status é `awaiting_confirmation`.
  - Instruções claras para fornecer o código ao prestador.
- **Backend:**
  - Novos endpoints: `/request-completion` e `/confirm-completion`.
  - Validação rigorosa do código antes de marcar serviço como `completed`.
  - Upload de provas (vídeo) integrado ao fluxo de confirmação.


### 🔄 Plano de Sincronização Robusta (Firebase First) - 2026-01-31

**Objetivo:** Garantir que a UI do cliente reflita OBRIGATORIAMENTE o estado do servidor/banco de dados, sem depender de eventos efêmeros que podem ser perdidos.

**Diagnóstico:**
- O sistema atual confia em eventos "dispare e esqueça" (`socket.emit`). Se o app estiver em background ou houver falha de rede momentânea, o evento é perdido e a UI fica obsoleta ("Aguardando finalização" vs "Confirmação Necessária").
- A verificação de timestamp no cliente (`RealtimeService`) pode estar descartando eventos válidos dependendo do fuso horário do dispositivo.

**Solução Arquitetural:**
1.  **Fonte de Verdade Única:** Firebase Realtime Database (RTDB) e Firestore.
2.  **Redundância:**
    - **Camada 1 (Sinalização):** Backend escreve evento no RTDB (`events/{userId}`). Cliente ouve e recarrega.
    - **Camada 2 (Data Binding):** Telas críticas (Home, Tracking) devem ouvir DIRETAMENTE o documento do serviço no Firestore/RTDB via `StreamBuilder`. Se o dado mudar no banco, a tela muda instantaneamente.
3.  **Correção de Implementação:**
    - **Backend:** Garantir que TODAS as mudanças de status (Request Completion, Confirm# Payment Fix & Type Safety Log

## 2026-01-31 - Type Safety & API Fixes
- [x] Identified crash cause: `type 'String' is not a subtype of type 'num?'` in `ApiService`.
- [ ] Fixing `createService` in `api_service.dart` to accept dynamic types and safe-parse to double.
- [ ] Reinforcing `service_card.dart` price parsing.
- [ ] Verifying `base_url` logic for Web vs Emulator.

ualizem o documento do serviço no Firestore.
    - **Frontend:**
        - Remover trava de segurança de `timestamp` (60s) no `RealtimeService` que pode causar falsos negativos.
        - Implementar listener redundante na `HomeScreen` que monitora mudanças no status do serviço diretamente.

**Próximos Passos (Execução Imediata):**
1. [x] Definir plano.
2. [ ] Backend: Auditar `services.ts` para garantir atualização do Firestore em `request-completion`.
3. [ ] Mobile: Remover verificação de timestamp de 60s em `RealtimeService.dart`.
4. [x] Mobile: Adicionar `StreamBuilder` ou listener direto na `HomeScreen` para blindar contra falhas de socket. (Implementado e Compilando).

### 💰 Gestão Financeira e Histórico (Sincronização Final) - 2026-01-31

**Implementações Realizadas:**

1.  **Sincronização em Tempo Real (Robustez):**
    -   Backend agora emite eventos explícitos `service.updated` no Firestore para estados críticos como `completion_requested`.
    -   Frontend (`ProviderHomeMobile`) atualizado para ouvir streams do Firestore, garantindo que o status "Aguardando Confirmação" apareça instantaneamente, mesmo se o Socket falhar.

2.  **Visibilidade de Serviços:**
    -   **Filtro de "Meus Serviços":** Corrigida a lógica que ocultava serviços em `awaiting_confirmation` da aba ativa.
    -   **Histórico Completo:** API `/my` atualizada para retornar serviços `completed` e `cancelled`, desbloqueando a aba "Finalizados" no app do prestador.

3.  **Sistema de Créditos (Wallet):**
    -   **Schema:** Adicionados campos `provider_amount` (ServiceRequests), `wallet_balance` (Providers) e `description`/`credit` (Transactions).
    -   **Lógica de Negócio:**
        -   Novos serviços creditam automaticamente **85% do valor estimado** na carteira do prestador após confirmação do código.
        -   Transação de crédito (`credit`) é registrada com sucesso no banco.
    -   **Correção Retroativa:** Script executado para creditar serviços legados (ex: ID `5730...`) que foram concluídos antes da feature existir.

4.  **UI da Carteira (Provider App):**
    -   **API Profile:** Endpoint `/me`- **Status:** `!kIsWeb` check implemented in `main.dart`.
- **Status:** Web compatibility for `ImagePicker` added to `client_settings_screen.dart`.
- **Status:** Refactored `NotificationService` to unify Vapid Key and improve robustness.
- **Status:** Added `databaseURL` to `firebase_options.dart` (Web Fix).
- **Status:** Optimized `RealtimeService` with presence logic (OnDisconnect) and timestamp validation.
- **Status:** Enhanced `ThemeService` with RemoteConfig integration and Web background fix.
- **Status:** Created `DataSafety` utility class for robust type conversion.
- **Maintenance:** Executed `flutter clean` & `pub get` to resolve `PathNotFoundException` in `.dart_tool`.
- **Fix:** Added `import 'package:flutter/foundation.dart';` to `client_settings_screen.dart` to resolve `kIsWeb` error.
- **Feature:** Starting implementation of "Busca Avançada" (Manual Mode) to bypass AI when needed.
- **Backend:** Created `GET /api/services/professions` to serve real dataset (Professions + Tasks) from `professions.json`.
- **Integration:** Updated Mobile App to fetch professions list from API instead of local Mock.
- **Next:** Verify if any other specific issues remain.
    -   **Frontend:** `ProviderHomeMobile` agora exibe o saldo formatado (ex: R$ 12,75) no cabeçalho, substituindo o placeholder "R$ 0,00".
    -   **Compilação:** Corrigido erro de `const` que impedia a atualização dinâmica do valor na tela.
