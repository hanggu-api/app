# Edge Functions do Supabase

## 1. push-notifications

Esta função é acionada por um **Database Webhook** sempre que o status de um serviço (`service_requests_new`) é alterado.
Ela avalia as mudanças de status e envia uma Push Notification (FCM) ao Cliente ou Prestador.

### Como Fazer o Deploy:

1. Tenha o Supabase CLI instalado na sua máquina (`npm install -g supabase`).
2. Acesse a raiz do projeto e faça login:
   ```bash
   supabase login
   supabase link --project-ref <SUA_PROJECT_REF_AQUI>
   ```
3. Defina os *Secrets* da Edge Function no ambiente de produção:
   ```bash
   supabase secrets set FCM_SERVER_KEY="SuaChaveDoServidorFirebaseLegada"
   ```
   *(Atenção: A função utiliza a chave legada do Firebase. Pegue-a em Configurações do Projeto Firebase -> Cloud Messaging -> Cloud Messaging API (Legada))*
4. Faça o Deploy da função:
   ```bash
   supabase functions deploy push-notifications --no-verify-jwt
   ```

### Como Configurar o Database Webhook:
No [Painel do Supabase](https://app.supabase.com/):
1. Vá em **Database** -> **Webhooks**.
2. Clique em **Create Webhook**.
3. Escolha a tabela `service_requests_new`.
4. Selecione os eventos: **Insert** e **Update**.
5. Em "Type of webhook" escolha **Supabase Edge Functions**.
6. Selecione a função `push-notifications` que você acabou de fazer deploy.
7. O método HTTP será selecionado como POST automaticamente. Salve.

Pronto! Todas as atualizações diretas no banco feitas pelo Aplicativo Flutter acionarão as Push Notifications nativamente.
