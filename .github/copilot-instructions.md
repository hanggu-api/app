# Copilot Instructions for 101 Service Platform

## Project Overview
**101 Service** is a Brazilian on-demand services marketplace connecting clients with service providers (plumbers, electricians, personal assistants, etc.). The platform uses a multi-architecture approach with edge computing for scalability.

**Core Stack:**
- **Backend API**: Cloudflare Workers + D1 SQLite (Edge), fallback to Node.js/Express
- **Mobile**: Flutter (Android/iOS)
- **Web**: Firebase Hosting
- **AI Service**: Cloudflare Workers or Render.io (profession/task classification)
- **Database**: Prisma ORM supporting both D1 and MySQL
- **Payments**: Mercado Pago (cards, Pix, installments)
- **Real-time**: Firebase Realtime Database + Firestore + WebSockets

## Architecture Decisions

### Database: Dual-Adapter Prisma Pattern
The project uses `@prisma/adapter-d1` for Cloudflare edge deployment. **Always check environment context before queries**:
- **Cloudflare Workers**: Use D1 adapter via `env.DB` binding
- **Local/Node.js**: Use standard MySQL connection
- **Key Location**: [backend/src/database/prisma.ts](backend/src/database/prisma.ts) exports `getPrisma()` factory

### Payment Architecture: Immediate Upfront + Deferred Remaining
Services use **3-step payment**:
1. **Upfront (30%)**: Charged when service created (before provider accepted)
2. **Deferred (70%)**: Charged when provider completes service
3. **Status Tracking**: `price_upfront_status` and `payment_remaining_status` fields track payment state

**Important**: The system distinguishes payment methods in `metadata` — use `payment_type: 'initial'` or `'remaining'` in payment requests.

### Service State Machine
Services progress through: `waiting_payment` → `pending` → `accepted` → `in_progress` → `waiting_payment_remaining` → `completed` (or `cancelled`/`rejected`).

**Never skip states**. [Services Route](backend/src/routes/services.ts) validates state transitions. Client dispatch logic in `serviceRepository.acceptService()` handles provider acceptance and notification cycles.

### AI Classification Flow
Text description → AI Service classifies → Profession ID + Task ID matched to DB. **Critical**:
- **Endpoint**: POST `/classify` (see [ai_service/src/index.ts](ai_service/src/index.ts))
- **Fallback**: If `score < 0.25`, return empty match
- **Matcher**: Code looks up profession in `professions` table to validate
- **See**: [backend/src/ai/aiConnector.ts](backend/src/ai/aiConnector.ts#L30-L70) - handles local vs remote AI

### Real-time Notifications
**Data-Only Firebase Messaging** for provider notifications (silent pushes to avoid disruption):
- Allows Flutter to control app wake-up (full-screen intent)
- Supports `SYSTEM_ALERT_WINDOW` permission for overlay display
- Uses `notificationManager` from [backend/src/notifications/manager.ts](backend/src/notifications/manager.ts)

## Critical Workflows

### Creating a Service (Client Perspective)
```
1. Client creates service via POST /services (with description, location, category)
2. AI classification runs on description
3. Upfront payment (30%) processed immediately
4. Service enters "pending" state
5. Provider dispatcher begins 30-second dispatch cycle:
   - Notify nearest provider
   - If rejected/timeout, try next provider
   - Loop indefinitely until accepted
```

### Accepting & Completing (Provider Perspective)
```
1. Provider accepts: POST /services/{id}/accept → status: "accepted"
2. Provider arrives: POST /services/{id}/arrive → notifies client
3. Client pays remaining (70%): POST /services/{id}/pay_remaining
4. Provider completes: POST /services/{id}/complete
5. Completion validation (if contested, enters dispute flow)
```

### Testing the Full Flow
**Use test scripts in [backend/src/scripts/](backend/src/scripts/):**
- `test_flow_e2e.ts` - Complete service lifecycle
- `create_test_service.ts` - Quick upfront + remaining payment calc validation
- `test_sequential_local.ps1` - PowerShell runner for local testing

**Example run:**
```bash
cd backend
npm run build
node dist/scripts/test_flow_e2e.js
```

## Development Patterns

### Database Changes
- Use Prisma migrations: `npx prisma migrate dev --name descriptive_name`
- Schema defined in `prisma/schema.prisma`
- For edge: validate D1 compatibility (no advanced SQL features)
- **Important**: Run `npm run migrate` to apply schema.sql changes in development

### Adding Routes
1. Create in [backend/src/routes/](backend/src/routes/) (e.g., `myfeature.ts`)
2. Import and mount in [backend/src/app.ts](backend/src/app.ts)
3. Use `AuthRequest` middleware for auth; extract user via `req.user`
4. Return `{ success: boolean, ...payload }` format consistently

### Mobile Integration
- **API Base**: Set via `ApiService.baseUrl` in [mobile_app/lib/services/api_service.dart](mobile_app/lib/services/api_service.dart)
- **Auth**: JWT token stored in `SharedPreferences`, passed as `Authorization: Bearer {token}` header
- **Real-time**: Uses Firebase listeners + periodic polling for service status
- **Location**: Geolocator for position updates; sent to `/location` endpoint

### Email & Notifications
- **Email Service**: [backend/src/services/emailService.ts](backend/src/services/emailService.ts) - uses Nodemailer
- **Notification Templates**: [backend/src/notifications/manager.ts](backend/src/notifications/manager.ts) defines TEMPLATES for different events
- **Key Events**: `service_requested`, `service_accepted`, `service_completed`

## Deployment

### Backend (Cloudflare Workers)
```bash
cd backend
npm run build
wrangler publish
```
**URL**: `https://projeto-central-backend.carrobomebarato.workers.dev/api`

### AI Service (Cloudflare or Render)
```bash
cd ai_service
npm run build
wrangler publish
# OR for Render:
git push # triggers auto-deploy via render.yaml
```

### Mobile
```bash
cd mobile_app
flutter build apk --release  # Android
flutter build ipa --release   # iOS
```

### Web
```bash
cd mobile_app
flutter build web --release --dart-define API_URL=https://projeto-central-backend.carrobomebarato.workers.dev/api
firebase deploy --only hosting
```

## Common Debugging Checks

1. **Service Not Appearing**: Check `service_requests.status` — must not be `waiting_payment`. Verify upfront payment processed (`price_upfront_status = 'paid'`).
2. **Provider Not Dispatched**: Verify provider has active `provider_details` with location. Check `provider_dispatcher` logs for timeout/rejection reasons.
3. **Payment Failures**: Check `payment_upfront_status` and `payment_remaining_status`. Mercado Pago responses logged in payment controller.
4. **AI Classification Zero-Score**: Input text too ambiguous. Validate via POST `/classify` directly; check if profession exists in `professions` table.
5. **Real-time Not Updating**: Verify Firebase listeners active in mobile app. Check `DataSyncService` in [backend/src/services/dataSyncService.ts](backend/src/services/dataSyncService.ts).

## File Structure Reference

- **[backend/src/routes/services.ts](backend/src/routes/services.ts)** - Core service CRUD & state transitions
- **[backend/src/repositories/serviceRepository.ts](backend/src/repositories/serviceRepository.ts)** - Database queries
- **[backend/src/services/providerDispatcher.ts](backend/src/services/providerDispatcher.ts)** - Provider matching & notification cycles
- **[mobile_app/lib/services/api_service.dart](mobile_app/lib/services/api_service.dart)** - Flutter API client
- **[backend/src/controllers/paymentController.ts](backend/src/controllers/paymentController.ts)** - Mercado Pago integration
- **[ai_service/src/index.ts](ai_service/src/index.ts)** - AI classification endpoint

## Language & Localization Notes

The platform is primarily **Portuguese (Brazilian)**. Key strings:
- Status names: `"pendente"`, `"aceito"`, `"em andamento"`, `"concluído"`
- UI uses `AppTheme.primaryYellow` and `AppTheme.darkBlueText` (Flutter)
- Email templates have HTML with Portuguese content

Maintain this language consistency when adding UI or email features.
