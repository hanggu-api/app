# 📋 Guia de Integração - Melhorias de Performance & Confiabilidade

Este documento descreve como integrar os 8 novos serviços criados para resolver problemas críticos da plataforma 101 Service.

## ✅ Status das Implementações

| # | Componente | Arquivo | Status | Integração |
|---|------------|---------|--------|-----------|
| 1 | LocationService | `mobile_app/lib/services/location_service.dart` | ✅ Criado | Pending |
| 2 | RefundService | `backend/src/services/refundService.ts` | ✅ Criado | Pending |
| 3 | ServiceSyncService | `mobile_app/lib/services/service_sync_service.dart` | ✅ Criado | Pending |
| 4 | RateLimiter | `backend/src/middleware/rateLimiter.ts` | ✅ Criado | Pending |
| 5 | ProviderLocationCache | `backend/src/services/providerLocationCache.ts` | ✅ Criado | Pending |
| 6 | DispatcherImproved | `backend/src/services/providerDispatcher_improved.ts` | ✅ Criado | Pending |
| 7 | CompressionService | `backend/src/services/compressionService.ts` | ✅ Criado | Pending |
| 8 | Dependencies | `package.json` + `pubspec.yaml` | ✅ Atualizado | Pending |

---

## 🔧 Integração Backend (Node.js)

### 1. Adicionar Rate Limiting Middleware (app.ts)

```typescript
import { rateLimitLocation, rateLimitDispatch, rateLimitPayment } from './middleware/rateLimiter';
import { decompressRequest } from './services/compressionService';

app.use(decompressRequest);

// Aplicar rate limiting em rotas específicas
app.post('/api/location/batch', rateLimitLocation, locationBatchHandler);
app.post('/api/services', rateLimitDispatch, servicesCreateHandler);
app.post('/api/payment/process', rateLimitPayment, paymentProcessHandler);
```

### 2. Integrar ProviderLocationCache em providerDispatcher (services.ts)

```typescript
import { ProviderLocationCache } from './services/providerLocationCache';
import { RefundService } from './services/refundService';
import { DispatcherImproved } from './services/providerDispatcher_improved';

// No handler de criação de serviço
export async function createServiceWithDispatch(req: AuthRequest, res: Response) {
  const locationCache = new ProviderLocationCache();
  const refundService = new RefundService();
  const dispatcher = new DispatcherImproved(locationCache, refundService);
  
  // ... resto do código
  
  // Disparar dispatcher com cache e auto-refund
  const result = await dispatcher.dispatchWithRetry(
    service.id,
    service.client_lat,
    service.client_lng,
    service.profession_id
  );
  
  if (!result.success) {
    // RefundService automaticamente chamado via dispatcher
    await refundService.autoRefundNoProvider(service.id);
  }
}
```

### 3. Monitorar Refunds via Cron Job

```typescript
// Em um arquivo de cron jobs (ex: src/jobs/monitorRefunds.ts)
import { RefundService } from '../services/refundService';

const refundService = new RefundService();

// Executar a cada 30 segundos
setInterval(async () => {
  await refundService.processPendingRefunds();
}, 30000);
```

### 4. Integrar Compressão nas Respostas

```typescript
import { compressResponse } from './services/compressionService';

// Middleware para compressão de resposta
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    return compressResponse(req, res, data);
  };
  next();
});
```

---

## 📱 Integração Mobile (Flutter)

### 1. Inicializar LocationService (main.dart)

```dart
import 'package:projeto_app/services/location_service.dart';

void main() {
  // ...
  LocationService.instance.startTracking();
  runApp(const MyApp());
}
```

### 2. Usar ServiceSyncService para Watch Services (screens/)

```dart
import 'package:projeto_app/services/service_sync_service.dart';

class ServiceDetailScreen extends StatefulWidget {
  final String serviceId;

  @override
  State<ServiceDetailScreen> createState() => _ServiceDetailScreenState();
}

class _ServiceDetailScreenState extends State<ServiceDetailScreen> {
  late StreamSubscription<Map<String, dynamic>> _subscription;

  @override
  void initState() {
    super.initState();
    final syncService = ServiceSyncService();
    
    _subscription = syncService.watchService(widget.serviceId).listen((service) {
      setState(() {
        // Atualizar UI com dados do serviço
      });
    });
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // ... UI code
  }
}
```

### 3. Parar Tracking de Localização ao Encerrar (app cleanup)

```dart
// Em uma página de logout ou onDispose
LocationService.instance.stopTracking();
```

---

## 🗄️ Schema do Banco de Dados

### Adicionar Tabela de Falhas de Refund

```sql
CREATE TABLE refund_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES service_requests(id),
  payment_id VARCHAR(255),
  error_message TEXT,
  error_code VARCHAR(50),
  reviewed BOOLEAN DEFAULT FALSE,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES service_requests(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_refund_failures_service_id ON refund_failures(service_id);
CREATE INDEX idx_refund_failures_reviewed ON refund_failures(reviewed) WHERE reviewed = FALSE;
```

### Adicionar Coluna em service_dispatches

```sql
ALTER TABLE service_dispatches 
ADD COLUMN refund_transaction_id VARCHAR(255) COMMENT 'ID da transação de refund do Mercado Pago';
```

### Adicionar Índice para Provider Location Cache

```sql
-- Acelerar queries Haversine
CREATE INDEX idx_provider_location_active 
ON provider_details(user_id, latitude, longitude) 
WHERE is_active = TRUE AND latitude IS NOT NULL;
```

---

## 🔍 Testes de Validação

### 1. Testar LocationService (Flutter)

```dart
// Em teste unitário
void main() {
  test('LocationService batches positions correctly', () async {
    final service = LocationService();
    
    // Mock GPS updates
    service.positionStream.listen((position) {
      expect(position.latitude, isNotNull);
    });
    
    // Simular batching
    await Future.delayed(Duration(seconds: 6)); // > 5s batch timer
    // Verificar que batch foi enviado
  });
}
```

### 2. Testar RateLimiter (Backend)

```bash
# Testar limite de 60 requests/min em /location/batch
for i in {1..65}; do
  curl -X POST http://localhost:3000/api/location/batch \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"lat":10,"lng":20}'
done
# Requisição 61+ deve retornar 429 Too Many Requests
```

### 3. Testar RefundService (Backend)

```typescript
// Teste de auto-refund
const testService = {
  id: 'test-service-id',
  price_upfront_value: 100.00,
  price_upfront_status: 'paid',
  client_id: 'test-client',
  provider_id: null
};

const refundService = new RefundService();
const result = await refundService.autoRefundNoProvider(testService.id);
expect(result.success).toBe(true);
expect(result.refund_id).toBeDefined();
```

### 4. Testar ServiceSyncService (Flutter)

```dart
// Simular falha de Firebase, verificar fallback para polling
test('ServiceSyncService falls back to polling when Firebase fails', () async {
  final syncService = ServiceSyncService();
  
  // Cortar conexão Firebase
  // Verificar que polling comece automaticamente
  // Confirmar que stream continue emitindo dados
});
```

### 5. Testar Compressão (Backend + Mobile)

```bash
# Verificar header Accept-Encoding
curl -X POST http://localhost:3000/api/location/batch \
  -H "Accept-Encoding: gzip, deflate" \
  -H "Content-Type: application/json" \
  -d '{...batch data...}' \
  -i

# Resposta deve ter:
# Content-Encoding: gzip
# X-Original-Size: 3000
# X-Compressed-Size: 1200
```

---

## 📊 Monitoramento & Métricas

### 1. Location Service Metrics (Dashboard)

- **Batches por minuto**: Target 10-15/min por usuário ativo
- **Taxa de compressão**: Target 40%+ reduction
- **Latência de upload**: Target <500ms

### 2. Refund Service Metrics

- **Refunds processados**: Número total por dia
- **Taxa de sucesso**: % de refunds aprovados vs rejeitados
- **Tempo médio**: De disparo ao aproval (target: <5min)

### 3. Dispatcher Performance

- **Tempo até aceitar**: Média de segundos até provider aceitar
- **Taxa de rejeição**: % de providers que rejeitam
- **Autorizações de refund**: Número de refunds disparados automaticamente

### 4. Rate Limiter Impact

- **Requisições bloqueadas**: Número de 429s por endpoint
- **Usuários afetados**: Quantos únicos atingiram limite
- **Economia de custos**: Redução de carga no D1

---

## ⚠️ Considerações Importantes

### LocationService
- ⚠️ **Battery Drain**: Usar `distanceFilter: 10m` minimiza ativação, mas pode perder algumas localizações
- ⚠️ **Privacy**: Informar usuário que localização está sendo rastreada contínuamente
- ⚠️ **Performance**: BatchSize = 10 pode ser ajustado se comportamento não for ideal

### RefundService
- ⚠️ **Async Processing**: MP refunds podem levar até 2 horas
- ⚠️ **Manual Review**: Falhas são logadas em `refund_failures` para revisão humana
- ⚠️ **Idempotency**: Verificar `refund_transaction_id` para evitar refunds duplicados

### ServiceSyncService
- ⚠️ **Fallback Latency**: Polling é mais lento (5s vs <200ms Firebase)
- ⚠️ **Battery Usage**: Polling contínuo consome mais bateria
- ⚠️ **Data Usage**: ~1-2 KB por requisição de polling

### RateLimiter
- ⚠️ **In-Memory Storage**: Rate limiter perde estado ao restart
- ⚠️ **Distributed**: Múltiplas instâncias precisam de Redis para sincronização
- ⚠️ **Limites**: Ajustar baseado em volume real de tráfego

### ProviderLocationCache
- ⚠️ **Memory Leak**: Validar que cleanup está funcionando
- ⚠️ **Stale Data**: TTL de 30s pode retornar provider que se moveu
- ⚠️ **Geo-hashing**: LRU simples; considerar geo-hashing para escalabilidade

---

## 🚀 Ordem de Implementação Recomendada

1. **Phase 1 (Critical)**: RateLimiter + CompressionService
   - Reduz custos e protege API
   - Tempo: 2-3 horas
   - Deploy: Imediato, sem dependencies

2. **Phase 2 (High Priority)**: LocationService + ServiceSyncService
   - Melhora UX mobile
   - Tempo: 4-5 horas
   - Deploy: Após testes com 10% dos usuários

3. **Phase 3 (Medium Priority)**: DispatcherImproved + ProviderLocationCache
   - Aumenta taxa de aceitação
   - Tempo: 3-4 horas
   - Deploy: Com nova versão de dispatcher

4. **Phase 4 (Final)**: RefundService + monitoramento
   - Melhora trust e reduz chargeback
   - Tempo: 2-3 horas
   - Deploy: Com schema update e cron jobs

---

## 📞 Troubleshooting

### LocationService não envia batches
- [ ] Verificar se `startTracking()` foi chamado
- [ ] Confirmar permissões de localização concedidas
- [ ] Validar ApiService.baseUrl está correto
- [ ] Checar logs de batch flush no console

### RateLimiter retorna 429 antes do esperado
- [ ] Verificar se múltiplas requisições foram enviadas em paralelo
- [ ] Aumentar o limite se necessário (ex: 120/min para locais muito congestionados)
- [ ] Validar que token do usuário está sendo extraído corretamente

### RefundService não processa refunds
- [ ] Confirmar MP_ACCESS_TOKEN está configurado
- [ ] Verificar se payment_id existe e está correto
- [ ] Checar logs em `refund_failures` table
- [ ] Validar que Mercado Pago account está ativo

### ServiceSyncService sempre usa polling
- [ ] Verificar Firebase connection
- [ ] Confirmar que Firebase Admin SDK está inicializado
- [ ] Validar que `serviceAccountKey.json` é válido
- [ ] Checar logs do Firebase para erros de authenticação

---

## 📝 Próximos Passos

- [ ] Integrar todos os componentes listados acima
- [ ] Executar testes de validação
- [ ] Configurar monitoramento e alertas
- [ ] Planejar roll-out gradual (10% → 50% → 100% usuários)
- [ ] Documentar SLAs e KPIs para cada componente
- [ ] Treinar suporte sobre novos flows (auto-refund, fallbacks, etc)
