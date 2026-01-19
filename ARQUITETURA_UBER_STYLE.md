# Arquitetura Profunda: Apps Estilo Uber com Flutter + Node.js + Cloudflare

## Índice
1. [Geolocalização em Tempo Real](#1-geolocalização-em-tempo-real)
2. [Matching e Dispatch de Providers](#2-matching--dispatch)
3. [Sistema de Pagamentos](#3-pagamentos)
4. [Cloudflare Workers: Limitações e Soluções](#4-cloudflare-workers)
5. [Comunicação Real-time](#5-comunicação-real-time)
6. [Otimizações Críticas](#6-otimizações-críticas)

---

## 1. Geolocalização em Tempo Real

### 1.1 Captura no Flutter

O seu app 101 Service precisa de localização contínua para:
- **Providers**: Enviar posição enquanto se deslocam
- **Clientes**: Visualizar localização do provider em tempo real
- **Matching**: Encontrar providers próximos

**Estratégia do 101 Service:**

```dart
// mobile_app/lib/services/location_service.dart
class LocationService {
  final Geolocator _geolocator = Geolocator();
  StreamSubscription<Position>? _positionStream;
  
  // Iniciar rastreamento contínuo
  void startRealTimeTracking(String serviceId) {
    // Configurações: atualizar a cada 10m DE MOVIMENTO ou 30s máximo
    final locationSettings = LocationSettings(
      accuracy: LocationAccuracy.best,      // GPS de alta precisão
      distanceFilter: 10,                    // Atualizar se moveu 10m
      timeLimit: Duration(seconds: 30),     // Ou a cada 30s
    );
    
    _positionStream = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen((Position position) {
      _uploadLocationBatch(position, serviceId);
    });
  }
  
  // Batch buffer (agrupa múltiplas posições)
  final _locationBuffer = <Map<String, dynamic>>[];
  Timer? _batchTimer;
  
  void _uploadLocationBatch(Position position, String serviceId) {
    _locationBuffer.add({
      'lat': position.latitude,
      'lng': position.longitude,
      'accuracy': position.accuracy,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
      'altitude': position.altitude,
      'speed': position.speed, // Útil para detecção de fraude
    });
    
    // Upload a cada 5 segundos OU 10 posições
    if (_locationBuffer.length >= 10) {
      _flush(serviceId);
    }
    
    _batchTimer ??= Timer(Duration(seconds: 5), () => _flush(serviceId));
  }
  
  Future<void> _flush(String serviceId) async {
    if (_locationBuffer.isEmpty) return;
    
    final batch = List.from(_locationBuffer);
    _locationBuffer.clear();
    _batchTimer?.cancel();
    _batchTimer = null;
    
    try {
      await ApiService.post('/location/batch', {
        'locations': batch,
        'service_id': serviceId,
      });
    } catch (e) {
      // Falha: retentar no próximo batch
      print('Location batch failed: $e');
    }
  }
}
```

**Por que batching?**
| Estratégia | Latência | Dados/hora | Bateria |
|-----------|----------|-----------|---------|
| GPS contínuo | <2s | 15-20 MB | Péssima |
| GPS + distance filter (10m) | 5-30s | 2-5 MB | Boa |
| GPS + batching 5s | 5-7s | 3 MB | Boa ✅ |
| WiFi/Cell (fallback) | >10s | <1 MB | Excelente |

**Latências aceitáveis:**
- ✅ **Dispatch inicial**: <5s (provider tem 20s para aceitar)
- ✅ **Em andamento**: 5-10s (atualizar ETA no mapa)
- ✅ **Chegada**: <3s (notificar cliente com beep)

### 1.2 Backend: Cloudflare Workers + D1

Seu backend está em `backend/src/routes/location.ts`:

```typescript
// backend/src/routes/location.ts (OTIMIZADO PARA CLOUDFLARE)
router.post('/batch', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { locations, service_id } = req.body;
  const provider_id = req.user.id;
  
  try {
    // Validação rápida
    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ success: false });
    }
    
    // Manter APENAS última posição em D1 (tabela desnormalizada)
    const latest = locations[locations.length - 1];
    const prisma = getPrisma(req.env.DB);
    
    // 1. Update rápido (upsert) - localization atual
    await prisma.providerLocation.upsert({
      where: { provider_id },
      update: {
        latitude: latest.lat,
        longitude: latest.lng,
        accuracy: latest.accuracy,
        speed: latest.speed,
        updated_at: new Date(),
      },
      create: {
        provider_id,
        latitude: latest.lat,
        longitude: latest.lng,
        accuracy: latest.accuracy,
        speed: latest.speed,
      },
    });
    
    // 2. Armazenar HISTÓRICO em tabela separada (com índice temporal)
    // Para analytics, disputas, e mapa de rota
    await prisma.locationHistory.createMany({
      data: locations.map(loc => ({
        provider_id,
        service_id,
        latitude: loc.lat,
        longitude: loc.lng,
        accuracy: loc.accuracy,
        speed: loc.speed,
        captured_at: new Date(loc.timestamp),
      })),
      skipDuplicates: true,
    });
    
    // 3. Broadcast IMEDIATO para cliente via Firebase
    await FirebaseService.updateProviderLocation(service_id, {
      provider_id,
      lat: latest.lat,
      lng: latest.lng,
      accuracy: latest.accuracy,
      timestamp: Date.now(),
    });
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Location batch failed:', error);
    res.status(500).json({ success: false });
  }
});

// Query providers próximos (para dispatch)
router.post('/nearby', async (req: AuthRequest, res: Response) => {
  const { lat, lng, radius_km = 5, exclude_service_id } = req.body;
  const prisma = getPrisma(req.env.DB);
  
  // D1 usa SQLite - fórmula Haversine diretamente na query
  const providers = await prisma.$queryRaw`
    SELECT 
      p.id,
      p.users.full_name as name,
      pl.latitude,
      pl.longitude,
      p.rating,
      p.current_status,
      (6371 * ACOS(
        COS(RADIANS(${lat})) * 
        COS(RADIANS(pl.latitude)) * 
        COS(RADIANS(pl.longitude) - RADIANS(${lng})) + 
        SIN(RADIANS(${lat})) * 
        SIN(RADIANS(pl.latitude))
      )) AS distance_km
    FROM providers p
    LEFT JOIN provider_location pl ON p.id = pl.provider_id
    LEFT JOIN users ON p.id = users.id
    WHERE distance_km <= ${radius_km}
      AND p.current_status = 'available'
      AND p.acceptance_rate > 0.4  -- Reduzir rejeições
    ORDER BY distance_km ASC, p.rating DESC
    LIMIT 50
  `;
  
  res.json({ success: true, providers });
});
```

**Schema D1 necessário:**

```sql
-- backend/src/database/schema.sql

-- Localização ATUAL dos providers (desnormalizado para velocidade)
CREATE TABLE IF NOT EXISTS provider_location (
  provider_id BIGINT PRIMARY KEY,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy REAL,
  speed REAL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_provider_location_updated 
  ON provider_location(updated_at);

-- Histórico completo (para mapas de rota, disputas)
CREATE TABLE IF NOT EXISTS location_history (
  id TEXT PRIMARY KEY,
  provider_id BIGINT NOT NULL,
  service_id TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy REAL,
  speed REAL,
  captured_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES providers(id),
  FOREIGN KEY (service_id) REFERENCES service_requests(id)
);

CREATE INDEX IF NOT EXISTS idx_location_history_service 
  ON location_history(service_id);
CREATE INDEX IF NOT EXISTS idx_location_history_captured 
  ON location_history(captured_at DESC);
```

### 1.3 WebSockets vs HTTP Polling vs Firebase

**Problema**: Cloudflare Workers **não suporta WebSockets tradicionais**.

**Solução do 101 Service**:

| Abordagem | Uso | Latência | Custo |
|-----------|-----|----------|-------|
| **Firebase Realtime** | Status do serviço, localização em tempo real | <200ms | Alto em escala |
| **HTTP Polling** | Fallback quando Firebase falha | 5-30s | Médio |
| **Data-Only FCM** | Notificar provider de novo serviço | 3-10s | Baixo |

**Implementação recomendada:**

```typescript
// backend/src/services/realtimeLocationSync.ts
class RealtimeLocationSync {
  // Broadcast para CLIENTE via Firebase (rápido)
  async broadcastProviderLocationToClient(
    service_id: string,
    provider_id: string,
    location: { lat: number; lng: number }
  ) {
    await admin
      .database()
      .ref(`services/${service_id}/provider_location`)
      .update({
        provider_id,
        lat: location.lat,
        lng: location.lng,
        timestamp: Date.now(),
      });
    // Propaga em <200ms para clientes conectados
  }
  
  // Persistir em Firestore (histórico)
  async logLocationHistory(
    service_id: string,
    provider_id: string,
    location: any
  ) {
    await admin
      .firestore()
      .collection('services')
      .doc(service_id)
      .collection('location_history')
      .add({
        provider_id,
        lat: location.lat,
        lng: location.lng,
        timestamp: new Date(),
      });
  }
}
```

---

## 2. Matching & Dispatch

### 2.1 Algoritmo de Score (Ranking de Providers)

Seu dispatcher em `backend/src/services/providerDispatcher.ts` já tem implementação. Aqui está como melhorar:

```typescript
// backend/src/services/providerMatcher.ts
interface ProviderScore {
  provider_id: number;
  score: number;          // 0-100
  distance_km: number;
  rating: number;         // 1-5
  is_available: boolean;
  eta_minutes: number;
  acceptance_rate: number; // % de serviços aceitos
}

class ProviderMatcher {
  // Score ponderado para ranking
  calculateScore(
    provider: any,
    clientLocation: { lat: number; lng: number },
    weights = {
      distance: 0.40,       // 40% - proximidade é mais importante
      rating: 0.35,         // 35% - qualidade do provider
      acceptance: 0.15,     // 15% - histórico de aceitações
      specialization: 0.10, // 10% - expertise na profissão
    }
  ): ProviderScore {
    // 1. Distância (0-1, onde 1 = excelente)
    const distance = this.haversine(
      clientLocation.lat,
      clientLocation.lng,
      provider.latitude,
      provider.longitude
    );
    const distanceScore = Math.max(0, 1 - (distance / 15)); // 15km = 0
    
    // 2. Rating (0-1)
    const ratingScore = provider.rating / 5;
    
    // 3. Histórico de aceitações
    const acceptanceScore = (provider.acceptance_rate || 0) / 100;
    
    // 4. Especialização na profissão
    const specializationScore = provider.professions?.includes(
      this.currentProfession
    ) ? 1 : 0.7;
    
    // Score final (0-100)
    const totalScore = (
      distanceScore * weights.distance +
      ratingScore * weights.rating +
      acceptanceScore * weights.acceptance +
      specializationScore * weights.specialization
    ) * 100;
    
    // ETA: 40 km/h speed médio urbano
    const etaMinutes = Math.ceil((distance / 40) * 60);
    
    return {
      provider_id: provider.id,
      score: totalScore,
      distance_km: distance,
      rating: provider.rating,
      is_available: provider.current_status === 'available',
      eta_minutes: etaMinutes,
      acceptance_rate: provider.acceptance_rate,
    };
  }
  
  // Ranking final
  rankProviders(providers: any[]): ProviderScore[] {
    return providers
      .map(p => this.calculateScore(p, this.clientLocation))
      .sort((a, b) => {
        // 1. Disponíveis primeiro
        if (a.is_available !== b.is_available) {
          return a.is_available ? -1 : 1;
        }
        // 2. Depois por score
        return b.score - a.score;
      })
      .slice(0, 50); // Top 50
  }
  
  private haversine(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
```

### 2.2 Dispatcher com Retry Loop (30-segundo cycles)

Seu código já tem isso em `providerDispatcher.ts`, mas aqui está o fluxo otimizado:

```typescript
// backend/src/services/providerDispatcher.ts (MELHORADO)
class ProviderDispatcher {
  private readonly DISPATCH_TIMEOUT = 20000;      // 20s para provider responder
  private readonly NOTIFICATION_INTERVAL = 3000;   // 3s entre notificações
  private readonly MAX_CANDIDATES = 100;           // Max providers a tentar
  
  async dispatchService(serviceId: string) {
    const service = await this.getService(serviceId);
    const rankedProviders = await this.getRankedProviders(service);
    
    let acceptedProvider = null;
    let attemptCount = 0;
    
    while (attemptCount < rankedProviders.length && !acceptedProvider) {
      const provider = rankedProviders[attemptCount];
      
      console.log(
        `[DISPATCH] Service ${serviceId}: Notificando provider ${provider.provider_id} ` +
        `(tentativa ${attemptCount + 1}/${rankedProviders.length})`
      );
      
      // Tentar este provider
      acceptedProvider = await this.notifyProviderWithTimeout(
        provider.provider_id,
        serviceId,
        this.DISPATCH_TIMEOUT
      );
      
      if (acceptedProvider) {
        // SUCCESS: Provider aceitou
        await this.updateServiceStatus(serviceId, 'accepted', provider.provider_id);
        console.log(`✅ Service ${serviceId} accepted by ${provider.provider_id}`);
        break;
      }
      
      // REJECTED or TIMEOUT: Ir para próximo
      console.log(`⏭️  Provider rejeitou/timeout, tentando próximo...`);
      
      attemptCount++;
      
      // Pequeno delay entre notificações (3s)
      if (attemptCount < rankedProviders.length) {
        await this.delay(this.NOTIFICATION_INTERVAL);
      }
    }
    
    if (!acceptedProvider) {
      // Nenhum provider aceitou após tentar todos
      console.log(`❌ Nenhum provider disponível para ${serviceId}`);
      
      await this.handleNoProviderFound(service);
    }
  }
  
  private async notifyProviderWithTimeout(
    provider_id: string,
    service_id: string,
    timeout: number
  ): Promise<string | null> {
    return new Promise(async (resolve) => {
      let resolved = false;
      
      // Timer para timeout
      const timeoutHandle = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.cleanupNotification(provider_id, service_id);
          resolve(null);
        }
      }, timeout);
      
      try {
        // 1. Enviar notificação via FCM
        await this.sendDispatchNotification(provider_id, service_id);
        
        // 2. Ouvir resposta via Firebase ou polling
        const listener = this.setupResponseListener(
          provider_id,
          service_id,
          async (accepted) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutHandle);
              this.cleanupNotification(provider_id, service_id);
              resolve(accepted ? provider_id : null);
            }
          }
        );
      } catch (error) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutHandle);
          resolve(null);
        }
      }
    });
  }
  
  private async sendDispatchNotification(provider_id: string, service_id: string) {
    const service = await this.getService(service_id);
    const provider = await this.getProvider(provider_id);
    
    // Data-only notification (Android não auto-dismisses)
    await admin.messaging().send({
      token: provider.fcm_token,
      data: {
        type: 'service_request',
        service_id: service_id,
        client_name: service.client_name,
        profession: service.profession,
        description: service.description,
        price: String(service.total_price),
        location: JSON.stringify({
          lat: service.latitude,
          lng: service.longitude,
        }),
        distance_km: String(
          this.calculateDistance(
            provider.latitude,
            provider.longitude,
            service.latitude,
            service.longitude
          )
        ),
        eta_minutes: String(
          Math.ceil(
            this.calculateDistance(
              provider.latitude,
              provider.longitude,
              service.latitude,
              service.longitude
            ) / 40 * 60
          )
        ),
      },
      android: {
        priority: 'high',
      },
    });
  }
  
  private setupResponseListener(
    provider_id: string,
    service_id: string,
    callback: (accepted: boolean) => void
  ) {
    // Ouvir resposta em Firebase Realtime DB
    const ref = admin
      .database()
      .ref(`service_dispatch/${service_id}/responses/${provider_id}`);
    
    const listener = ref.on('value', async (snapshot) => {
      if (snapshot.exists()) {
        const { accepted, timestamp } = snapshot.val();
        
        // Validar que resposta é recente (máx 25s atrás)
        const age = Date.now() - timestamp;
        if (age < 25000) {
          callback(accepted === true);
        }
      }
    });
    
    return {
      off: () => ref.off('value', listener),
    };
  }
  
  private async handleNoProviderFound(service: any) {
    // 1. Atualizar status
    await this.updateServiceStatus(service.id, 'no_provider_found');
    
    // 2. Reembolsar cliente se pagou antecipado
    if (service.price_upfront_status === 'paid') {
      await this.refundUpfrontPayment(service);
    }
    
    // 3. Notificar cliente
    await this.notifyClientNoProviderFound(service.client_id, service.id);
  }
}
```

---

## 3. Pagamentos

### 3.1 Fluxo 30% + 70% (Seu modelo)

Seu código está em `backend/src/controllers/paymentController.ts`. Aqui está o fluxo melhorado:

```typescript
// backend/src/controllers/paymentController.ts (OTIMIZADO)
class PaymentController {
  
  // PASSO 1: Cliente cria serviço → Cobrar 30% IMEDIATAMENTE
  async createServiceWithUpfrontPayment(req: AuthRequest, res: Response) {
    const {
      description,
      location,
      profession_id,
      estimated_price,
      card_token, // Tokenizado no frontend
    } = req.body;
    
    const prisma = getPrisma(req.env.DB);
    const client_id = req.user.id;
    
    try {
      // 1. VALIDAR TOKEN DE CARTÃO
      if (!card_token) {
        return res.status(400).json({
          success: false,
          error: 'Card token required',
        });
      }
      
      // 2. CRIAR SERVIÇO em estado "waiting_payment"
      const serviceId = generateId();
      const upfrontAmount = Math.ceil(estimated_price * 0.30); // 30%
      const remainingAmount = Math.floor(estimated_price * 0.70); // 70%
      
      const service = await prisma.service_requests.create({
        data: {
          id: serviceId,
          client_id: BigInt(client_id),
          profession_id,
          description,
          latitude: new Prisma.Decimal(location.lat),
          longitude: new Prisma.Decimal(location.lng),
          price_estimated: new Prisma.Decimal(estimated_price),
          price_upfront: new Prisma.Decimal(upfrontAmount),
          price_remaining: new Prisma.Decimal(remainingAmount),
          status: 'waiting_payment',
          price_upfront_status: 'pending',
          payment_remaining_status: 'pending',
        },
      });
      
      // 3. PROCESSAR PAGAMENTO 30% (IMEDIATO)
      const upfrontResult = await this.processPaymentMP(
        {
          amount: upfrontAmount,
          description: `Serviço 101 (Adiantamento) - ${service.id}`,
          token: card_token,
          payer_email: req.user.email,
        },
        req.env
      );
      
      if (upfrontResult.status !== 'approved') {
        // Pagamento falhou: deletar serviço
        await prisma.service_requests.delete({
          where: { id: serviceId },
        });
        
        return res.status(402).json({
          success: false,
          error: 'Payment declined',
          reason: upfrontResult.status_detail,
        });
      }
      
      // 4. MARCAR COMO PAGO e INICIAR DISPATCH
      await prisma.service_requests.update({
        where: { id: serviceId },
        data: {
          price_upfront_status: 'paid',
          upfront_transaction_id: upfrontResult.id,
          status: 'pending', // Mudar para "pending" para iniciar dispatch
        },
      });
      
      // 5. INICIAR DISPATCH DO PROVIDER
      await providerDispatcher.startDispatch(serviceId);
      
      return res.json({
        success: true,
        service_id: serviceId,
        status: 'pending',
        upfront_charged: upfrontAmount,
        remaining_due: remainingAmount,
      });
      
    } catch (error) {
      console.error('Service creation failed:', error);
      res.status(500).json({ success: false, error: 'Internal error' });
    }
  }
  
  // PASSO 2: Provider chega → Cobrar 70% RESTANTE
  async chargeRemainingPayment(req: AuthRequest, res: Response) {
    const { service_id, card_token } = req.body;
    const prisma = getPrisma(req.env.DB);
    
    try {
      const service = await prisma.service_requests.findUnique({
        where: { id: service_id },
      });
      
      if (!service) {
        return res.status(404).json({
          success: false,
          error: 'Service not found',
        });
      }
      
      // Validar que está no estado correto
      if (service.status !== 'in_progress') {
        return res.status(400).json({
          success: false,
          error: 'Service must be in progress',
        });
      }
      
      if (service.payment_remaining_status === 'paid') {
        return res.status(400).json({
          success: false,
          error: 'Remaining payment already made',
        });
      }
      
      // Tentar cobrança
      const remainingAmount = Number(service.price_remaining);
      
      const result = await this.processPaymentMP(
        {
          amount: remainingAmount,
          description: `Serviço 101 (Saldo) - ${service_id}`,
          token: card_token,
          payer_email: req.user.email,
        },
        req.env
      );
      
      if (result.status === 'approved') {
        // SUCCESS
        await prisma.service_requests.update({
          where: { id: service_id },
          data: {
            payment_remaining_status: 'paid',
            remaining_transaction_id: result.id,
          },
        });
        
        return res.json({
          success: true,
          remaining_charged: remainingAmount,
        });
      } else {
        // FALHA: Agendar retry automático em 24h
        await this.schedulePaymentRetry(service_id, 24);
        
        return res.status(402).json({
          success: false,
          error: 'Payment declined',
          reason: result.status_detail,
          retry_scheduled: true,
        });
      }
      
    } catch (error) {
      console.error('Remaining payment error:', error);
      res.status(500).json({ success: false });
    }
  }
  
  private async processPaymentMP(paymentData: any, env: any) {
    const mpClient = new MercadoPago(
      new MercadoPagoConfig({
        accessToken: env.MP_ACCESS_TOKEN.trim(),
      })
    );
    
    try {
      const payment = await mpClient.payment.create({
        transaction_amount: paymentData.amount,
        description: paymentData.description,
        payment_method_id: 'visa', // Detectar do token
        token: paymentData.token,
        payer: {
          email: paymentData.payer_email,
        },
        installments: 1,
        statement_descriptor: '101SERVICE',
        metadata: {
          service_id: paymentData.service_id,
          payment_type: paymentData.type || 'initial',
        },
      });
      
      return {
        id: payment.id,
        status: payment.status, // 'approved', 'pending', 'rejected'
        status_detail: payment.status_detail,
      };
    } catch (error) {
      console.error('MP Error:', error);
      throw error;
    }
  }
  
  private async schedulePaymentRetry(serviceId: string, hoursDelay: number) {
    const prisma = getPrisma();
    
    await prisma.paymentRetry.create({
      data: {
        service_id: serviceId,
        scheduled_for: new Date(Date.now() + hoursDelay * 60 * 60 * 1000),
        attempt_count: 0,
        max_attempts: 3,
      },
    });
  }
}
```

### 3.2 Validação de Cartão no Flutter

```dart
// mobile_app/lib/services/payment_service.dart
class PaymentService {
  
  // Validar cartão ANTES de enviar ao servidor
  static bool validateCardNumber(String cardNumber) {
    // Algoritmo de Luhn (validação básica)
    final digits = cardNumber.replaceAll(RegExp(r'\D'), '');
    
    if (digits.length < 13 || digits.length > 19) return false;
    
    int sum = 0;
    bool isEven = false;
    
    for (int i = digits.length - 1; i >= 0; i--) {
      int digit = int.parse(digits[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 == 0;
  }
  
  static bool validateExpirationDate(int month, int year) {
    // Validar mês (1-12) e ano
    if (month < 1 || month > 12) return false;
    
    // Validar que não está expirado
    final now = DateTime.now();
    final expiryDate = DateTime(year, month);
    
    return expiryDate.isAfter(now);
  }
  
  static bool validateCVV(String cvv) {
    // CVV deve ter 3-4 dígitos
    return RegExp(r'^\d{3,4}$').hasMatch(cvv);
  }
  
  // Integração com Mercado Pago (tokenização)
  static Future<String?> tokenizeCard({
    required String cardNumber,
    required String holderName,
    required int expiryMonth,
    required int expiryYear,
    required String cvv,
  }) async {
    try {
      // Validações
      if (!validateCardNumber(cardNumber)) {
        throw Exception('Invalid card number');
      }
      
      if (!validateExpirationDate(expiryMonth, expiryYear)) {
        throw Exception('Card expired');
      }
      
      if (!validateCVV(cvv)) {
        throw Exception('Invalid CVV');
      }
      
      // Chamar API de tokenização do Mercado Pago
      final response = await http.post(
        Uri.parse('https://api.mercadopago.com/v2/card_tokens'),
        headers: {
          'Authorization': 'Bearer ${ApiService.mpPublicKey}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'card_number': cardNumber.replaceAll(RegExp(r'\s'), ''),
          'cardholder': {
            'name': holderName,
          },
          'security_code': cvv,
          'expiration_month': expiryMonth,
          'expiration_year': expiryYear,
        }),
      );
      
      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return data['id']; // Token para enviar ao backend
      } else {
        throw Exception('Tokenization failed');
      }
    } catch (e) {
      print('Payment error: $e');
      return null;
    }
  }
}
```

---

## 4. Cloudflare Workers: Limitações e Soluções

### 4.1 Principais Limitações

| Limitação | Impacto | Solução |
|-----------|--------|----------|
| **Sem WebSocket nativo** | Não posso manter conexões HTTP abertas | Firebase Realtime + polling |
| **Máx 30s de execução** | Dispatch timeout pode falhar | Job queue em D1 |
| **Sem estado em RAM** | Não posso cache providers | D1 table + CDN cache |
| **D1 writes limitadas** | Batch writes podem ser lentos | Batch em D1, índices |
| **Cold starts** | Primeira requisição lenta | Warm-up cron job |

### 4.2 Padrão de Job Queue Assíncrono

```typescript
// backend/src/services/jobQueue.ts
class JobQueue {
  
  // Enfileirar dispatch para processar depois
  async enqueueDispatchJob(serviceId: string, env: any) {
    const prisma = getPrisma(env.DB);
    
    // Adicionar à fila
    await prisma.job_queue.create({
      data: {
        id: generateId(),
        type: 'dispatch_service',
        service_id: serviceId,
        status: 'pending',
        retries: 0,
        created_at: new Date(),
        scheduled_at: new Date(),
      },
    });
    
    // Chamar job processor via HTTP (fire & forget)
    fetch(`https://jobs-${env.ENVIRONMENT}.${env.WORKERS_DOMAIN}/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.INTERNAL_JOB_TOKEN}`,
      },
      body: JSON.stringify({ job_type: 'dispatch' }),
    }).catch(() => {}); // Ignorar erros, retry depois
  }
  
  // Worker scheduler para processar jobs
  async processJobs(env: any) {
    const prisma = getPrisma(env.DB);
    
    // Pegar jobs pendentes
    const jobs = await prisma.job_queue.findMany({
      where: {
        status: 'pending',
        scheduled_at: { lte: new Date() },
      },
      take: 10, // Processar em batch para não timeout
    });
    
    for (const job of jobs) {
      try {
        if (job.type === 'dispatch_service') {
          await providerDispatcher.startDispatch(job.service_id);
        }
        
        // Marcar como completo
        await prisma.job_queue.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            completed_at: new Date(),
          },
        });
      } catch (error) {
        // Retry com exponential backoff
        const nextRetry = Math.min(job.retries + 1, 5);
        const backoffMs = Math.pow(2, nextRetry) * 60000; // 1min, 2min, 4min...
        
        await prisma.job_queue.update({
          where: { id: job.id },
          data: {
            retries: nextRetry,
            status: 'pending',
            scheduled_at: new Date(Date.now() + backoffMs),
          },
        });
      }
    }
  }
}
```

### 4.3 Warm-up Periódico

```typescript
// backend/wrangler.toml
[triggers]
crons = ["*/5 * * * *"]  # A cada 5 minutos

// backend/src/index.ts (Cloudflare Worker handler)
export default {
  async fetch(request: Request, env: Env) {
    return handleRequest(request, env);
  },
  
  // Scheduled handler (warm-up)
  async scheduled(event: ScheduledEvent, env: Env) {
    const prisma = getPrisma(env.DB);
    
    try {
      // 1. Testar conexão DB
      await prisma.professions.findFirst();
      
      // 2. Atualizar cache de providers ativos
      const providers = await prisma.providers.findMany({
        where: { current_status: 'available' },
        select: { id: true, latitude: true, longitude: true },
        take: 100,
      });
      
      // 3. Processar jobs pendentes
      await new JobQueue().processJobs(env);
      
      console.log(`✅ Warm-up completed: ${providers.length} providers cached`);
    } catch (error) {
      console.error('Warm-up error:', error);
    }
  },
};
```

---

## 5. Comunicação Real-time

### 5.1 Firebase Realtime DB vs Firestore

```typescript
// backend/src/services/firebaseSync.ts
class FirebaseSync {
  
  // Status updates: RÁPIDO → Firebase Realtime
  async updateServiceStatus(serviceId: string, status: string) {
    const ref = admin.database().ref(`services/${serviceId}`);
    
    await ref.update({
      status,
      updated_at: admin.database.ServerValue.TIMESTAMP,
    });
    
    // Propaga em <200ms para clientes listeners
  }
  
  // Histórico: PERSISTENTE → Firestore
  async logServiceEvent(serviceId: string, event: any) {
    await admin
      .firestore()
      .collection('services')
      .doc(serviceId)
      .collection('events')
      .add({
        type: event.type, // 'created', 'accepted', 'completed'
        timestamp: new Date(),
        provider_id: event.provider_id,
        ...event,
      });
  }
}
```

### 5.2 Data-Only Notifications (Android)

Seu app usa `firebase_messaging`. Aqui está como fazer notificações de dispatch:

```typescript
// backend/src/services/notificationService.ts
class NotificationService {
  
  async sendDispatchNotification(
    provider_id: string,
    service: ServiceRequest
  ) {
    const provider = await this.getProvider(provider_id);
    
    // Data-only: evita que Android auto-dismiss
    // Permite que app controle notificação (full-screen intent)
    await admin.messaging().send({
      token: provider.fcm_token,
      data: {
        type: 'service_request',
        service_id: service.id,
        client_name: service.client_name,
        profession: service.profession.name,
        price: String(service.total_price),
        address: service.address,
        description: service.description,
        location: JSON.stringify({
          lat: service.latitude,
          lng: service.longitude,
        }),
        distance_km: String(
          this.calculateDistance(
            provider.latitude,
            provider.longitude,
            service.latitude,
            service.longitude
          )
        ),
        expires_at: String(Date.now() + 20000), // 20s para aceitar
      },
      android: {
        priority: 'high', // Entrega rápida
      },
      // Sem "notification" block - app controla tudo
    });
  }
}
```

```dart
// mobile_app/lib/services/notification_handler.dart
class NotificationHandler {
  
  static Future<void> onMessageHandler(RemoteMessage message) async {
    if (message.data['type'] == 'service_request') {
      final serviceId = message.data['service_id'];
      final expiresAt = int.parse(message.data['expires_at']);
      
      // Validar se ainda está válida
      if (DateTime.now().millisecondsSinceEpoch > expiresAt) {
        return; // Expirou
      }
      
      // Mostrar full-screen intent
      await _showDispatchOverlay(message.data);
    }
  }
  
  static Future<void> _showDispatchOverlay(Map<String, dynamic> data) async {
    final channel = AndroidNotificationChannel(
      id: 'dispatch_channel',
      name: 'Dispatch Requests',
      importance: Importance.max,
      enableVibration: true,
    );
    
    final details = NotificationDetails(
      android: AndroidNotificationDetails(
        channel.id,
        channel.name,
        importance: Importance.max,
        priority: Priority.high,
        fullScreenIntent: true, // CRITICAL: Full-screen overlay
        autoCancel: false,
        actions: [
          AndroidNotificationAction(
            'accept',
            'Aceitar',
            cancelable: false,
          ),
          AndroidNotificationAction(
            'reject',
            'Rejeitar',
            cancelable: false,
          ),
        ],
      ),
    );
    
    await flutterLocalNotificationsPlugin.show(
      data['service_id'].hashCode,
      'Novo Serviço: ${data['client_name']}',
      data['description'],
      details,
      payload: jsonEncode(data),
    );
  }
}
```

---

## 6. Otimizações Críticas

### 6.1 Compressão de Localização

```typescript
// Reduzir payload: 100 bytes → 40 bytes por update
interface CompressedLocation {
  p: [number, number];  // [lat, lng]
  t: number;            // timestamp
  a?: number;           // accuracy (opcional)
}

// Backend comprime resposta
const compressedUpdate = {
  p: [-23.123456, -46.456789],
  t: 1708509281000,
  a: 5,
};
```

### 6.2 Rate Limiting

```typescript
// backend/src/middleware/rateLimit.ts
export const locationRateLimit = rateLimit({
  windowMs: 60 * 1000,      // 60s janela
  max: 60,                   // 60 requisições
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // Não rate limit para testes
    return process.env.NODE_ENV === 'test';
  },
});

// Usar no endpoint
router.post('/location/batch', locationRateLimit, async (req, res) => {
  // ...
});
```

### 6.3 Cache de Índices

```typescript
// Cache providers ativos por 30 segundos
const providerCache = new Map<string, CachedData>();

async function getNearbyCached(lat: number, lng: number) {
  const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
  
  // Check cache
  if (providerCache.has(cacheKey)) {
    const cached = providerCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 30000) {
      return cached.providers; // <30s old
    }
  }
  
  // Cache miss
  const providers = await queryNearbyProviders(lat, lng);
  providerCache.set(cacheKey, {
    providers,
    timestamp: Date.now(),
  });
  
  return providers;
}
```

---

## Arquitetura Recomendada para 101 Service

```
┌─────────────────────────────────────────────────────────────┐
│ CLIENTE (Flutter)                                           │
│ - Geolocator: batch 10 posições ou 5s                       │
│ - Firebase listeners para status real-time                  │
│ - HTTP polling fallback a cada 5s                           │
│ - Pagamento: Luhn validation + MP tokenization              │
└────────────────┬────────────────────────────────────────────┘
                 │ (HTTP batch/WebSocket)
┌────────────────▼────────────────────────────────────────────┐
│ CLOUDFLARE WORKERS (API Edge)                               │
│ - /location/batch → D1 upsert + Firebase broadcast          │
│ - /dispatch → Job queue assíncrona (max 30s)                │
│ - /payment → MP API calls                                   │
│ - Cache: professions, providers (30s TTL)                   │
│ - Warm-up: cron job a cada 5 minutos                        │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┼─────────┐
        │        │         │
   ┌────▼──┐ ┌──▼──┐  ┌──▼─────┐
   │       │ │     │  │        │
   │ D1    │ │Fire │  │  MP    │
   │(SQL)  │ │base │  │  API   │
   │       │ │     │  │        │
   └───────┘ └─────┘  └────────┘
```

Este documento cobre padrões **production-ready** como usados por Uber, Ifood e 99Taxi! 🚀
