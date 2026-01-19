# Plano de Implementação - Projeto Central

## 1. Visão Geral
Este documento descreve a arquitetura técnica e o progresso das funcionalidades do Projeto Central, um sistema de intermediação de serviços (estilo Uber para profissionais fixos e móveis).

---

## 2. Mudanças Recentes: Refinamento de Busca (Fevereiro 2026)

### 2.1 Backend (Mapbox Geocoding)
- **Filtro de Raio 50km**: Implementado via fórmula de Haversine em `worker/index.ts`.
- **Formatação de Endereço**: A resposta agora separa `main_text` (nome do local) e `secondary_text` (endereço completo).
- **Proximidade**: O parâmetro `proximity` é obrigatório para ativar o filtro de distância.

### 2.2 Frontend (HomeScreen)
- **UI Google Maps**: Resultados exibidos com título em destaque e subtítulo descritivo.
- **Otimização**: Debounce de busca aumentado para 600ms para suavizar a UX.
- **GPS Contextual**: O app envia as coordenadas atuais (`lat/lon`) em cada busca.

---

## 3. Arquitetura do Sistema

### 3.1 Tecnologias
- **Mobile**: Flutter (Dart)
- **Backend**: Cloudflare Workers (TypeScript)
- **Banco de Dados**: Cloudflare D1 (SQLite)
- **Tempo Real**: Firebase (Firestore para espelhamento, RTDB para pulso, FCM para Push)
- **Mídia**: Cloudflare R2

### 3.2 Fluxo de Status
Padrão Maestro v2 (Atômico):
`pending` -> `offered` -> `accepted` -> `in_progress` -> `completed`

---

## 4. Endpoints Principais (API)

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/location/search` | Busca Mapbox com filtro de 50km |
| GET | `/api/location/route` | Roteamento Mapbox (Directions) |
| GET | `/api/theme/active` | Tema dinâmico do banco de dados |
| POST | `/api/services/create` | Criar nova solicitação |

---

## 5. Próximas Etapas
- [ ] Validação final do filtro de GPS no dispositivo físico.
- [ ] Melhorar detecção de "Agendamentos Vencidos" na Home.
