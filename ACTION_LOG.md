# 📋 Relatório Consolidado de Evolução do Projeto - 101 Service
*Este documento serve como base de conhecimento para monitoramento por IA e histórico técnico.*

---

## Próximos Passos & Prioridades
- [x] Implementação de Testes de Deep Linking (Nativo).
- [ ] Otimização da infraestrutura de simulação E2E.
- **Provider-Centric UI**: Replaced the AI identification card with a vertical list of expandable professional profiles in Step 1.
- **Expandable Cards**: Implemented provider cards showing avatar, name, rating, and distance.
- **Haversine Distance**: Added backend calculation for distance in KM.
- **Fixed Syntax Errors**: Corrected a bracket imbalance in `service_request_screen_mobile.dart` that caused build failures.
- [ ] Otimização final do tempo de resposta do Chat.
- [ ] Finalização da integração com PIX (Produção).

---

## 🛠️ Infraestrutura & Backend
- **Cloudflare Migration (01/02):** O `ai_service` foi migrado para Cloudflare Workers, utilizando Hono para a API, D1 como banco de dados relacional e Vectorize para busca semântica (Embedding Model: `@cf/baai/bge-base-en-v1.5`).
- **Sincronização de Dados (01/02):** Implementado script `sync_supabase_to_d1.ts` para espelhar as profissões e tarefas do Supabase no D1. O índice Vectorize foi treinado com sucesso para todas as tarefas do catálogo.
- **Backend Edge Migration (01/02):** Iniciada migração do backend principal para Cloudflare Workers. Criado `src/worker-entry.ts` (Hono) e refatorado `prisma.ts` para suportar hibridismo D1/Postgres sem quebrar o ambiente local.

### Deploy & Automação
- **Workflow /wireless-release:** Criada automação via ADB TCP/IP para deploy sem fio em dispositivos Android físicos.
- **Vercel Automation:** Scripts para sincronização de variáveis de ambiente e deploy limpo do backend.
- **Simulador de Notificações (31/01):** Criado script `simulate_notification.ps1` que utiliza comandos ADB para injetar mensagens. Atualizado para o pacote `com.play101.app` garantindo entrega precisa.
- **Simulador FCM Real (31/01):** Nova ferramenta de teste E2E (`simulate_real_fcm.ps1`) que integra o backend ao Firebase. O script agora é **autossustentável**: ele cria serviços reais no banco de dados automaticamente para os cenários de Oferta, Chat e Chegada, garantindo que o app mobile carregue dados legítimos e não trave em telas de loading infinitas.

---

## 🔔 Sistema de Notificações & Deep Linking
### Arquitetura Uber-Style (31/01)
- **Auto-Popup:** Implementada abertura forçada do `ServiceOfferModal` em foreground. O app agora interrompe qualquer fluxo para mostrar novas ofertas.
- **Gestão de Tempo:** Cronômetro regressivo de **30 segundos** com auto-rejeição inteligente para manter a fila de serviços fluida.
- **Feedback Sonoro:** Som longo e contínuo (`chamado.mp3`) configurado em loop enquanto o modal está ativo.

### Robustez Técnica (NotificationService)
- **Filtro de Papéis:** Lógica para ignorar notificações irrelevantes (ex: prestador recebendo aviso de sua própria chegada).
- **Tratamento de Payloads:** Conversão explícita de IDs para `String`, prevenindo falhas de roteamento no `GoRouter`.
- **Memory Safety:** Implementado sistema de `StreamSubscription` para limpeza de listeners no logout.
- **Deep Linking Nativo:** Configurado `AndroidManifest.xml` com Esquemas de URL (`service101://app`) e App Links. Rotas de Chat e Rastreamento migradas para formato parametrizado (`/chat/:serviceId`), removendo dependência de parâmetros `extra` voláteis.

---

## 🎨 Interface & UX (Premium Experience)
### Card de Busca & Feedback
- **Motion Design:** Substituição de imagens estáticas por animação de vídeo em loop via widget `AssetVideoPlayer`.
- **Fallbacks Inteligentes:** Sistema de "Plano B" que exibe ícones de reserva caso o player de vídeo encontre erros de codec no emulador.
- **Status Pills:** Botão de busca transformado em pílula de carregamento moderna com `CircularProgressIndicator`.
- **Design Híbrido Uber vs Agendamento (01/02):** Refatoração da lógica de solicitação. Serviços móveis agora operam em "Modo Uber" (ocultando a lista de profissionais e mostrando um card de identificação direta com preço), enquanto serviços fixos mantêm o modelo de agendamento por lista.
- **Refinamento de UX (01/02):** Remoção de botões redundantes e atualização do CTA principal para "Solicitar serviço", tornando a interface mais limpa e direta.

### Busca Avançada & IA
- **Redesign Wide:** Botão de busca avançada agora ocupa largura total com estética premium e fontes ampliadas.
- **Fluxo de IA:** Frontend agora exibe o título específico da tarefa (ex: "Conserto de Torneira") retornado pela classificação neural, em vez de categorias genéricas.

---

## 💰 Fluxo Financeiro (PIX & Wallet)
### Transparência no Orçamento
- **Resumo Detalhado:** Implementada exibição de Total, Entrada (30%) e Restante (70%) antes da contratação.
- **Segurança de Tipos:** Correção de bugs de conversão de moeda (num/String -> double) em toda a cadeia de pagamento.
- **Sincronização Atômica:** Integração do `DataSyncService` na simulação de PIX e nos Webhooks reais. Confirmações de pagamento agora disparam atualizações instantâneas no Firestore e eventos de Socket.IO, removendo a necessidade de refresh manual pelo usuário.
- **Sistema de Saque:** Diálogo de retirada para prestadores com validação de saldo em tempo real.
- **Finalização com Prova Material (01/02):** Implementado encerramento de serviço reforçado. O sistema agora exige código de 6 dígitos gerado pelo backend e fornecido pelo cliente, além de gravação obrigatória de vídeo (Prova Material) pelo prestador. Criado widget `ProofVideoPlayer` para visualização dessa evidência em ambas as pontas (Cliente e Prestador).
- **Validação de Código em Tempo Real (01/02):** Adicionado feedback visual instantâneo no campo de código (borda verde/vermelha) para facilitar a conferência sem precisar submeter o formulário.
- **Avaliação de Serviço (01/02):** Implementado sistema de reviews (estrelas + comentário) que surgem no card do cliente após a conclusão. O backend utiliza lógica de `upsert` para evitar duplicidade e sincroniza as métricas de ranking (`rating_avg`) do prestador em tempo real via Firestore. Adicionado estado de sucesso imediato na UI mobile para melhor feedback ao usuário.

## 🏛️ Gestão de Dados & Consistência
- **DataGateway (Mobile):** Criada fachada unificada no Flutter que decide onde buscar o dado (Firestore vs Supabase). Se mudarmos de banco no futuro, a UI não percebe.
- **Health Check de Sincronia:** O `DataSyncService` agora enriquece o Firestore com metadados (Ratings, Ícones) para evitar múltiplas chamadas de API.
- **Chat Persistente (31/01):** Implementado arquivamento histórico. As mensagens agora são salvas primeiro no Supabase (Data Source of Truth) e depois propagadas via Firestore para entrega real-time.

---

## 🐛 Hotfixes Recentes
- **Build Error (Timer):** Adicionado `import 'dart:async'` no modal de oferta.
- **Android 14/15:** Correção de permissões de `FOREGROUND_SERVICE` e íconificação transparente na barra de status.
- **Linker Errors:** Recuperação de `styles.xml` e manifestos corrompidos durante atualizações de versão.
- **Firestore Undefined Fix:** Implementada higienização global de payloads no `FirebaseService` e flag `ignoreUndefinedProperties` para prevenir falhas de sincronização quando campos opcionais estão vazios.
- **Status Regression Fix:** Corrigida falha no `PaymentController` que resetava o despacho de prestadores ao confirmar pagamentos de 70%. O vínculo com o prestador agora é preservado e o status avança corretamente para `in_progress`.
- **Visibilidade do Prestador (31/01):** Corrigido filtro na `ProviderHomeMobile` que ocultava serviços em status `pending` e `waiting_payment` para o profissional.
- **Sincronização Atômica de Pagamento (31/01):** Implementada emissão de eventos socket bi-direcionais no `PaymentController`.
- **Navegação Unificada do Prestador (31/01):** Unificada a ação de clique do card e do botão "Encerrar serviço" na `ProviderHomeMobile`. Ambos agora direcionam para a página de detalhes do serviço para manter a consistência do fluxo.
- **Map Zoom Crash (01/02):** Corrigido erro de asserção `zoom.isFinite` no `flutter_map` que ocorria quando o prestador já estava no local do serviço (origem == destino).

---
---

## 🚀 Migração Final & Otimização de Performance (02/02)
### Infraestrutura Online (Cloudflare D1 + Workers)
- **Migração para Cloudflare Workers**: Transição bem-sucedida do Backend Principal e do Serviço de IA para a Edge Network do Cloudflare.
- **D1 Database**: Banco de dados relacional distribuído (`ai-service-db`) em produção com 38 profissões e 227 tarefas ativas.
- **Workers AI & Vectorize**: O `ai_service` foi otimizado (92KB) para rodar nativamente no Cloudflare, removendo dependências pesadas do Node.js (`Xenova`) e utilizando bindings diretos (`env.AI`).

### Atualização Mobile
- **Production Endpoints**: App Mobile (`api_service.dart`) reconfigurado para usar o Backend Cloudflare (`https://projeto-central-backend.carrobomebarato.workers.dev`).
- **Ciclo Completo**: O App chama o Backend -> Backend chama D1 e AI Service -> AI Service usa Vectorize/AI -> Resposta retorna ao App.

### URLs de Produção
- Backend: `https://projeto-central-backend.carrobomebarato.workers.dev`
- AI Service: `https://ai-service.carrobomebarato.workers.dev`

### Correção de Notificações e Serviços Disponíveis (03/02)
- **Endpoints Implementados**: Adicionados `/api/services/available` (retorna serviços baseado em profissão e proximidade de 50km) e corrigido `/api/services/my` para filtrar apenas serviços do prestador autenticado.
- **FCM Token Persistence**: Corrigido endpoint `/api/notifications/register-token` para salvar o token FCM no banco de dados (anteriormente apenas logava no console).
- **Matching Inteligente**: Sistema agora busca profissões do prestador, localização, e filtra serviços por status (`pending`, `offered`) e sem provider assignado.
- **Push Notifications**: Com os tokens FCM salvos, prestadores agora recebem notificações quando novos serviços correspondentes são criados.

- **Correção de Notificações (FCM v1 & Lock Screen)** (05/02):
    - [x] Backend: Adicionado `visibility: 'PUBLIC'`, `notification_priority: 'PRIORITY_MAX'` e `sound: 'iphone_notificacao'`.
    - [x] Mobile: Implementado `_getValidContext()` para aguardar o Navigator e resolver falhas ao abrir o app via notificação em estado *terminated*.
    - [x] Build: Corrigido erro de pacotes no modo Release (`integration_test`).

- **Adiar Notificações pós-Pagamento** (05/02):
    - [x] Backend: Criada função `triggerServiceNotifications` para centralizar disparo de FCM.
    - [x] Backend: Removido disparo imediato na criação do serviço (`POST /api/services`).
    - [x] Backend: Integrado disparo no Webhook do Mercado Pago e no Check Manual de Pagamento.
    - [x] Objetivo: Garantir que prestadores só vejam ofertas de serviços cujas taxas de entrada já foram pagas.

---
*Gerado em: 05/02/2026 por Antigravity AI.*

- **Correção "Zero Price" e Modal Estilo Uber (06/02)**:
    - [x] **Zero Price Fix**: Modal agora aceita fallback de `price` no payload da notificação quando `provider_amount` está ausente.
    - [x] **Estabilidade**: Timeout de 3s no Geolocator para evitar travamentos do modal.
    - [x] **Uber-Style Notification (Android 10+)**: 
        - Configurado canal `high_importance_channel_v3` com `Importance.max`.
        - Implementado `Category.call` e `FullScreenIntent` para romper bloqueio de tela.
        - Adicionado `requestOverlayPermission()` no boot para garantir acesso de "Sobreposição".
        - Persistência de payload offline via `SharedPreferences` para garantir abertura mesmo se o app estava "killado".

- **Estabilização de Notificações (FCM v1) (13/02)**:
    - [x] **Restore Visible Banner**: Reativado o bloco `notification` no FCM v1 para mensagens urgentes. Banners visíveis são mais confiáveis que payloads "data-only" em background.
    - [x] **Payload Redundancy**: Copiado `title` e `body` para dentro do mapa `data`, garantindo acesso aos dados mesmo se o banner for ignorado.
    - [x] **Deduplicação de Modal**: Implementada trava de 5 segundos no `NotificationService` (Mobile) para evitar abertura dupla do modal de oferta (concorrência entre Foreground e Background/Isolate).
    - [x] **Melhoria de Debug**: Adicionados logs detalhados no processo de abertura de diálogos do Flutter.
    - [x] **Fix Critical SQL & Auth**:
        - Adicionado status `offered` na constraint CHECK do banco de dados (via migração manual de tabela).
        - Corrigida sanitização da chave privada do FCM (removendo quebras de linha literais e reais).
        - Corrigida lógica de log de sucesso no `index.ts` (verificava objeto ao invés de boolean).

---
*Gerado em: 13/02/2026 por Antigravity AI.*
- **Estabilização e UX do Prestador (06/02)**:
    - [x] **Worker 500 Fix**: Corrigido erro crítico `deleteAllAlarms` -> `deleteAlarm` no Durable Object `DispatchManager`, desbloqueando o fluxo de aceite de serviços.
    - [x] **Card Expansível (Home Prestador)**:
        - Refatoração do `ProviderServiceCard` para incluir mapa, distância, tempo e preço dentro do próprio card (expandido).
        - Integração de botões de ação ("Cheguei", "Iniciar Deslocamento") diretamente na lista.
        - **Refinamento UI (Step 2660)**:
            - Header agora exibe o **Título do Serviço** (ex: "Conserto de Fechadura") em vez da Profissão.
            - Botões complexos removidos. Mantido apenas o botão **"Cheguei no Local"** dentro do card expandido.
            - **Atualização Backend (Step 2760)**: Modificado `/api/services/my` e `/api/services/available` para fazer `LEFT JOIN task_catalog`, retornando o nome específico do serviço em `title`.
            - **Correção da Criação (Step 2827)**: Atualizado endpoint `POST /api/services` para inserir o `task_id`.
            - **Robustez (Step 2940)**: Adicionada validação de `task_id` no backend antes da inserção. Se o ID enviado pelo app for inválido, o serviço é criado com `task_id=NULL` para evitar erro 500.
            - **Fluxo de Chegada (Step 3060)**: Implementado "Cheguei no Local". O botão atualiza para "Aguardando Pagamento", notifica o cliente e abre o modal de pagamento.
            - **Ajuste de Layout (Step 3120)**: Reduzida a margem lateral dos cards de serviço na tela do prestador (de 24px para 4px) para ocupar quase toda a largura da tela.
            - **Refinamento Final**: Removido o campo "Preço" do grid de informações do card, conforme solicitado.
        - Correção de erro de compilação `AppTheme.primaryColor`.

---

---
*Gerado em: 18/02/2026 por Antigravity AI.*
- **Correção de Loop Infinito no Despachante e Delete Cascade (18/02)**:
    - [x] **Dispatcher Fix**: Substituído o limite hardcoded de 20 ciclos pela configuração dinâmica `maxCycles` (4) no `index.ts`. Isso resolve o bug onde serviços ficavam presos em "Ciclo 17 de 4".
    - [x] **Service Deletion Cascade**: Implementado `ON DELETE CASCADE` nas tabelas `appointments`, `chat_messages` e `service_edit_requests`.
    - [x] **Data Integrity**: Corrigido erro de FK no `propose-schedule` ao atualizar IDs de usuário inválidos em serviços antigos de teste.
---
*Gerado em: 18/02/2026 por Antigravity AI.*
- **Correção de Loop Infinito no Despachante e Delete Cascade (18/02)**:
    - [x] **Dispatcher Fix**: Substituído o limite hardcoded de 20 ciclos pela configuração dinâmica `maxCycles` (4) no `index.ts`. Isso resolve o bug onde serviços ficavam presos em "Ciclo 17 de 4".
    - [x] **Service Deletion Cascade**: Implementado `ON DELETE CASCADE` nas tabelas `appointments`, `chat_messages` e `service_edit_requests`.
- **Otimização de Disponibilidade de Serviços (18/02)**:
    - [x] **Backend Fix**: Atualizado endpoint `/api/services/available` para retornar apenas serviços com status `open_for_schedule`.
    - [x] **Impacto**: Serviços em dispatch (`pending`) agora ficam invisíveis na lista "Disponíveis" do app, aparecendo apenas via Notificação Push até que o ciclo de tentativas se esgote.