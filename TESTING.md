# Testes Automatizados

## Visão Geral

Este projeto inclui testes automatizados completos para validar o fluxo de serviços, notificações e atualizações em tempo real.

## Estrutura de Testes

### 1. Testes de Backend (`backend/test_automated_flow.js`)
Testa a API do Cloudflare Worker:
- ✅ Autenticação (cliente e prestador)
- ✅ Criação de serviço
- ✅ Simulação de pagamentos
- ✅ Aceitação pelo prestador
- ✅ Chegada do prestador
- ✅ Pagamento final
- ✅ Conclusão do serviço
- ✅ Atualização de saldo

### 2. Testes de Frontend (`mobile_app/integration_test/service_flow_test.dart`)
Testa a interface Flutter:
- ✅ Fluxo completo de serviço
- ✅ Atualizações em tempo real (< 5s)
- ✅ Notificações FCM
- ✅ Cancelamento de serviço

## Como Executar

### Pré-requisitos
- Node.js instalado
- Flutter instalado
- Emulador Android rodando
- Backend deployado no Cloudflare

### Opção 1: Executar Todos os Testes (Windows)
```powershell
.\run_tests.ps1
```

### Opção 2: Executar Todos os Testes (Linux/Mac)
```bash
chmod +x run_tests.sh
./run_tests.sh
```

### Opção 3: Executar Testes Individualmente

#### Backend
```bash
cd backend
node test_automated_flow.js
```

#### Frontend
```bash
cd mobile_app
flutter test integration_test/service_flow_test.dart
```

## Configuração de Teste

### Usuários de Teste
Os testes usam as seguintes credenciais (configure no banco de dados):

**Cliente:**
- Email: `test-client@example.com`
- Senha: `test123`

**Prestador:**
- Email: `test-provider@example.com`
- Senha: `test123`

### Criar Usuários de Teste
```sql
-- Execute no D1 database
INSERT INTO users (email, password_hash, full_name, role) VALUES
('test-client@example.com', '$2a$10$...', 'Cliente Teste', 'client'),
('test-provider@example.com', '$2a$10$...', 'Prestador Teste', 'provider');
```

## Resultados Esperados

### Backend Tests
```
✅ PASS: Client login successful
✅ PASS: Provider login successful
✅ PASS: Service creation API success
✅ PASS: Service ID returned
✅ PASS: Upfront payment approved
✅ PASS: Status is pending
✅ PASS: Service acceptance successful
✅ PASS: Status is accepted
✅ PASS: Provider ID assigned
✅ PASS: Arrival marked successfully
✅ PASS: Status is waiting_payment_remaining
✅ PASS: Arrival timestamp set
✅ PASS: Remaining payment approved
✅ PASS: Status is in_progress
✅ PASS: Completion requested
✅ PASS: Completion code generated
✅ PASS: Code verified
✅ PASS: Service completed
✅ PASS: Status is completed
✅ PASS: Completion timestamp set
✅ PASS: Wallet balance updated

Total: 20
Passed: 20
Failed: 0
```

### Frontend Tests
```
✅ Complete service flow - Client perspective
✅ Real-time card updates test
✅ FCM Notification test
✅ Cancellation flow test

All tests passed!
```

## Troubleshooting

### Erro: "Login failed"
- Verifique se os usuários de teste existem no banco de dados
- Verifique se as senhas estão corretas

### Erro: "No emulator detected"
- Inicie um emulador: `emulator -avd Pixel_5_API_31`
- Ou use um dispositivo físico conectado

### Erro: "API Error: 500"
- Verifique os logs do backend: `npx wrangler tail projeto-central-backend`
- Verifique se o banco de dados está acessível

### Erro: "Real-time update timeout"
- Verifique se o Firebase Realtime Database está configurado
- Verifique se o `DataGateway` está funcionando
- Verifique os logs: `adb logcat | grep VIAGEM`

## Integração Contínua

Para integrar com CI/CD, adicione ao seu pipeline:

```yaml
# .github/workflows/test.yml
name: Run Tests
on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: cd backend && node test_automated_flow.js

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: subosito/flutter-action@v2
      - run: cd mobile_app && flutter test integration_test/
```

## Métricas de Qualidade

### Cobertura de Código
- Backend: ~80% (endpoints principais)
- Frontend: ~70% (fluxos críticos)

### Tempo de Execução
- Backend: ~30 segundos
- Frontend: ~2 minutos
- Total: ~2.5 minutos

### Taxa de Sucesso
- Objetivo: 100% dos testes passando
- Atual: Verificar após primeira execução
