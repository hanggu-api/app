
// Shim process for compatibility with SDKs that expect it
// @ts-ignore
if (typeof process === 'undefined') {
    // @ts-ignore
    globalThis.process = { env: {} };
}

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sendFCMNotificationV1, getAccessTokenFromServiceAccount } from './fcm-v1';

type WorkerBindings = {
    // @ts-ignore
    DB: any; // D1Database
    AI_SERVICE_URL: string;
    USE_REMOTE_AI: string;
    AI_SERVICE: { fetch: typeof fetch };
    MP_ACCESS_TOKEN: string;
    CF_ACCESS_CLIENT_ID?: string;
    CF_ACCESS_CLIENT_SECRET?: string;
    FCM_SERVER_KEY?: string;
    FIREBASE_SERVICE_ACCOUNT?: string; // JSON string of service account
    FIREBASE_STORAGE_BUCKET?: string; // Optional override
    GOOGLE_MAPS_API_KEY?: string;
    DISPATCH_MANAGER: any; // Durable Object namespace
    LOCATION_CACHE: any; // KV Namespace para Cache de Localização Rápido
};

interface ScheduledEvent {
    scheduledTime: number;
    cron: string;
}

interface ExecutionContext {
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
}

// Enum para Status do Serviço
export enum ServiceStatus {
    WAITING_PAYMENT = 'waiting_payment',
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    WAITING_PAYMENT_REMAINING = 'waiting_payment_remaining',
    IN_PROGRESS = 'in_progress',
    WAITING_CLIENT_CONFIRMATION = 'waiting_client_confirmation',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    CONTESTED = 'contested',
    EXPIRED = 'expired',
    OPEN_FOR_SCHEDULE = 'open_for_schedule',
    SCHEDULE_PROPOSED = 'schedule_proposed',
    SCHEDULED = 'scheduled',
    OFFERED = 'offered',
    CLIENT_DEPARTING = 'client_departing',
    CLIENT_ARRIVED = 'client_arrived'
}

// Enum para Status de Viagem (Uber-like)
export enum UberStatus {
    SEARCHING = 'searching',
    DRIVER_FOUND = 'driver_found',
    DRIVER_EN_ROUTE = 'driver_en_route',
    ARRIVED = 'arrived',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled'
}

const app = new Hono<{ Bindings: WorkerBindings }>();

// Removido: app.use('*', compress()); 
// A Cloudflare (Wrangler/Edge) JÁ comprime nativamente todas as respostas HTTP (Gzip/Brotli)
// Usar o compress() do Hono causa dupla-compressão corrompendo o Parse JSON do Flutter (FormatException).

// ==================== UTILITÁRIOS DE LOGGING ====================
const LOG = {
    sistema: (msg: string) => console.log(`[⚙️ SISTEMA] ${msg}`),
    auth: (msg: string) => console.log(`[👤 AUTH] ${msg}`),
    pagamento: (msg: string) => console.log(`[💳 PAGAMENTO] ${msg}`),
    despacho: (msg: string) => console.log(`[🚚 DESPACHO] ${msg}`),
    notificacao: (msg: string) => console.log(`[🔔 NOTIFICAÇÃO] ${msg}`),
    chat: (msg: string) => console.log(`[💬 CHAT] ${msg}`),
    info: (msg: string) => console.log(`[ℹ️ INFO] ${msg}`),
    servico: (msg: string) => console.log(`[🔧 SERVIÇO] ${msg}`),
    erro: (msg: string, detalhe?: any) => {
        console.error(`[❌ ERRO] ${msg}`);
        if (detalhe) {
            console.error(`[❌ DETALHE]`, detalhe);

            // Log stack trace if available
            if (detalhe instanceof Error) {
                console.error(`[❌ STACK]`, detalhe.stack);
                console.error(`[❌ TIPO]`, detalhe.constructor.name);
                console.error(`[❌ MENSAGEM]`, detalhe.message);
            }

            // Log additional context if it's an object
            if (typeof detalhe === 'object' && detalhe !== null) {
                try {
                    console.error(`[❌ CONTEXTO]`, JSON.stringify(detalhe, null, 2));
                } catch (e) {
                    console.error(`[❌ CONTEXTO] (não serializável)`);
                }
            }
        }
    },
    sucesso: (msg: string) => console.log(`[✅ SUCESSO] ${msg}`),
    debug: (msg: string) => console.log(`[🔍 DEBUG] ${msg}`),
    warn: (msg: string) => console.warn(`[⚠️ ATENÇÃO] ${msg}`)
};

// Enable CORS for all routes
app.use('/*', cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization', 'Upgrade-Insecure-Requests'],
    allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
    exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
    maxAge: 600,
    credentials: true,
}));

// ==================== MIDDLEWARES DE FEATURE FLAG ====================
async function checkUberModuleEnabled(c: any) {
    try {
        const db = c.env.DB;
        const config: any = await db.prepare(
            "SELECT value FROM app_config WHERE key = 'uber_module_enabled'"
        ).first();

        const isEnabled = config?.value === 'true';

        if (!isEnabled) {
            return c.json({
                success: false,
                message: 'Módulo Uber não está habilitado',
                error_code: 'MODULE_DISABLED'
            }, 403);
        }

        return null;
    } catch (e) {
        LOG.erro('Erro ao verificar flag do módulo Uber:', e);
        return null;
    }
}

app.get('/', (c) => c.text('Projeto Central Backend - Cloudflare Worker 🚀'));

/**
 * Middleware de Rate Limiting Adaptivo via D1
 * (Evita flood em rotas críticas como Dispatch, Payment e Login)
 */
const d1RateLimiter = (options: { route: string; maxRequests: number; windowMinutes: number }) => {
    return async (c: any, next: any) => {
        try {
            const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
            if (ip === 'unknown') return await next(); // Bypass se não conseguir identificar o IP na Borda

            const db = c.env.DB;
            const now = Date.now();
            const timeWindow = options.windowMinutes * 60 * 1000;
            const limitDate = new Date(now - timeWindow).toISOString();

            // 1. Contar execuções recentes no D1
            const countResult: any = await db.prepare(
                `SELECT COUNT(*) as hits FROM rate_limit_logs 
                 WHERE ip_address = ? AND route = ? AND created_at > ?`
            ).bind(ip, options.route, limitDate).first();

            const hits = countResult?.hits || 0;

            if (hits >= options.maxRequests) {
                LOG.erro(`Rate Limit Excedido: IP ${ip} tentou ${options.route} ${hits} vezes.`);
                c.header('Retry-After', String(options.windowMinutes * 60));
                return c.json({
                    success: false,
                    error: 'Muitas requisições. Tente novamente mais tarde.',
                    limit: options.maxRequests
                }, 429);
            }

            // 2. Registrar Novo Hit (De forma assíncrona p/ não bloquear o Client via waitUntil)
            c.executionCtx.waitUntil(
                db.prepare(`INSERT INTO rate_limit_logs (ip_address, route) VALUES (?, ?)`).bind(ip, options.route).run()
            );

            // Permite seguir
            await next();

            // 3. Limpeza de Lixo Aleatória (5% de chance de limpar os logs velhos ao passar aqui)
            if (Math.random() < 0.05) {
                c.executionCtx.waitUntil(
                    db.prepare(`DELETE FROM rate_limit_logs WHERE created_at <= ?`).bind(limitDate).run()
                );
            }

        } catch (error) {
            LOG.erro('Falha no Rate Limiter (Bypassing...)', error);
            await next(); // Se o BD falhar, não tranca as requests
        }
    };
};

/**
 * ==================== ROTAS DE SAÚDE E DEBUG ====================
 */
app.get('/health', (c) => c.json({ ok: true, environment: 'edge', timestamp: new Date().toISOString() }));

/**
 * DEBUG: Check Database Stats
 */
app.get('/api/debug/db-stats', async (c) => {
    try {
        const db = c.env.DB;
        const profCount: any = await db.prepare('SELECT COUNT(*) as count FROM professions').first();
        const taskCount: any = await db.prepare('SELECT COUNT(*) as count FROM task_catalog').first();

        return c.json({
            success: true,
            database: "ai-service-db",
            counts: {
                professions: profCount?.count || 0,
                tasks: taskCount?.count || 0
            }
        });
    } catch (error: any) {
        return c.json({ success: false, message: "Erro na consulta D1", error: error.message }, 500);
    }
});

/**
 * DEBUG: Ping AI Service
 */
app.get('/api/debug/ping-ai', async (c) => {
    const results: any = { binding: null, url: null };

    // 1. Try Service Binding
    if (c.env.AI_SERVICE) {
        try {
            const res = await c.env.AI_SERVICE.fetch('https://ai-service/health');
            results.binding = {
                ok: res.ok,
                status: res.status,
                data: res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text()
            };
        } catch (e: any) {
            results.binding = { error: e.message };
        }
    }

    // 2. Try Public URL fallback
    if (c.env.AI_SERVICE_URL) {
        try {
            const res = await fetch(`${c.env.AI_SERVICE_URL}/health`);
            results.url = {
                ok: res.ok,
                status: res.status,
                data: res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text()
            };
        } catch (e: any) {
            results.url = { error: e.message };
        }
    }

    return c.json({
        success: true,
        ai_service_config: {
            has_binding: !!c.env.AI_SERVICE,
            url_env: c.env.AI_SERVICE_URL
        },
        results
    });
});

/**
 * MEDIA: Generate Signed URL for GCS/Firebase Storage Upload (V4 Calling)
 * Bypasses Worker limits by allowing direct upload to bucket.
 */
app.get('/api/media/upload-url', async (c) => {
    try {
        const filename = c.req.query('filename');
        const type = c.req.query('type') || 'general'; // 'service', 'chat', 'profile'

        if (!filename) return c.json({ success: false, error: 'Filename required' }, 400);

        const serviceAccountJson = c.env.FIREBASE_SERVICE_ACCOUNT;
        if (!serviceAccountJson) {
            return c.json({ success: false, error: 'Storage not configured (missing SA)' }, 500);
        }

        const serviceAccount = JSON.parse(serviceAccountJson);

        // Fix: Use the correct bucket name from google-services.json or env var
        // Default pattern for new projects is .firebasestorage.app, legacy is .appspot.com
        const bucketName = c.env.FIREBASE_STORAGE_BUCKET || 'cardapyia-service-2025.firebasestorage.app';

        const objectName = `uploads/${type}/${Date.now()}_${filename}`;

        // GCS V4 Signing Logic
        const method = 'PUT';
        const expiration = 15 * 60; // 15 minutes
        const now = Math.floor(Date.now() / 1000);
        const exp = now + expiration;

        const dateKey = new Date().toISOString().replace(/[:-]/g, '').split('T')[0]; // YYYYMMDD
        const region = 'auto';
        const service = 'storage';
        const requestDate = new Date().toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z'; // YYYYMMDDTHHMMSSZ

        const credentialScope = `${dateKey}/${region}/${service}/goog4_request`;

        // Canonical Request
        // Fix: For Path Style (storage.googleapis.com/bucket/object), CanonicalUri must start with /bucket/object
        // Fix: Do NOT encode slashes for directory structure, only components.
        const encodedObjectPath = objectName.split('/').map(p => encodeURIComponent(p)).join('/');
        const canonicalUri = `/${bucketName}/${encodedObjectPath}`;

        const canonicalQueryString = [
            `X-Goog-Algorithm=GOOG4-RSA-SHA256`,
            `X-Goog-Credential=${encodeURIComponent(serviceAccount.client_email + '/' + credentialScope)}`,
            `X-Goog-Date=${requestDate}`,
            `X-Goog-Expires=${expiration}`,
            `X-Goog-SignedHeaders=host`
        ].join('&');

        const canonicalHeaders = `host:storage.googleapis.com\n`;
        const signedHeaders = 'host';
        const payloadHash = 'UNSIGNED-PAYLOAD'; // Allow any payload

        const canonicalRequest = [
            method,
            canonicalUri,
            canonicalQueryString,
            canonicalHeaders,
            signedHeaders,
            payloadHash
        ].join('\n');

        // String to Sign
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRequest));
        const hexHash = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

        const stringToSign = [
            'GOOG4-RSA-SHA256',
            requestDate,
            credentialScope,
            hexHash
        ].join('\n');

        // Signing
        // Fix: Clean key just like in fcm-v1.ts
        const keyData = serviceAccount.private_key
            .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, '')
            .replace(/\\n/g, '')
            .replace(/\s+/g, '');

        const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));

        const cryptoKey = await crypto.subtle.importKey(
            'pkcs8',
            binaryKey,
            { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signature = await crypto.subtle.sign(
            'RSASSA-PKCS1-v1_5',
            cryptoKey,
            new TextEncoder().encode(stringToSign)
        );

        const hexSignature = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

        // Construct Final URL
        // CanonicalUri already includes /bucket/object, so we interpret it relative to host
        const uploadUrl = `https://storage.googleapis.com${canonicalUri}?${canonicalQueryString}&X-Goog-Signature=${hexSignature}`;

        return c.json({
            success: true,
            uploadUrl: uploadUrl,
            key: objectName, // We use object path as key for reference
            bucket: bucketName,
            expires_in: expiration
        });

    } catch (e: any) {
        LOG.erro('Erro ao gerar URL de upload:', e);
        return c.json({ success: false, error: e.message }, 500);
    }
});
/**
 * DEBUG: Force Dispatch Cycle
 */
app.post('/api/debug/force-dispatch', async (c) => {
    try {
        const id = c.env.DISPATCH_MANAGER.idFromName('GLOBAL_DISPATCHER');
        const stub = c.env.DISPATCH_MANAGER.get(id);

        // Trigger the fetch handler in DO which should wake up the alarm or run tasks
        const res = await stub.fetch('http://do/wake-up');

        LOG.despacho(`Forçado ciclo de despacho via endpoint de debug`);
        return c.json({ success: true, message: "Dispatch forced via DO fetch", do_status: res.status });
    } catch (e: any) {
        LOG.erro(`Falha ao forçar despacho:`, e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

/**
 * TEST: Force Payment Approval
 * Used ONLY for integration testing to simulate MP Webhook.
 */
app.post('/api/test/force-payment-approval', async (c) => {
    const testSecret = c.req.header('X-Test-Secret');
    // In a real environment, this secret would be in env, but for local/controlled test we can use a hardcoded fallback if env missing
    if (testSecret !== (c.env as any).TEST_SECRET && testSecret !== 'maestro-v2-test-secret') {
        return c.json({ success: false, message: 'Unauthorized Test Access' }, 401);
    }

    const { service_id, type } = await c.req.json();
    const db = c.env.DB;

    try {
        // Initialize Notification Registry - COMMENTED OUT (Schema mismatch/Deprecated)
        // await db.prepare('INSERT INTO notification_registry (service_id, cycle_count, status, created_at) VALUES (?, 0, "pending", datetime("now"))')
        //    .bind(service_id).run();

        LOG.sucesso(`Serviço Criado: ${service_id} (Cliente: N/A for test)`); // Adjusted for test context

        const service: any = await db.prepare('SELECT status, provider_id, client_id, arrived_at FROM service_requests WHERE id = ?')
            .bind(service_id).first();

        if (!service) return c.json({ success: false, message: 'Service not found' }, 404);

        let updateSql = '';
        let params: any[] = [];

        if (type === 'initial' && service.status === 'waiting_payment') {
            const newStatus = service.provider_id ? 'accepted' : 'pending';
            updateSql = 'UPDATE service_requests SET status = ? WHERE id = ?';
            params = [newStatus, service_id];

            if (newStatus === 'pending') {
                c.executionCtx.waitUntil((async () => {
                    const updatedService: any = await db.prepare('SELECT * FROM service_requests WHERE id = ?').bind(service_id).first();
                    if (updatedService) {
                        await populateServiceQueue(db, service_id, updatedService);
                        // Global dispatcher is likely not used for scheduled services that are already matched?
                        // If it's waiting_payment, it has a provider_id usually?
                        // If mobile, it has NO provider_id yet? Wait.
                        // "waiting_payment" for mobile usually implies we found a provider or we are broadcasting?
                        // If type=initial, we transition to pending (broadcast) or accepted (matched).

                        const id = c.env.DISPATCH_MANAGER.idFromName('GLOBAL_DISPATCHER');
                        const obj = c.env.DISPATCH_MANAGER.get(id);
                        await obj.fetch(new Request(`http://dispatch/wake-up`, { method: 'POST' }));
                    }
                })());
            }
        }
        else if (type === 'remaining' && (service.status === 'waiting_payment_remaining' || (service.status === 'accepted' && service.arrived_at !== null))) {
            updateSql = 'UPDATE service_requests SET status = ?, payment_remaining_status = ? WHERE id = ?';
            params = [ServiceStatus.IN_PROGRESS, 'paid', service_id];
        }

        if (updateSql) {
            await db.prepare(updateSql).bind(...params).run();

            // Sync
            c.executionCtx.waitUntil((async () => {
                // @ts-ignore
                await syncStatusToFirebase(c.env, service_id, params[0], [service.client_id, service.provider_id], { provider_id: service.provider_id });
            })());

            return c.json({ success: true, message: `Forced status to ${params[0]}` });
        }

        return c.json({ success: false, message: 'No transition possible from current state' }, 400);

    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

/**
 * TEST: Simple Payment Approval for Dev Button
 */
app.post('/api/test/approve-payment/:serviceId', async (c) => {
    const serviceId = c.req.param('serviceId');
    const db = c.env.DB;
    LOG.despacho(`🎯 [TEST] Approve Payment Triggered for Service: ${serviceId}`);

    try {
        const service: any = await db.prepare('SELECT status, provider_id, client_id, arrived_at, profession, profession_id, latitude, longitude, price_estimated, scheduled_at, description, address FROM service_requests WHERE id = ?')
            .bind(serviceId).first();

        if (!service) return c.json({ success: false, message: 'Service not found' }, 404);

        const isRemaining = (service.status === 'waiting_payment_remaining' ||
            (service.status === 'accepted' && service.arrived_at !== null) ||
            service.status === ServiceStatus.IN_PROGRESS);

        if (isRemaining) {
            await db.prepare('UPDATE service_requests SET status = ?, payment_remaining_status = ? WHERE id = ?')
                .bind(ServiceStatus.IN_PROGRESS, 'paid', serviceId).run();

            // Insert Dummy Payment (Required for pay_remaining endpoint validation)
            await db.prepare('INSERT OR REPLACE INTO payments (mission_id, user_id, amount, status, mp_payment_id, payment_method_id, payer_email) VALUES (?, ?, ?, ?, ?, ?, ?)')
                .bind(serviceId, service.client_id || 0, 0, 'approved', 'TEST-REM-' + Date.now(), 'pix', 'test@example.com')
                .run();

            c.executionCtx.waitUntil(syncStatusToFirebase(c.env, serviceId, ServiceStatus.IN_PROGRESS, [service.client_id, service.provider_id], {
                provider_id: service.provider_id,
                payment_remaining_status: 'paid'
            }));

            // Notify Provider of Remaining Payment
            if (service.provider_id) {
                c.executionCtx.waitUntil(sendNotificationToUser(
                    c.env,
                    service.provider_id,
                    '💰 Pagamento Confirmado!',
                    'O pagamento restante foi confirmado pelo cliente.',
                    { service_id: serviceId, type: 'payment_confirmed' }
                ));
            }

            return c.json({ success: true, message: 'Pagamento restante aprovado (TESTE)' });
        } else if (service.status === ServiceStatus.WAITING_PAYMENT) {
            const newStatus = service.provider_id ? ServiceStatus.ACCEPTED : ServiceStatus.PENDING;

            await db.prepare('UPDATE service_requests SET status = ? WHERE id = ?')
                .bind(newStatus, serviceId).run();

            // Insert Dummy Payment (Good practice for tests)
            await db.prepare('INSERT OR REPLACE INTO payments (mission_id, user_id, amount, status, mp_payment_id, payment_method_id, payer_email) VALUES (?, ?, ?, ?, ?, ?, ?)')
                .bind(serviceId, service.client_id || 0, 0, 'approved', 'TEST-UP-' + Date.now(), 'pix', 'test@example.com')
                .run();

            if (newStatus === ServiceStatus.PENDING) {
                // Wake up dispatcher
                const updatedService: any = await db.prepare('SELECT * FROM service_requests WHERE id = ?').bind(serviceId).first();
                if (updatedService) {
                    const { count: qCount, debugInfo } = await populateServiceQueue(db, serviceId, updatedService);
                    LOG.despacho(`[TEST] Fila populada com ${qCount} itens.`);

                    const id = c.env.DISPATCH_MANAGER.idFromName('GLOBAL_DISPATCHER');
                    const obj = c.env.DISPATCH_MANAGER.get(id);
                    await obj.fetch(new Request(`http://dispatch/wake-up`, { method: 'POST' }));

                    return c.json({
                        success: true,
                        message: `Pagamento inicial aprovado (TESTE) -> ${newStatus}`,
                        queueCount: qCount,
                        debug: debugInfo
                    });
                }
            }

            c.executionCtx.waitUntil(syncStatusToFirebase(c.env, serviceId, newStatus, [service.client_id, service.provider_id], {
                provider_id: service.provider_id
            }));

            // Notify Provider if already assigned (Scheduled/Fixed Provider)
            if (newStatus === ServiceStatus.ACCEPTED && service.provider_id) {
                let bodyText = 'Novo serviço agendado e confirmado.';
                if (service.scheduled_at) {
                    const date = new Date(service.scheduled_at);
                    const formattedDate = `${date.getDate()}/${date.getMonth() + 1} às ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
                    bodyText = `📅 Novo Agendamento: ${formattedDate}\n📍 ${service.address || 'Endereço não informado'}`;
                }

                c.executionCtx.waitUntil(sendNotificationToUser(
                    c.env,
                    service.provider_id,
                    '✅ Novo Serviço Confirmado!',
                    bodyText,
                    {
                        service_id: serviceId,
                        type: 'service_accepted',
                        scheduled_at: service.scheduled_at
                    }
                ));
            }

            return c.json({ success: true, message: `Pagamento inicial aprovado (TESTE) -> ${newStatus}` });
        }

        return c.json({ success: false, message: 'Status atual não permite aprovação de pagamento' }, 400);
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

/**
 * API: Professions List (for Autocomplete)
 */
app.get('/api/services/professions', async (c) => {
    try {
        const db = c.env.DB;

        // 1. Fetch professions and active tasks in a single query (or join)
        // Since D1 join support is standard SQL, we join professions with task_catalog
        const result: any = await db.prepare(`
                SELECT p.name as profession_name, t.id, t.name, t.unit_price, t.unit_name
                FROM professions p
                LEFT JOIN task_catalog t ON p.id = t.profession_id
                WHERE t.active = 1 OR t.id IS NULL
                ORDER BY p.name ASC, t.name ASC
            `).all();

        const structure: Record<string, any[]> = {};

        if (result.results) {
            for (const row of result.results) {
                const profName = row.profession_name;
                if (!structure[profName]) {
                    structure[profName] = [];
                }
                if (row.id) {
                    structure[profName].push({
                        id: row.id,
                        name: row.name,
                        price: Number(row.unit_price) || 0.0,
                        unit: row.unit_name
                    });
                }
            }
        }

        return c.json(structure);
    } catch (error: any) {
        LOG.erro('Erro ao carregar mapa de profissões:', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Tasks by Profession
 * Used by Mobile App to list checkbox options
 */
app.get('/api/services/professions/:id/tasks', async (c) => {
    const id = c.req.param('id');
    try {
        const db = c.env.DB;
        const result: any = await db.prepare(`
                SELECT id, name, unit_price, unit_name
                FROM task_catalog
                WHERE profession_id = ? AND active = 1
                ORDER BY name ASC
            `).bind(id).all();

        return c.json({
            success: true,
            tasks: result.results || []
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

app.get('/api/auth/professions', async (c) => {
    try {
        const db = c.env.DB;
        const result: any = await db.prepare('SELECT * FROM professions ORDER BY name ASC').all();

        // D1 .all() returns { results: [], success: true, ... }
        return c.json({
            success: true,
            professions: result.results || []
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * Helper: Decode JWT (Unverified) to get UID/Email for "Edge Integration"
 */
function decodeJwt(token: string): any {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = parts[1];
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}



/**
 * Helper: Notify providers when a service is ready (typically after payment)
 * LEGACY: Now mostly handled via populateServiceQueue + Global Dispatcher wake-up.
 */
async function triggerServiceNotifications(
    serviceId: string,
    db: any,
    env: WorkerBindings,
    executionCtx: any
): Promise<void> {
    try {
        LOG.despacho(`⚙️ ====== Iniciando Acordada do Despachante para Serviço: ${serviceId} ======`);

        // Pulse: Wake up the global dispatcher to check for new paid services
        const id = env.DISPATCH_MANAGER.idFromName('GLOBAL_DISPATCHER');
        const obj = env.DISPATCH_MANAGER.get(id);

        executionCtx.waitUntil(
            obj.fetch(new Request(`http://dispatch/wake-up`, {
                method: 'POST'
            }))
        );

        LOG.despacho(`🔔 Sinal de WAKE-UP enviado ao Despachante Global.`);

    } catch (error: any) {
        LOG.erro(`Erro ao acordar despachante para serviço ${serviceId}:`, error);
    }
}

/**
 * Robustly sync status changes to Firebase (Firestore + RTDB)
 * Ensures UI updates in real-time for both Client and Provider.
 */
async function syncStatusToFirebase(
    env: WorkerBindings,
    serviceId: string,
    status: string,
    userIds: number[] = [],
    additionalData: any = {},
    eventType: string = 'service.status'
) {
    const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
        LOG.warn(`[Sync] Sincronização omitida: FIREBASE_SERVICE_ACCOUNT não configurado`);
        return;
    }

    try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        const projectId = serviceAccount.project_id;

        const accessToken = await getAccessTokenFromServiceAccount(serviceAccountJson);
        if (!accessToken) {
            LOG.erro(`[Sync] Falha ao obter token OAuth para sincronização`);
            return;
        }

        // 1. Maestro v2: Notificar usuários via RTDB (Pulse p/ Refresh)
        // O Firestore foi removido para centralizar no D1 como única fonte da verdade.
        // O app agora recebe o pulso e busca os dados atualizados via API.
        for (const userId of userIds) {
            if (!userId) continue;
            const rtdbUrl = `https://${projectId}-default-rtdb.firebaseio.com/events/${userId}.json`;
            const eventPayload = {
                type: eventType,
                payload: {
                    id: serviceId,
                    service_id: serviceId,
                    status: status,
                    timestamp: Date.now(),
                    ...additionalData
                },
                timestamp: Date.now()
            };

            const rtdbResp = await fetch(rtdbUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventPayload)
            });

            if (!rtdbResp.ok) {
                LOG.erro(`[Sync] Erro RTDB user ${userId}: ${await rtdbResp.text()}`);
            } else {
                LOG.sucesso(`[Sync] RTDB [Pulse]: Enviado para user ${userId} (${status})`);
            }
        }

    } catch (e: any) {
        LOG.erro(`[Sync] Erro crítico: ${e.message}`);
    }
}

/**
 * Firestore Sync: Espelha dados essenciais do serviço no Firestore para tempo real.
 * O Flutter pode usar snapshots() para ouvir mudanças automaticamente.
 * Coleção: services/{serviceId}
 */
async function syncToFirestore(
    env: WorkerBindings,
    serviceId: string,
    data: { [key: string]: any }
) {
    const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) return;

    try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        const projectId = serviceAccount.project_id;
        const accessToken = await getAccessTokenFromServiceAccount(serviceAccountJson);
        if (!accessToken) return;

        // Build Firestore document fields
        const fields: any = {};
        for (const [key, value] of Object.entries(data)) {
            if (value === null || value === undefined) {
                fields[key] = { nullValue: null };
            } else if (typeof value === 'number') {
                if (Number.isInteger(value)) {
                    fields[key] = { integerValue: value.toString() };
                } else {
                    fields[key] = { doubleValue: value };
                }
            } else if (typeof value === 'boolean') {
                fields[key] = { booleanValue: value };
            } else {
                fields[key] = { stringValue: value.toString() };
            }
        }

        // Always include updated_at timestamp
        fields['updated_at'] = { integerValue: Date.now().toString() };

        // Use 'service_requests' collection to match D1 table name as requested
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/service_requests/${serviceId}`;

        console.log(`[Firestore] Mirroring service ${serviceId} status ${data.status || '?'} to collection 'service_requests'`);

        const resp = await fetch(firestoreUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields })
        });

        if (resp.ok) {
            LOG.sucesso(`[Firestore] ✅ Serviço ${serviceId} espelhado (status: ${data.status || '?'})`);
        } else {
            const errText = await resp.text();
            LOG.erro(`[Firestore] ❌ Erro ao espelhar serviço ${serviceId}: ${errText}`);
        }
    } catch (e: any) {
        LOG.warn(`[Firestore] ⚠️ Erro não-fatal ao espelhar: ${e.message}`);
    }
}

/**
 * Helper: Calculate distance between two coordinates (km)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}



/**
 * LOCATION: Reverse Geocoding (Lat/Lon to Address)
 */
app.get('/api/location/reverse', async (c) => {
    const lat = c.req.query('lat');
    const lon = c.req.query('lon');
    const MAPBOX_TOKEN = env.MAPBOX_TOKEN || '';

    if (!lat || !lon) {
        return c.json({ error: 'Missing lat or lon' }, 400);
    }

    try {
        // 1. Try Mapbox first
        const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,poi&limit=1&language=pt`;
        const response = await fetch(mapboxUrl);

        if (response.ok) {
            const data: any = await response.json();
            if (data.features && data.features.length > 0) {
                const feat = data.features[0];
                return c.json({
                    display_name: feat.place_name,
                    main_text: feat.text,
                    address: feat.place_name
                });
            }
        }

        // 2. Fallback to Nominatim
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
        const nomRes = await fetch(nominatimUrl, { headers: { 'User-Agent': 'ProjetoCentral/1.0' } });
        if (nomRes.ok) {
            const nomData: any = await nomRes.json();
            return c.json({
                display_name: nomData.display_name,
                main_text: nomData.name || nomData.address?.road || 'Local Desconhecido',
                address: nomData.display_name
            });
        }

        return c.json({ error: 'Not found' }, 404);
    } catch (error: any) {
        console.error(`[Reverse] Erro: ${error.message}`);
        return c.json({ error: error.message }, 500);
    }
});
app.get('/api/location/route', async (c) => {
    const originLat = c.req.query('originLat');
    const originLon = c.req.query('originLon');
    const destLat = c.req.query('destLat');
    const destLon = c.req.query('destLon');

    if (!originLat || !originLon || !destLat || !destLon) {
        return c.json({ error: 'Missing coordinates' }, 400);
    }

    try {
        // Usando Mapbox Directions API
        const MAPBOX_TOKEN = env.MAPBOX_TOKEN || '';
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=polyline&access_token=${MAPBOX_TOKEN}`;

        const response = await fetch(url);
        const data: any = await response.json();

        if (data.code !== 'Ok') {
            if (data.code === 'NoRoute') {
                return c.json({ error: 'Nenhuma rota encontrada' }, 404);
            }
            throw new Error(`Mapbox erro: ${data.code} - ${data.message || ''}`);
        }

        const route = data.routes[0];

        const distanceKm = (route.distance / 1000).toFixed(1);
        const durationMin = Math.round(route.duration / 60);

        return c.json({
            distance_text: `${distanceKm} km`,
            distance_value: Math.round(route.distance),
            duration_text: `${durationMin} mins`,
            duration_value: Math.round(route.duration),
            polyline: route.geometry
        });
    } catch (error: any) {
        LOG.erro('Erro ao buscar rota (Mapbox):', error);
        return c.json({ error: 'Falha ao buscar rota' }, 500);
    }
});
/**
 * Maestro v2: Centralized helper to update service status in D1 and notify via Firebase
 */
// ✅ Com ctx opcional para waitUntil
async function updateServiceStatus(
    env: WorkerBindings,
    serviceId: string,
    newStatus: ServiceStatus | string,
    userIdsToNotify: number[] = [],
    additionalData: any = {},
    extraUpdates: { [key: string]: any } = {},
    whereClause: string = 'id = ?',
    whereBinds: any[] = [],
    eventType: string = 'service.status',
    ctx?: ExecutionContext  // ← NOVO: parâmetro opcional
) {
    const db = env.DB;
    try {
        // Build dynamic query
        const updates = ['status = ?, status_updated_at = CURRENT_TIMESTAMP'];
        const binds: any[] = [newStatus];

        for (const [key, value] of Object.entries(extraUpdates)) {
            updates.push(`${key} = ?`);
            binds.push(value);
        }

        // We need to handle whereClause. 
        // If the caller assumes 'id = ?' is default, they might expect us to prepend serviceId to whereBinds?
        // Let's check the previous logic or assume the caller handles it.
        // In the original provided code in Step 1660/1710, whereClause default is 'id = ?'.
        // And whereBinds default is [].
        // Line 791 was: binds.push(serviceId, ...whereBinds);
        // This implies serviceId is ALWAYS the first bind for the WHERE clause if we simply append whereClause.
        // BUT if whereClause is custom, serviceId might not be needed or might be needed in a specific place.
        // HOWEVER, looking at existing calls (from Step 1660), e.g. accept endpoint:
        // whereClause: "id = ? AND status IN ...", whereBinds: []
        // This implies serviceId IS expected to be the first bind.

        const query = `UPDATE service_requests SET ${updates.join(', ')} WHERE ${whereClause}`;
        binds.push(serviceId, ...whereBinds);

        const result = await db.prepare(query).bind(...binds).run();

        if (result.meta.changes > 0) {
            LOG.sucesso(`[Maestro] Status do serviço ${serviceId} atualizado para ${newStatus} no D1`);

            // 2. Sync to Firebase (Pulse / RTDB) — legacy
            const firebasePromise = syncStatusToFirebase(env, serviceId, newStatus, userIdsToNotify, additionalData, eventType);
            if (ctx) ctx.waitUntil(firebasePromise);
            else firebasePromise.catch(e => LOG.erro('Erro Firebase sync', e));

            // 3. Sync to Firestore (Real-time mirror for Flutter snapshots)
            const firestoreSyncPromise = (async () => {
                try {
                    const svc: any = await db.prepare(
                        'SELECT id, status, profession, client_id, provider_id, description, address, latitude, longitude, price_estimated, price_upfront, scheduled_at, created_at FROM service_requests WHERE id = ?'
                    ).bind(serviceId).first();
                    if (svc) {
                        await syncToFirestore(env, serviceId, {
                            status: svc.status,
                            profession: svc.profession || '',
                            client_id: svc.client_id,
                            provider_id: svc.provider_id,
                            description: svc.description || '',
                            address: svc.address || '',
                            latitude: svc.latitude,
                            longitude: svc.longitude,
                            price_estimated: svc.price_estimated,
                            price_upfront: svc.price_upfront,
                            scheduled_at: svc.scheduled_at || '',
                            created_at: svc.created_at || '',
                            ...extraUpdates
                        });
                    }
                } catch (fsErr: any) {
                    LOG.warn(`[Firestore] Espelhamento falhou (não-fatal): ${fsErr.message}`);
                }
            })();

            if (ctx) ctx.waitUntil(firestoreSyncPromise);
            else firestoreSyncPromise.catch(e => console.error(e));

            // 4. Send FCM Data Message (Realtime Trigger for Mobile App)
            if (env.FIREBASE_SERVICE_ACCOUNT) {
                const fcmPromise = (async () => {
                    for (const userId of userIdsToNotify) {
                        try {
                            const user: any = await db.prepare('SELECT fcm_token FROM users WHERE id = ?').bind(userId).first();
                            if (user && user.fcm_token) {
                                await sendFCMNotificationV1(env.FIREBASE_SERVICE_ACCOUNT!, user.fcm_token, {
                                    title: '',
                                    body: '',
                                    data: {
                                        type: eventType,
                                        id: serviceId,
                                        service_id: serviceId,
                                        status: newStatus,
                                        timestamp: Date.now().toString(),
                                        ...additionalData
                                    }
                                });
                                LOG.notificacao(`⚡ FCM Data Message enviado para User #${userId} (Status: ${newStatus})`);
                            }
                        } catch (err: any) {
                            LOG.erro(`Falha ao enviar FCM de status para User #${userId}: ${err.message}`);
                        }
                    }
                })();

                if (ctx) ctx.waitUntil(fcmPromise);
                else fcmPromise.catch(e => console.error(e));

                // 5. Visible Notification + Firestore History (Hybrid)
                const importantStatuses = [
                    ServiceStatus.ACCEPTED,
                    ServiceStatus.COMPLETED,
                    ServiceStatus.CANCELLED,
                    ServiceStatus.SCHEDULED,
                    ServiceStatus.SCHEDULE_PROPOSED,
                    ServiceStatus.OPEN_FOR_SCHEDULE,
                    ServiceStatus.IN_PROGRESS // Added
                ];

                if (importantStatuses.includes(newStatus as ServiceStatus)) {
                    const notifyPromise = (async () => {
                        // 6. Fetch provider type to specialize messages
                        let isFixed = false;
                        try {
                            const pInfo: any = await db.prepare('SELECT p.is_fixed_location FROM providers p JOIN service_requests s ON p.user_id = s.provider_id WHERE s.id = ?').bind(serviceId).first();
                            if (pInfo) isFixed = pInfo.is_fixed_location === 1;
                        } catch (e) {
                            LOG.erro('Falha ao detectar tipo de prestador em notify', e);
                        }

                        for (const userId of userIdsToNotify) {
                            let title = 'Atualização do Serviço';
                            let body = `O status do serviço mudou para ${newStatus}.`;

                            switch (newStatus) {
                                case ServiceStatus.ACCEPTED:
                                    title = 'Serviço Aceito! 🚀';
                                    body = isFixed
                                        ? 'Seu serviço foi aceito. O prestador aguarda você no local combinado.'
                                        : 'Seu serviço foi aceito. O prestador chegará em breve ao seu local.';
                                    break;
                                case ServiceStatus.COMPLETED:
                                    title = 'Serviço Concluído ✅';
                                    body = 'O prestador finalizou o serviço. Por favor, confirme e avalie!';
                                    break;
                                case ServiceStatus.CANCELLED:
                                    title = 'Serviço Cancelado ❌';
                                    body = 'O serviço foi cancelado.';
                                    break;
                                case ServiceStatus.SCHEDULED:
                                    title = 'Agendamento Confirmado 📅';
                                    body = 'O horário do serviço foi confirmado com sucesso.';
                                    break;
                                case ServiceStatus.SCHEDULE_PROPOSED:
                                    title = 'Nova Proposta de Horário 🕒';
                                    body = 'Recebemos uma nova sugestão de horário. Verifique sua agenda.';
                                    break;
                                case ServiceStatus.OPEN_FOR_SCHEDULE:
                                    title = 'Disponível para Agendamento';
                                    body = 'Novos horários foram disponibilizados para este serviço.';
                                    break;
                                case ServiceStatus.IN_PROGRESS:
                                    title = 'Serviço Iniciado ▶️';
                                    body = 'A execução do serviço foi iniciada.';
                                    break;
                            }

                            // Event specialization (Payments / Arrival etc)
                            if (eventType === 'client.arrived') {
                                title = 'Cliente chegou! 📍';
                                body = 'O cliente informou que chegou ao seu local e está aguardando.';
                            }

                            await sendNotificationToUser(env, userId, title, body, {
                                type: eventType,
                                service_id: serviceId,
                                status: newStatus,
                                is_fixed: isFixed ? 'true' : 'false'
                            });
                        }
                    })();

                    if (ctx) ctx.waitUntil(notifyPromise);
                    else notifyPromise.catch(e => console.error(`Failed to notify users:`, e));
                }
            }
        }

        return result;

    } catch (e: any) {
        LOG.erro(`[Maestro] Falha ao atualizar status do serviço ${serviceId}: ${e.message}`);
        throw e;
    }
}

/**
 * Helper: Find providers sorted by distance (nearest first) with Bounding Box Optimization
 * [FASE 2] Real-time KV Join: Uses D1 for bounding box, and KV for exact real-time coordinates.
 */
async function findProvidersByDistance(
    env: any, // Pass entire env instead of just db to access KV
    profession: string,
    latitude: number,
    longitude: number,
    maxRadiusKm: number = 50
): Promise<Array<{ userId: number; fcmToken: string; distance: number }>> {
    try {
        const db = env.DB;
        console.log(`[Logística] 🔍 ====== Buscando Prestadores via D1 + KV (Otimizado v10) ======`);
        console.log(`[Logística] Profissão: ${profession}`);

        // Bounding Box Optimization (~40-50km)
        const latMin = latitude - 0.4;
        const latMax = latitude + 0.4;
        const lonMin = longitude - 0.4;
        const lonMax = longitude + 0.4;

        // 1. D1 Query: Get drivers in rough bounding box (Fallback distance)
        const result: any = await db.prepare(`
                SELECT user_id, fcm_token, latitude as d1_lat, longitude as d1_lon
                FROM notification_registry 
                WHERE professions LIKE ?1 
                AND fcm_token IS NOT NULL
                AND fcm_token != ''
                AND latitude BETWEEN ?2 AND ?3
                AND longitude BETWEEN ?4 AND ?5
                AND is_online = 1
                LIMIT 50
            `).bind(
            `%${profession}%`,
            latMin, latMax, lonMin, lonMax
        ).all();

        if (!result.results || result.results.length === 0) {
            console.log(`[Logística] ⚠️ Nenhum registro próximo encontrado no D1 para: ${profession}`);
            return [];
        }

        // 2. Cross-reference with KV Cache for Real-Time Coordinates
        const providersWithPreciseLocation = await Promise.all(
            (result.results as any[]).map(async (r: any) => {
                let currentLat = r.d1_lat;
                let currentLon = r.d1_lon;

                try {
                    // Tenta puxar a posição ultra-recente do KV
                    const kvLoc: any = await env.LOCATION_CACHE.get(`provider_loc:${r.user_id}`, 'json');
                    if (kvLoc && kvLoc.lat && kvLoc.lon) {
                        currentLat = kvLoc.lat;
                        currentLon = kvLoc.lon;
                    }
                } catch (e) {
                    // Fallback silently to D1 coords
                }

                // Cálculo Haversine em TS
                const R = 6371; // Volumetric mean radius of the earth in km
                const dLat = (currentLat - latitude) * Math.PI / 180;
                const dLon = (currentLon - longitude) * Math.PI / 180;
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(latitude * Math.PI / 180) * Math.cos(currentLat * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distanceKw = R * c;

                return {
                    userId: Number(r.user_id),
                    fcmToken: r.fcm_token,
                    distance: distanceKw
                };
            })
        );

        // 3. Filter strictly by maxRadiusKm, sort by nearest, and limit to 20
        const sortedProviders = providersWithPreciseLocation
            .filter(p => p.distance <= maxRadiusKm)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 20);

        console.log(`[Logística] ✅ Encontrados ${sortedProviders.length} prestadores validados via D1+KV`);
        return sortedProviders;
    } catch (error: any) {
        console.error('[Logística] ❌ Erro Cross-Join KV:', error.message);
        return [];
    }
}

/**
 * Sync provider locations from Firebase Realtime Database to D1
 * This ensures we have fresh data before dispatching.
 */
async function syncLocationsFromFirebase(db: any, providerIds: number[]) {
    if (!providerIds || providerIds.length === 0) return;

    LOG.sistema(`🚀 Sincronizando localizações para ${providerIds.length} prestadores...`);

    try {
        const RTDB_URL = "https://cardapyia-service-2025-default-rtdb.firebaseio.com/locations.json";
        const response = await fetch(RTDB_URL);

        if (!response.ok) {
            throw new Error(`Firebase RTDB retornou status ${response.status}`);
        }

        const allLocations: any = await response.json();
        if (!allLocations) return;

        for (const pid of providerIds) {
            const loc = allLocations[pid];
            if (loc && loc.latitude && loc.longitude) {
                LOG.sistema(`📍 Atualizando prestador ${pid}: ${loc.latitude}, ${loc.longitude}`);

                // Update both provider_locations and notification_registry
                await db.prepare(`
                        UPDATE provider_locations 
                        SET latitude = ?, longitude = ?, updated_at = datetime('now') 
                        WHERE provider_id = ?
                    `).bind(loc.latitude, loc.longitude, pid).run();

                await db.prepare(`
                        UPDATE notification_registry 
                        SET latitude = ?, longitude = ?, last_seen_at = datetime('now') 
                        WHERE user_id = ?
                    `).bind(loc.latitude, loc.longitude, pid).run();
            }
        }
        LOG.sucesso(`Sincronização de localização concluída com sucesso`);
    } catch (error: any) {
        LOG.erro(`Erro na sincronização de localização:`, error);
    }
}

// Assuming WorkerBindings is defined elsewhere, e.g.:
// interface WorkerBindings {
//     DB: D1Database;
//     DISPATCH_MANAGER: DurableObjectNamespace;
//     AI_SERVICE?: DurableObjectNamespace;
//     AI_SERVICE_URL?: string;
//     CF_ACCESS_CLIENT_ID?: string;
//     CF_ACCESS_CLIENT_SECRET?: string;
//     FIREBASE_SERVICE_ACCOUNT?: string; // Added for new DispatchManager logic
// }

/**
 * Helper: Calcular valor líquido do prestador
 */
function calculateProviderAmount(totalAmount: number, commissionRate: number): number {
    return totalAmount * (1 - commissionRate);
}

/**
 * Helper: Buscar taxa de comissão da plataforma
 */
async function getPlatformCommission(db: any): Promise<number> {
    try {
        const comm: any = await db.prepare("SELECT value FROM app_config WHERE key = 'platform_commission_rate'").first();
        return (parseFloat(comm?.value || '15')) / 100;
    } catch (e) {
        return 0.15; // Fallback 15%
    }
}

/**
 * Helper: Validate Appointment (Conflict & Working Hours)
 * Returns string with error message if invalid, null if valid.
 */
async function validateAppointment(
    db: any,
    providerId: number | string,
    startTimeStr: string,
    ignoreWorkingHours: boolean = false
): Promise<string | null> {
    try {
        const start = new Date(startTimeStr);

        // IMPORTANT: Parse hours/minutes/day directly from the ISO string
        // to avoid UTC conversion issues in Cloudflare Workers.
        // Flutter sends local time like "2026-02-19T09:30:00.000" without timezone,
        // and provider schedule configs store local time (e.g. "08:00"-"18:00").
        const timeParts = startTimeStr.replace('Z', '').split('T');
        const datePart = timeParts[0]; // "2026-02-19"
        const timePartStr = timeParts[1] || '00:00'; // "09:30:00.000"

        // Parse local hours and minutes from string directly
        const [localHourStr, localMinStr] = timePartStr.split(':');
        const localHour = parseInt(localHourStr, 10);
        const localMin = parseInt(localMinStr, 10);

        // Calculate day of week from date part (without timezone conversion)
        const [yearStr, monthStr, dayStr] = datePart.split('-');
        const localDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
        const dayOfWeek = localDate.getDay();

        console.log(`[ValidateAppointment] Input: "${startTimeStr}" → localHour=${localHour}, localMin=${localMin}, dayOfWeek=${dayOfWeek} (0=Dom,1=Seg...)`);

        let duration = 60; // Default duration in minutes
        let config: any = null;

        // 0. Check Provider Type (Fixed vs Mobile)
        const provider: any = await db.prepare('SELECT is_fixed_location FROM providers WHERE user_id = ?').bind(providerId).first();
        const isMobile = !provider || provider.is_fixed_location !== 1;

        // If Mobile, we implicitly ignore working hours constraints
        const shouldCheckHours = !isMobile && !ignoreWorkingHours;

        // 1. Get Schedule Config (if checking working hours OR if we just want duration)
        // We always try to get config to respect 'slot_duration' if it exists.
        config = await db.prepare(
            'SELECT * FROM provider_schedule_configs WHERE provider_id = ? AND day_of_week = ?'
        ).bind(providerId, dayOfWeek).first();

        console.log(`[ValidateAppointment] Provider ${providerId}: isMobile=${isMobile}, shouldCheckHours=${shouldCheckHours}, config=`, config ? JSON.stringify(config) : 'null');

        if (config && config.slot_duration) {
            duration = config.slot_duration;
        }

        // 2. Validate Working Hours (Only for Fixed Location Providers & Not Ignored)
        if (shouldCheckHours) {
            // If no config, use DEFAULT (Mon-Fri 08:00-18:00)
            if (!config) {
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                    config = {
                        start_time: '08:00',
                        end_time: '18:00',
                        slot_duration: 60,
                        is_active: 1
                    };
                    duration = 60;
                } else {
                    return "Prestador não possui horário configurado para este dia (Fim de semana padrão fechado).";
                }
            }

            // Check explicit inactive
            if (config.is_active === 0 || config.is_enabled === 0 || config.is_active === false || config.is_enabled === false) {
                return "Prestador não atende neste dia da semana.";
            }

            // Use LOCAL hours parsed from string (not UTC from Date object)
            const startMinutes = localHour * 60 + localMin;
            const endMinutes = startMinutes + duration;

            console.log(`[ValidateAppointment] Local startMinutes=${startMinutes} (${localHour}:${localMin}), endMinutes=${endMinutes}, duration=${duration}`);

            // Parse Config Times
            const parseTime = (t: string) => {
                if (!t) return 0;
                const [h, m] = t.split(':').map(Number);
                return h * 60 + m;
            };

            const configStart = parseTime(config.start_time);
            const configEnd = parseTime(config.end_time);

            // Check Working Hours — Supports overnight schedules (e.g. 08:00-04:00)
            console.log(`[ValidateAppointment] configStart=${configStart}, configEnd=${configEnd}, startMinutes=${startMinutes}, endMinutes=${endMinutes}`);

            if (configEnd > configStart) {
                // Normal schedule (e.g. 08:00-18:00)
                if (startMinutes < configStart || endMinutes > configEnd) {
                    return `Horário fora do expediente (${config.start_time} - ${config.end_time})`;
                }
            } else if (configEnd < configStart) {
                // Overnight schedule (e.g. 08:00-04:00 = 8AM to 4AM next day)
                // Valid if: time >= configStart (same day) OR time <= configEnd (next day early morning)
                const isInDayPortion = startMinutes >= configStart; // e.g. 09:30 >= 08:00
                const isInNightPortion = endMinutes <= configEnd;   // e.g. 03:00 <= 04:00
                console.log(`[ValidateAppointment] Overnight Check: isInDayPortion=${isInDayPortion}, isInNightPortion=${isInNightPortion}`);
                if (!isInDayPortion && !isInNightPortion) {
                    console.log(`[ValidateAppointment] REJECTED: Outside overnight hours`);
                    return `Horário fora do expediente (${config.start_time} - ${config.end_time})`;
                }
            }

            // Check Lunch Break
            if (config.lunch_start && config.lunch_end) {
                const lunchStart = parseTime(config.lunch_start);
                const lunchEnd = parseTime(config.lunch_end);
                if ((startMinutes < lunchEnd && endMinutes > lunchStart)) {
                    return "Horário coincide com o intervalo de almoço.";
                }
            }
        }

        // 3. Check Conflicts with Existing Appointments (ALWAYS CHECKED)
        const end = new Date(start.getTime() + duration * 60000); // Recalculate end
        const endTimeStr = end.toISOString().replace('Z', '').split('.')[0];

        const conflict: any = await db.prepare(`
                SELECT id FROM appointments 
                WHERE provider_id = ? 
                AND status != 'cancelled'
                AND start_time < ? 
                AND end_time > ?
            `).bind(providerId, endTimeStr, startTimeStr).first();

        if (conflict) {
            return "Horário indisponível (já agendado).";
        }

        return null; // OK
    } catch (e: any) {
        console.error('Validation Error:', e);
        return "Erro ao validar disponibilidade.";
    }
}

/**
 * Preencher fila de notificações para um serviço
 * Chamado quando serviço muda para status 'paid'
 */
async function populateServiceQueue(
    db: any,
    serviceId: string,
    serviceData: any
): Promise<{ count: number; debugInfo: any }> {
    try {
        const debugInfo: any = {
            targetId: serviceData.profession_id ?? null,
            lat: serviceData.latitude,
            lon: serviceData.longitude,
            candidatesFoundInDb: 0,
            searchRanges: {}
        };
        LOG.despacho(`=== INICIANDO POPULAÇÃO DA FILA PARA SERVIÇO ${serviceId} ===`);
        LOG.despacho(`   Data: Lat=${serviceData.latitude}, Lon=${serviceData.longitude}, Prof=${serviceData.profession_id}`);

        // 1. Buscar taxa de comissão
        const commissionRate = await getPlatformCommission(db);
        LOG.despacho(`Taxa de comissão da plataforma: ${(commissionRate * 100).toFixed(1)}%`);

        // DIAGNOSTIC: Check time and registry count
        const diag: any = await db.prepare("SELECT datetime('now') as now, count(*) as c FROM notification_registry").first();
        LOG.despacho(`   DIAG: D1 Now=${diag?.now}, RegCount=${diag?.c}`);
        debugInfo.totalRegistryCount = diag?.c || 0;
        debugInfo.d1Now = diag?.now;

        // 2. Buscar prestadores online e compatíveis
        const targetId = serviceData.profession_id ?? null;
        const professionPattern = targetId ? `%|${targetId}|%` : null;

        const { results: candidates } = await db.prepare(`
        SELECT
        nr.user_id,
        nr.fcm_token,
        nr.professions,
        nr.professions_ids,
        nr.latitude,
        nr.longitude,
        nr.radius_km,
        (6371 * acos(
            cos(radians(CAST(?1 AS REAL))) * cos(radians(nr.latitude)) *
            cos(radians(nr.longitude) - radians(CAST(?2 AS REAL))) +
            sin(radians(CAST(?1 AS REAL))) * sin(radians(nr.latitude))
        )) AS distance
        FROM notification_registry nr
        WHERE nr.fcm_token IS NOT NULL
        AND nr.fcm_token != ''
        AND nr.last_seen_at > datetime('now', '-30 minutes')
        AND (
            (nr.professions_ids IS NOT NULL 
            AND json_valid(nr.professions_ids) 
            AND EXISTS (SELECT 1 FROM json_each(nr.professions_ids) WHERE value = ?3 OR CAST(value AS TEXT) = CAST(?3 AS TEXT)))
            OR (nr.professions_ids LIKE ?4)
        )
        AND nr.latitude BETWEEN CAST(?5 AS REAL) AND CAST(?6 AS REAL)
        AND nr.longitude BETWEEN CAST(?7 AS REAL) AND CAST(?8 AS REAL)
        ORDER BY distance ASC
    `).bind(
            serviceData.latitude,
            serviceData.longitude,
            targetId,
            professionPattern,
            serviceData.latitude - 0.5,
            serviceData.latitude + 0.5,
            serviceData.longitude - 0.5,
            serviceData.longitude + 0.5
        ).all();

        debugInfo.candidatesFoundInDb = candidates?.length || 0;

        if (!candidates || candidates.length === 0) {
            LOG.warn(`❌ Nenhum candidato online/compatível encontrado para o serviço ${serviceId} (Profissão ID: ${targetId})`);
            LOG.despacho(`   DEBUG: serviceData values - Lat: ${serviceData.latitude} (${typeof serviceData.latitude}), Lon: ${serviceData.longitude} (${typeof serviceData.longitude}), ProfID: ${serviceData.profession_id} (${typeof serviceData.profession_id})`);
            LOG.despacho(`   DEBUG: Computed - Lat-0.5: ${serviceData.latitude - 0.5}, Lat+0.5: ${serviceData.latitude + 0.5}`);
            return { count: 0, debugInfo };
        }

        const candidatesResult = candidates as any[];
        LOG.despacho(`🔍 Encontrados ${candidatesResult.length} candidatos compatíveis no banco. Filtrando por raio...`);

        // 3. Calcular valor líquido do prestador
        // O valor total para a fila deve ser sempre o preço estimado do serviço, 
        // independente de o upfront (taxa de reserva) já ter sido pago.
        const totalAmount = serviceData.price_estimated;
        const providerAmount = calculateProviderAmount(totalAmount, commissionRate);
        LOG.despacho(`Valor total (Estimado): R$${totalAmount.toFixed(2)} | Valor líquido prestador (85%): R$${providerAmount.toFixed(2)}`);

        // 4. Inserir candidatos na fila (ordenados por distância)
        let insertedCount = 0;
        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i] as any;
            const radiusKm = candidate.radius_km ?? 50;

            // Verificar raio de atuação do prestador
            if (candidate.distance > radiusKm) {
                LOG.despacho(`Prestador ${candidate.user_id} ignorado: distância ${candidate.distance.toFixed(2)}km > raio máximo ${radiusKm}km`);
                continue;
            }

            try {
                await db.prepare(`
            INSERT INTO notificacao_de_servicos (
            service_id, provider_user_id, fcm_token, service_name, profession_id,
            price_total, price_provider, commission_rate, distance,
            service_latitude, service_longitude, provider_latitude, provider_longitude,
            notification_count, status, queue_order, ciclo_atual
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'PENDING', ?, 1)
        `).bind(
                    serviceId,
                    candidate.user_id,
                    candidate.fcm_token,
                    serviceData.profession,
                    targetId,
                    totalAmount,
                    providerAmount,
                    commissionRate * 100,
                    candidate.distance,
                    serviceData.latitude,
                    serviceData.longitude,
                    candidate.latitude,
                    candidate.longitude,
                    i + 1
                ).run();

                insertedCount++;
                LOG.despacho(`✅ Prestador ${candidate.user_id} adicionado à fila (posição ${i + 1}, distância ${candidate.distance.toFixed(2)}km)`);
            } catch (error: any) {
                if (!error.message?.includes('UNIQUE constraint')) {
                    LOG.erro(`Erro ao inserir prestador ${candidate.user_id} na fila:`, error.message);
                }
            }
        }

        LOG.sucesso(`Fila populada com ${insertedCount} candidatos para o serviço ${serviceId}`);
        return { count: insertedCount, debugInfo };
    } catch (err: any) {
        LOG.erro(`CRITICAL ERROR in populateServiceQueue:`, err);
        throw err;
    }
}

/**
 * Helper: Atualizar status de notificação
 */
async function updateNotificationStatus(
    db: any,
    serviceId: string,
    providerUserId: number,
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'SILENCE',
    incrementCount: boolean = false
): Promise<void> {
    const updates: string[] = ['status = ?'];
    const params: any[] = [status];

    if (incrementCount) {
        updates.push('notification_count = notification_count + 1');
    }
    updates.push('last_notified_at = datetime("now")');

    await db.prepare(`
        UPDATE notificacao_de_servicos
        SET ${updates.join(', ')}
        WHERE service_id = ? AND provider_user_id = ?
    `).bind(
        ...params,
        serviceId,
        providerUserId
    ).run();
}

// --- DURABLE OBJECTS ---

export class DispatchManager {
    state: any;
    env: WorkerBindings;

    constructor(state: any, env: WorkerBindings) {
        this.state = state;
        this.env = env;
    }

    async fetch(request: Request) {
        const url = new URL(request.url);
        const path = url.pathname;

        if (path === '/wake-up') {
            LOG.despacho(`🔔 Despertando Despachante Global para verificar serviços pendentes...`);
            const currentAlarm = await this.state.storage.getAlarm();

            if (currentAlarm === null) {
                LOG.despacho(`🚀 Iniciando ciclo de despacho imediatamente (nenhum alarme ativo)`);
                await this.state.storage.setAlarm(Date.now());
                return new Response("Dispatcher Started");
            }

            LOG.despacho(`⏰ Alarme já agendado para ${new Date(currentAlarm).toLocaleTimeString()}`);
            return new Response("Dispatcher Already Running");
        }
        return new Response('Not Found', { status: 404 });
    }

    async alarm() {
        LOG.despacho(`⏰=== CICLO GLOBAL DE DESPACHO INICIADO ===`);

        try {
            const db = this.env.DB;

            // 0. Carregar configurações para reciclagem
            let maxCyclesRecycle = 15;
            try {
                const config: any = await db.prepare("SELECT value FROM app_config WHERE key = 'dispatch_max_cycles'").first();
                if (config) maxCyclesRecycle = parseInt(config.value);
            } catch (e) { }

            // 1. Detectar serviços que precisam de reciclagem (fila acabou, mas existem prestadores que ainda não atingiram o limite)
            // Lógica: Se existe algum prestador em SILENCE com notification_count < maxCycles, o serviço deve ser reativado.
            const stalled = await db.prepare(`
                    SELECT id FROM service_requests 
                    WHERE status IN ('pending', 'paid', 'offered')
                    AND provider_id IS NULL 
                    AND id NOT IN (SELECT service_id FROM notificacao_de_servicos WHERE status = 'PENDING')
                    AND EXISTS (
                        SELECT 1 FROM notificacao_de_servicos 
                        WHERE service_id = service_requests.id 
                            AND status = 'SILENCE' 
                            AND ciclo_atual < ?
                    )
                `).bind(maxCyclesRecycle).all();

            if (stalled.results?.length > 0) {
                LOG.despacho(`♻️ Encontrados ${stalled.results.length} serviços com prestadores aguardando reciclagem.`);
                for (const svc of (stalled.results as any[])) {
                    LOG.despacho(`♻️ Reciclando fila para o serviço ${svc.id} (reativando SILENCE -> PENDING)`);
                    await db.prepare(`
                            UPDATE notificacao_de_servicos 
                            SET status = 'PENDING', ciclo_atual = ciclo_atual + 1, last_notified_at = NULL
                            WHERE service_id = ? 
                            AND status = 'SILENCE'
                            AND ciclo_atual < ?
                        `).bind(svc.id, maxCyclesRecycle).run();
                }
            }

            // 2. Detectar serviços travados (notificados há >45s sem resposta e sem novo avanço na fila)
            const stuckServices = await db.prepare(`
            SELECT id, notification_attempts, last_notification_at
            FROM service_requests
            WHERE status IN ('pending', 'paid', 'offered')
            AND provider_id IS NULL
            AND notification_attempts > 0
            AND last_notification_at < datetime('now', '-45 seconds')
            AND notification_attempts < 15
        `).all();

            if (stuckServices.results?.length > 0) {
                LOG.warn(`Detectados ${stuckServices.results.length} serviços travados no alarme. Forçando avanço na fila...`);
                for (const svc of (stuckServices.results as any[])) {
                    await db.prepare(`
                UPDATE service_requests
                SET last_notification_at = datetime('now'),
                    notification_attempts = notification_attempts + 1
                WHERE id = ?
            `).bind(svc.id).run();
                }
            }

            const nextInterval = await this.runGlobalDispatchCycle(db, this.env);

            if (nextInterval > 0) {
                LOG.despacho(`⏳ Próximo ciclo agendado para daqui a ${nextInterval}s`);
                await this.state.storage.setAlarm(Date.now() + (nextInterval * 1000));
            } else {
                LOG.despacho(`😴 Silêncio total: Sem serviços pendentes ou zumbis. Despachante dormindo.`);
                // NÃO CHAMAMOS setAlarm aqui. Ele só vai acordar quando alguém chamar o /wake-up
            }
        } catch (error: any) {
            LOG.erro(`Erro crítico no ciclo de despacho:`, error);
            await this.state.storage.setAlarm(Date.now() + 60000); // Recuperar em 1 minuto
        }
    }

    private async runGlobalDispatchCycle(db: any, env: WorkerBindings): Promise<number> {
        LOG.despacho(`🦁=== INICIANDO CICLO DE DESPACHO ===`);

        // Carregar configurações
        let maxCycles = 15;
        let cycleInterval = 35;
        try {
            const configResult: any = await db.prepare(`
            SELECT key, value FROM app_config 
            WHERE key IN ('dispatch_max_cycles', 'dispatch_cycle_interval')
        `).all();

            if (configResult?.results) {
                for (const row of configResult.results) {
                    if (row.key === 'dispatch_max_cycles') maxCycles = parseInt(row.value);
                    if (row.key === 'dispatch_cycle_interval') cycleInterval = parseInt(row.value);
                }
            }
            LOG.despacho(`Configurações: máximo ${maxCycles} ciclos | intervalo ${cycleInterval}s`);
        } catch (e) {
            LOG.erro(`Erro ao carregar configurações de despacho:`, e);
        }

        // Buscar serviços com fila PENDING
        const { results: pendingServices } = await db.prepare(`
        SELECT DISTINCT ns.service_id, sr.status, sr.notification_attempts, sr.created_at, sr.client_id, sr.profession, sr.description, sr.address, sr.latitude, sr.longitude, sr.price_estimated, sr.price_upfront, sr.scheduled_at
        FROM notificacao_de_servicos ns
        JOIN service_requests sr ON ns.service_id = sr.id
        WHERE (ns.status = 'PENDING')
            AND sr.provider_id IS NULL
            AND sr.status IN ('pending', 'paid', 'offered')
        ORDER BY sr.created_at ASC
        LIMIT 20
        `).all();

        if (!pendingServices || pendingServices.length === 0) {
            // VERIFICAÇÃO DE ZUMBIS (Serviços ativos sem fila de notificação)
            // Busca serviços ativos para tentar re-popular ou aplicar backoff
            const activeServicesQuery = await db.prepare(`
                    SELECT id, status, profession, profession_id, price_estimated, latitude, longitude, notification_attempts, client_id, description, address, price_upfront, scheduled_at, created_at
                    FROM service_requests 
                    WHERE status IN ('pending', 'paid', 'offered') 
                    AND provider_id IS NULL
                `).all();

            const activeServices = activeServicesQuery?.results || [];

            if (activeServices.length > 0) {
                let servicesRescued = 0;

                let maxCycles = 20;
                let cycleInterval = 30;

                try {
                    const confCycles: any = await db.prepare("SELECT value FROM app_config WHERE key = 'dispatch_max_cycles'").first();
                    if (confCycles && confCycles.value) maxCycles = parseInt(confCycles.value);

                    const confInterval: any = await db.prepare("SELECT value FROM app_config WHERE key = 'dispatch_cycle_interval'").first();
                    if (confInterval && confInterval.value) cycleInterval = parseInt(confInterval.value);
                } catch (e) { }

                for (const service of activeServices as any[]) {
                    // Verifica se realmente está vazio de notificações (qualquer status)
                    const countRes = await db.prepare('SELECT COUNT(*) as c FROM notificacao_de_servicos WHERE service_id = ?').bind(service.id).first();

                    const currentAttempt = (service.notification_attempts || 0) + 1;

                    // TRANSITION TO SCHEDULE (Fix for Infinite Loop in Recycling)
                    if (currentAttempt >= maxCycles) {
                        LOG.warn(`🛑 Serviço ${service.id} atingiu o limite de ${maxCycles} ciclos durante reciclagem. Transicionando para AGENDAMENTO.`);

                        // 1. Atualizamos o status para 'open_for_schedule'
                        await db.prepare(`
                                UPDATE service_requests 
                                SET status = 'open_for_schedule' 
                                WHERE id = ?
                            `).bind(service.id).run();

                        // 2. Limpamos a fila de notificações ativas
                        await db.prepare(`
                                DELETE FROM notificacao_de_servicos WHERE service_id = ?
                            `).bind(service.id).run();

                        // 3. Sync Status to Firebase (CRITICAL: Frontend needs to know!)
                        await syncStatusToFirebase(
                            env,
                            service.id,
                            'open_for_schedule',
                            [service.client_id],
                            { status: 'open_for_schedule', notified_providers: [] }
                        );

                        // 3.5 Notify RELEVANT providers that the service is now OPEN FOR SCHEDULE
                        // This ensures that providers who rejected or missed it can see it again.
                        if (executionCtx) executionCtx.waitUntil((async () => {
                            try {
                                const providers = await findProvidersByDistance(
                                    env,
                                    service.profession,
                                    service.latitude,
                                    service.longitude,
                                    50 // 50km
                                );

                                LOG.info(`📢 Notifying ${providers.length} providers about Open Schedule for ${service.id}`);

                                for (const p of providers) {
                                    await sendNotificationToUser(
                                        env,
                                        p.userId,
                                        "Novo Serviço Disponível",
                                        "Um serviço próximo agora está disponível para agendamento.",
                                        {
                                            type: 'service.status',
                                            service_id: service.id,
                                            status: 'open_for_schedule'
                                        }
                                    );
                                }
                            } catch (err: any) {
                                LOG.erro(`Erro ao notificar prestadores sobre open_for_schedule:`, err);
                            }
                        })());

                        // 4. Sync to Firestore (Real-time mirror)
                        await syncToFirestore(env, service.id, {
                            status: 'open_for_schedule',
                            profession: service.profession || '',
                            client_id: service.client_id,
                            provider_id: null,
                            description: service.description || '',
                            address: service.address || '',
                            latitude: service.latitude,
                            longitude: service.longitude,
                            price_estimated: service.price_estimated,
                            price_upfront: service.price_upfront,
                            scheduled_at: service.scheduled_at || '',
                            created_at: service.created_at || ''
                        });

                        LOG.sucesso(`📅 Serviço ${service.id} agora está disponível para Agendamento Futuro.`);
                        continue;
                    }

                    if (countRes?.c === 0) {
                        LOG.warn(`🧟 Serviço Zumbi detectado: ${service.id}. Ciclo ${currentAttempt} de ${maxCycles}.`);

                        // Tenta popular a fila
                        try {
                            const { count: inserted } = await populateServiceQueue(db, service.id, service);
                            if (inserted > 0) {
                                servicesRescued++;
                                LOG.sucesso(`🚑 Serviço ${service.id} resgatado com ${inserted} prestadores.`);
                            } else {
                                LOG.warn(`⚠️ Serviço ${service.id} continua sem prestadores disponíveis. Incrementando tentativa.`);
                                // Incrementa tentativa para eventualmente expirar
                                await db.prepare("UPDATE service_requests SET notification_attempts = notification_attempts + 1, last_notification_at = datetime('now') WHERE id = ?").bind(service.id).run();
                            }
                        } catch (e: any) {
                            LOG.erro(`Erro ao tentar resgatar serviço ${service.id}:`, e);
                        }
                    } else {
                        // Serviço tem notificações mas nenhuma pendente (stalled/exhausted)
                        LOG.despacho(`⏳ Serviço ${service.id} aguardando reciclagem. Ciclo ${currentAttempt} de ${maxCycles}.`);
                        // Incrementa tentativa para eventualmente expirar
                        await db.prepare("UPDATE service_requests SET notification_attempts = notification_attempts + 1, last_notification_at = datetime('now') WHERE id = ?").bind(service.id).run();
                    }
                }


                if (servicesRescued > 0) {
                    LOG.sucesso(`🚑 Resgatados ${servicesRescued} serviços zumbis. Reiniciando ciclo imediatamente.`);
                    return 1; // Retorna 1s para processar imediatamente
                }

                LOG.despacho(`✅ Nenhum serviço aguardando despacho (existentes: ${activeServices.length}, mas sem prestadores disponíveis). Entrando em backoff.`);

                // BACKOFF: Se só tem zumbis sem prestadores, não adianta acordar a cada 7s.
                // Aumentar para 30s para economizar recursos e reduzir logs
                return 30;
            } else {
                LOG.despacho(`😴 Sem serviços pendentes ou ativos. Parando alarme.`);
                return 0;
            }
        }

        LOG.despacho(`⚙️ Processando ${pendingServices.length} serviço(s) na fila`);

        for (const serviceRow of pendingServices as any[]) {
            const serviceId = serviceRow.service_id;
            const currentAttempt = (serviceRow.notification_attempts || 0) + 1;

            // Removido limite global de tentativas do serviço. 
            // O limite agora é individual por prestador (verificado na reciclagem).

            // TRANSITION TO SCHEDULE (Maestro Scheduling Flow)
            // Fetch max cycles from config or default to 20
            let maxCycles = 20;
            // Fetch interval too (default 30s)
            let cycleInterval = 30;

            try {
                // Determine max cycles based on service priority/type if needed, or global config
                const confCycles: any = await db.prepare("SELECT value FROM app_config WHERE key = 'dispatch_max_cycles'").first();
                if (confCycles && confCycles.value) maxCycles = parseInt(confCycles.value);

                const confInterval: any = await db.prepare("SELECT value FROM app_config WHERE key = 'dispatch_cycle_interval'").first();
                if (confInterval && confInterval.value) cycleInterval = parseInt(confInterval.value);
            } catch (e) { }

            // Add the log that the user expects to see (matching their screenshot)
            LOG.despacho(`Configurações: máximo ${maxCycles} ciclos | intervalo ${cycleInterval}s`);

            if (currentAttempt >= maxCycles) {
                LOG.warn(`🛑 Serviço ${serviceId} atingiu o limite de ${maxCycles} ciclos. Transicionando para AGENDAMENTO.`);

                // 1. Atualizamos o status para 'open_for_schedule'
                // This makes it visible in GET /api/services/available (which filters for 'open_for_schedule')
                await db.prepare(`
                        UPDATE service_requests 
                        SET status = 'open_for_schedule' 
                        WHERE id = ?
                    `).bind(serviceId).run();

                // 2. Limpamos a fila de notificações
                await db.prepare(`
                        DELETE FROM notificacao_de_servicos WHERE service_id = ?
                    `).bind(serviceId).run();

                // 3. Sync Status to Firebase (CRITICAL FIX)
                // Notify CLIENT about status change
                await syncStatusToFirebase(
                    env,
                    serviceId,
                    'open_for_schedule',
                    [serviceRow.client_id],
                    { status: 'open_for_schedule', notified_providers: [] }
                );

                // 4. Sync to Firestore (Real-time mirror)
                await syncToFirestore(env, serviceId, {
                    status: 'open_for_schedule',
                    profession: serviceRow.profession || '',
                    client_id: serviceRow.client_id,
                    provider_id: null,
                    description: serviceRow.description || '',
                    address: serviceRow.address || '',
                    latitude: serviceRow.latitude,
                    longitude: serviceRow.longitude,
                    price_estimated: serviceRow.price_estimated,
                    price_upfront: serviceRow.price_upfront,
                    scheduled_at: serviceRow.scheduled_at || '',
                    created_at: serviceRow.created_at || ''
                });

                // 4. Notify ALL PROVIDERS with matching profession about new available service
                try {
                    const profession = serviceRow.profession;
                    if (profession) {
                        const providers: any = await db.prepare(`
                                SELECT DISTINCT pp.provider_user_id 
                                FROM provider_professions pp
                                JOIN professions p ON pp.profession_id = p.id
                                WHERE p.name = ?
                            `).bind(profession).all();

                        const providerIds = (providers.results || []).map((p: any) => p.provider_user_id);
                        if (providerIds.length > 0) {
                            LOG.despacho(`📢 Notificando ${providerIds.length} prestador(es) sobre serviço disponível para agendamento`);
                            await syncStatusToFirebase(
                                env,
                                serviceId,
                                'open_for_schedule',
                                providerIds,
                                { status: 'open_for_schedule', available: true }
                            );
                        }
                    }
                } catch (e) {
                    LOG.warn(`Erro ao notificar prestadores sobre serviço disponível: ${e}`);
                }

                LOG.sucesso(`📅 Serviço ${serviceId} agora está disponível para Agendamento Futuro (Status: open_for_schedule).`);

                // Notify Client of status change (Optional but good UX)
                // ...

                continue;
            }

            LOG.despacho(`🔧=== PROCESSANDO SERVIÇO ${serviceId} (Tentativa Global ${currentAttempt}) ===`);

            // Buscar TODOS os candidatos pendentes (Limitado a 5 para evitar flood num único ciclo)
            const pendingCandidates: any = await db.prepare(`
                    SELECT ns.*, sr.description as service_description
                    FROM notificacao_de_servicos ns
                    JOIN service_requests sr ON ns.service_id = sr.id
                    WHERE ns.service_id = ? AND ns.status = 'PENDING'
                    ORDER BY ns.queue_order ASC
                    LIMIT 5
                `).bind(serviceId).all();

            if (!pendingCandidates.results || pendingCandidates.results.length === 0) {
                LOG.warn(`Nenhum candidato pendente encontrado para o serviço ${serviceId}. Pulando...`);
                continue;
            }

            for (const nextCandidate of pendingCandidates.results as any[]) {
                LOG.despacho(`📍 Verificando candidato: Prestador #${nextCandidate.provider_user_id} (posição ${nextCandidate.queue_order})`);

                // Verificar timeout de notificação anterior
                if (nextCandidate.last_notified_at) {
                    const lastNotified = new Date(nextCandidate.last_notified_at);
                    const now = new Date();
                    const secondsSinceLast = (now.getTime() - lastNotified.getTime()) / 1000;

                    if (secondsSinceLast < cycleInterval) {
                        LOG.despacho(`⏸️ Prestador #${nextCandidate.provider_user_id} notificado há apenas ${secondsSinceLast.toFixed(0)}s. Aguardando intervalo de safety (${cycleInterval}s)...`);
                        break; // INTERROMPE O LOOP: Se o primeiro da fila ainda está no prazo, não notifica o próximo!
                    } else {
                        LOG.despacho(`⏱️ Timeout atingido para Prestador #${nextCandidate.provider_user_id} (última: ${secondsSinceLast.toFixed(0)}s atrás). Marcando como SILENCE.`);
                        await updateNotificationStatus(db, serviceId, nextCandidate.provider_user_id, 'SILENCE');
                        continue;
                    }
                }

                // ENVIAR NOTIFICAÇÃO FCM
                try {
                    const distanceKm = nextCandidate.distance.toFixed(1);
                    const priceFormatted = new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                    }).format(nextCandidate.price_provider);

                    LOG.notificacao(`📤 Enviando notificação para Prestador #${nextCandidate.provider_user_id}`);
                    LOG.notificacao(`   Serviço: ${nextCandidate.service_name}`);
                    LOG.notificacao(`   Distância: ${distanceKm}km | Valor líquido: ${priceFormatted}`);
                    LOG.notificacao(`   Ciclo Atual do Prestador: ${nextCandidate.ciclo_atual} de ${maxCycles} | Notify Count: ${nextCandidate.notification_count}`);

                    const fcmResult = await sendFCMNotificationV1(
                        env.FIREBASE_SERVICE_ACCOUNT!,
                        nextCandidate.fcm_token, {
                        title: 'Novo Serviço Disponível! 🚀',
                        body: `Serviço de ${nextCandidate.service_name} (Receba: ${priceFormatted}) a ${distanceKm}km.`,
                        data: {
                            type: 'new_service',
                            id: serviceId,
                            profession: nextCandidate.service_name,
                            profession_id: nextCandidate.profession_id?.toString() || '',
                            latitude: nextCandidate.service_latitude.toString(),
                            longitude: nextCandidate.service_longitude.toString(),
                            price: nextCandidate.price_provider.toString(),
                            distance: nextCandidate.distance.toString(),
                            queue_position: nextCandidate.queue_order.toString(),
                            attempt: (nextCandidate.ciclo_atual || 1).toString(),
                            description: nextCandidate.service_description || ''
                        }
                    });

                    if (fcmResult && fcmResult.success) {
                        LOG.sucesso(`✅ Notificação entregue ao Prestador #${nextCandidate.provider_user_id}`);

                        // Atualizar fila e serviço
                        await updateNotificationStatus(
                            db, serviceId, nextCandidate.provider_user_id, 'PENDING', true
                        );

                        await db.prepare(`
                UPDATE service_requests
                SET notification_attempts = notification_attempts + 1,
                    last_notification_at = datetime('now'),
                    status = 'offered'
                WHERE id = ?
            `).bind(serviceId).run();

                        LOG.despacho(`📊 Serviço ${serviceId} atualizado: tentativa #${serviceRow.notification_attempts + 1}`);
                        break; // INTERROMPE O LOOP: Notificou um, espera o próximo ciclo!
                    } else {
                        LOG.warn(`⚠️ Notificação NÃO entregue ao Prestador #${nextCandidate.provider_user_id}. Token pode estar inválido.`);
                        await updateNotificationStatus(db, serviceId, nextCandidate.provider_user_id, 'REJECTED');
                    }
                } catch (error: any) {
                    LOG.erro(`Falha ao enviar notificação para Prestador #${nextCandidate.provider_user_id}:`, error.message);

                    if (error.message?.includes('invalid registration token') ||
                        error.message?.includes('not registered') ||
                        error.message?.includes('argument "token" is invalid')) {

                        await updateNotificationStatus(db, serviceId, nextCandidate.provider_user_id, 'REJECTED');

                        // !!! IMPROVED CLEANUP !!!
                        // Invalidate token in registry to prevent future selection
                        await db.prepare(`
                                UPDATE notification_registry 
                                SET fcm_token = NULL, updated_at = datetime('now') 
                                WHERE user_id = ?
                            `).bind(nextCandidate.provider_user_id).run();

                        LOG.warn(`🗑️ Token inválido/expirado DELETADO do registro para Prestador #${nextCandidate.provider_user_id}.`);
                    }
                }
            }
        }

        LOG.sucesso(`✅ CICLO DE DESPACHO FINALIZADO`);
        return cycleInterval;
    } catch(error: any) {
        LOG.erro(`Erro crítico no runGlobalDispatchCycle:`, error);
        return 30; // Devuelve un intervalo de seguridad en caso de error
    }
}



// ############################################################################
// #                                                                          #
// #                       AUDIT & LOGGING ROUTES                             #
// #                                                                          #
// ############################################################################

/**
 * API: Dispatch Audit Log
 
* Allows mobile app to log events (DELIVERED, ACCEPTED, REJECTED)
*/
app.post('/api/service/log-event', async (c) => {
    try {
        const body = await c.req.json();
        const { serviceId, providerId, action, details } = body;

        if (!serviceId || !providerId || !action) {
            return c.json({ success: false, message: "Missing fields" }, 400);
        }

        const db = c.env.DB;

        // 1. Maestro v2: Atualizar status na fila se for ação de resposta do usuário
        if (action === 'ACCEPTED' || action === 'REJECTED') {
            await db.prepare(`
                    UPDATE notificacao_de_servicos
                    SET status = ?, last_notified_at = datetime('now')
                    WHERE service_id = ? AND provider_user_id = ?
                `).bind(action, serviceId, providerId).run();
        }

        // 2. Registrar no histórico de auditoria
        await db.prepare(`
                INSERT INTO service_dispatch_history (service_id, provider_id, action, details)
                VALUES (?, ?, ?, ?)
            `).bind(serviceId, providerId, action, details || null).run();

        // 3. Liberar trava (Legacy support)
        if (action === 'ACCEPTED' || action === 'REJECTED') {
            await db.prepare(`
                    DELETE FROM dispatch_locks WHERE current_analyst_id = ?
                `).bind(providerId).run();
            console.log(`[Logística] 🔓 Trava liberada para o Prestador ${providerId} devido a ${action}`);
        }

        return c.json({ success: true });
    } catch (e: any) {
        console.error('[Auditoria] ❌ Erro ao registrar evento:', e.message);
        return c.json({ success: false, error: e.message }, 500);
    }
});

/**
 * POST /test/simulate-load
 * Stress Test Endpoint
 * Generates dummy providers and services to test dispatch logic
 */
app.post('/test/simulate-load', async (c) => {
    try {
        const db = c.env.DB;
        const body = await c.req.json();
        const { centerLat, centerLon, providerCount, serviceCount } = body;

        if (!centerLat || !centerLon) return c.json({ error: "Missing centerLat/centerLon" }, 400);

        const pCount = providerCount || 10;
        const sCount = serviceCount || 5;

        // 1. Create Dummy Providers in Registry
        let pCreated = 0;
        for (let i = 0; i < pCount; i++) {
            // Random offset +/- 0.05 degrees (~5km)
            const lat = centerLat + (Math.random() - 0.5) * 0.1;
            const lon = centerLon + (Math.random() - 0.5) * 0.1;

            await db.prepare(`
                    INSERT OR REPLACE INTO notification_registry (user_id, fcm_token, professions_ids, latitude, longitude, radius_km, last_seen_at)
                    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                `).bind(
                900000 + i, // Dummy IDs starting at 900k
                `dummy_token_${i}`,
                '[1, 2, 3]', // All professions
                lat,
                lon,
                50
            ).run();
            pCreated++;
        }

        // 2. Create Dummy Services
        let sCreated = 0;
        const serviceIds = [];
        for (let i = 0; i < sCount; i++) {
            const lat = centerLat + (Math.random() - 0.5) * 0.02; // Closer
            const lon = centerLon + (Math.random() - 0.5) * 0.02;

            const res = await db.prepare(`
                    INSERT INTO service_requests (client_id, category_id, profession_id, description, status, price_estimated, latitude, longitude, created_at, notification_attempts)
                    VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, datetime('now'), 0)
                    RETURNING id
                `).bind(
                1, // Admin or some user
                1,
                1, // Profession 1
                `Stress Test Service ${i}`,
                100.00,
                lat,
                lon
            ).first();

            if (res) {
                sCreated++;
                serviceIds.push(res.id);

                // Trigger Population
                const svcData = {
                    id: res.id,
                    latitude: lat,
                    longitude: lon,
                    profession_id: 1,
                    price_estimated: 100.00,
                    profession: 'Test'
                };
                await populateServiceQueue(db, res.id.toString(), svcData);
            }
        }

        // Wake up dispatcher
        const id = c.env.DISPATCH_MANAGER.idFromName('GLOBAL_DISPATCHER');
        const stub = c.env.DISPATCH_MANAGER.get(id);
        await stub.fetch(new Request('http://dispatch/wake-up'));

        return c.json({
            success: true,
            providers_created: pCreated,
            services_created: sCreated,
            service_ids: serviceIds
        });

    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

// ############################################################################
// #                                                                          #
// #                       AUTH & USER ROUTES                                 #
// #                                                                          #
// ############################################################################

/**
 * API: Auth Login / Upsert
 * Handles Firebase Token exchange for Backend Session/User
 */
app.post('/api/auth/login', d1RateLimiter({ route: 'auth_login', maxRequests: 10, windowMinutes: 15 }), async (c) => {
    let body;
    try {
        body = await c.req.json();
    } catch (e) {
        return c.json({ success: false, message: "Invalid JSON" }, 400);
    }

    const { token, role, phone, name, email: bodyEmail } = body;

    if (!token) {
        return c.json({ success: false, message: "Token required" }, 400);
    }

    // 1. Decode Token
    const decoded = decodeJwt(token);
    if (!decoded || !decoded.sub) {
        return c.json({ success: false, message: "Invalid Token Format" }, 400);
    }

    const firebaseUid = decoded.sub;
    const email = decoded.email || bodyEmail;

    if (!email) {
        return c.json({ success: false, message: "Email not found in token or body" }, 400);
    }

    try {
        const db = c.env.DB;

        // 2. Check if user exists
        const existing: any = await db.prepare('SELECT * FROM users WHERE firebase_uid = ?').bind(firebaseUid).first();

        let user = existing;

        if (!existing) {
            // 3. Create User
            // Handle optional avatar from token picture
            const avatarUrl = decoded.picture || null;

            const result = await db.prepare(`
                    INSERT INTO users (firebase_uid, email, full_name, role, phone, avatar_url, password_hash, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'firebase_oauth', datetime('now'))
                    RETURNING *
                `).bind(
                firebaseUid,
                email,
                name || email.split('@')[0], // Fallback name
                role || 'client',
                phone || null,
                avatarUrl
            ).first();

            user = result;
        } else {
            // Optional: Update fields if provided (e.g. phone, name)
            // For now, simple return
        }

        return c.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                full_name: user.full_name,
                is_medical: false, // Default for now
                is_fixed_location: false
            },
            token: token // Echo back or issue session token if needed (client uses firebase token)
        });

    } catch (error: any) {
        console.error('❌ Erro no Login:', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Auth Register
 * Handles new user registration (including Providers)
 */
app.post('/api/auth/register', async (c) => {
    let body;
    try {
        body = await c.req.json();
    } catch (e) {
        return c.json({ success: false, message: "Invalid JSON" }, 400);
    }

    const {
        token,
        name,
        email,
        role = 'client',
        phone,
        document_type,
        document_value,
        commercial_name,
        address,
        latitude,
        longitude,
        professions
    } = body;

    if (!token) {
        return c.json({ success: false, message: "Token required" }, 400);
    }

    // 1. Decode Token
    const decoded = decodeJwt(token);
    if (!decoded || !decoded.sub) {
        return c.json({ success: false, message: "Invalid Token Format" }, 400);
    }

    const firebaseUid = decoded.sub;
    const userEmail = email || decoded.email;

    if (!userEmail) {
        return c.json({ success: false, message: "Email is required" }, 400);
    }

    try {
        const db = c.env.DB;

        // 2. Check if user exists
        const existing: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(userEmail).first();
        if (existing) {
            return c.json({ success: false, message: "User already exists" }, 409);
        }

        // 3. Create User
        // Handle optional avatar from token picture
        const avatarUrl = decoded.picture || null;
        const fullName = name || decoded.name || userEmail.split('@')[0];

        const userResult = await db.prepare(`
                INSERT INTO users (firebase_uid, email, full_name, role, phone, avatar_url, password_hash, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'firebase_oauth', datetime('now'))
                RETURNING id, email, role, full_name
            `).bind(
            firebaseUid,
            userEmail,
            fullName,
            role,
            phone || null,
            avatarUrl
        ).first();

        if (!userResult) {
            throw new Error("Failed to create user");
        }

        const userId = userResult.id;

        // 4. If Provider, create provider record
        if (role === 'provider') {
            await db.prepare(`
                    INSERT INTO providers (user_id, commercial_name, address, latitude, longitude, document_type, document_value)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).bind(
                userId,
                commercial_name || null,
                address || null,
                latitude || null,
                longitude || null,
                document_type || null,
                document_value || null
            ).run();

            // 5. Handle Professions
            if (professions && Array.isArray(professions) && professions.length > 0) {
                // Determine Profession IDs
                for (const prof of professions) {
                    let profId = null;
                    if (typeof prof === 'object' && prof.id) {
                        profId = prof.id;
                    } else if (typeof prof === 'string') {
                        // Lookup by name
                        const p: any = await db.prepare('SELECT id FROM professions WHERE name = ?').bind(prof).first();
                        if (p) profId = p.id;
                    }

                    if (profId) {
                        await db.prepare(`
                                INSERT INTO provider_professions (provider_user_id, profession_id)
                                VALUES (?, ?)
                            `).bind(userId, profId).run();
                    }
                }
            }
        }

        return c.json({
            success: true,
            user: {
                id: userId,
                email: userResult.email,
                role: userResult.role,
                name: userResult.full_name,
                full_name: userResult.full_name,
                is_medical: false,
                is_fixed_location: false
            }
        }, 201);

    } catch (error: any) {
        console.error('❌ Erro no Registro:', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

// ############################################################################
// #                                                                          #
// #                       SERVICE LISTING ROUTES                             #
// #                                                                          #
// ############################################################################

/**
 * API: My Services History
 * Returns list of services for the user (client or provider)
 */
app.get('/api/services/my', async (c) => {
    try {
        const db = c.env.DB;
        const authHeader = c.req.header('Authorization');

        let userId = null;
        let userRole = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded && decoded.email) {
                const u: any = await db.prepare('SELECT id, role FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) {
                    userId = u.id;
                    userRole = u.role;
                    LOG.auth(`🔑 Usuário #${userId} (${userRole}) autenticado para buscar serviços.`);
                }
            }
        }

        if (!userId) {
            return c.json({ success: true, services: [] });
        }

        let query = '';
        // For providers: show services they accepted (provider_id = userId)
        // For clients: show services they requested (client_id = userId)
        if (userRole === 'provider') {
            query = `
                    SELECT sr.*, tc.name as title,
                        u.full_name as client_name, u.avatar_url as client_avatar,
                        rev.rating as service_rating,
                        (SELECT COUNT(*) FROM chat_messages cm WHERE cm.service_id = sr.id AND cm.sender_id != ? AND cm.read_at IS NULL) as unread_count
                    FROM service_requests sr
                    LEFT JOIN task_catalog tc ON sr.task_id = tc.id
                    LEFT JOIN users u ON sr.client_id = u.id
                    LEFT JOIN service_reviews rev ON sr.id = rev.request_id
                    WHERE sr.provider_id = ? 
                    ORDER BY sr.created_at DESC
                `;
        } else {
            query = `
                    SELECT sr.*, tc.name as title,
                        u.full_name as provider_name, u.avatar_url as provider_avatar,
                        p.rating_avg as provider_rating, p.rating_count as provider_reviews,
                        p.latitude as provider_lat, p.longitude as provider_lon,
                        (SELECT COUNT(*) FROM chat_messages cm WHERE cm.service_id = sr.id AND cm.sender_id != ? AND cm.read_at IS NULL) as unread_count
                    FROM service_requests sr
                    LEFT JOIN task_catalog tc ON sr.task_id = tc.id
                    LEFT JOIN users u ON sr.provider_id = u.id
                    LEFT JOIN providers p ON sr.provider_id = p.user_id
                    WHERE sr.client_id = ? 
                    ORDER BY sr.created_at DESC
                `;
        }

        // Bind userId twice: once for the subquery (sender_id != userId), once for the main WHERE clause
        const result: any = await db.prepare(query).bind(userId, userId).all();
        let services = result.results || [];

        console.log(`[Serviços] 🔧 Encontrados ${services.length} serviços para o Usuário #${userId}`);

        // Apply commission for providers (Show NET amount)
        if (userRole === 'provider') {
            try {
                const comm: any = await db.prepare("SELECT value FROM app_config WHERE key = 'platform_commission_rate'").first();
                const rate = comm ? parseFloat(comm.value) : 15;
                const factor = (100 - rate) / 100;

                services = services.map((s: any) => ({
                    ...s,
                    price_estimated: s.price_estimated ? s.price_estimated * factor : null,
                    price_upfront: s.price_upfront ? s.price_upfront * factor : null,
                    original_price: s.price_upfront || s.price_estimated, // Keep original if needed for history
                    commission_rate: rate
                }));
            } catch (e) {
                console.error("[Serviços] ❌ Erro ao calcular comissão:", e);
            }
        }

        console.log(`[Serviços] 📄 Usuário ${userId} (${userRole}) possui ${services.length} serviços`);

        // Structure data for frontend
        services = services.map((s: any) => {
            const structured: any = { ...s };

            // For providers: add client object
            if (userRole === 'provider' && s.client_name) {
                structured.client = {
                    name: s.client_name,
                    avatar: s.client_avatar,
                    photo: s.client_avatar
                };
            }

            // For clients: add provider object
            if (userRole === 'client' && s.provider_name) {
                structured.provider = {
                    name: s.provider_name,
                    avatar: s.provider_avatar,
                    photo: s.provider_avatar,
                    rating_avg: s.provider_rating,
                    rating_count: s.provider_reviews
                };
            }

            return structured;
        });

        return c.json({
            success: true,
            services: services
        });
    } catch (error: any) {
        console.error('[Serviços] ❌ Erro ao buscar histórico:', error.message);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Available Services
 * Returns services available for the provider based on profession and proximity
 */
app.get('/api/services/available', async (c) => {
    try {
        const db = c.env.DB;
        const authHeader = c.req.header('Authorization');

        let userId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded && decoded.email) {
                const u: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) userId = u.id;
            }
        }

        if (!userId) {
            return c.json({ success: true, services: [] });
        }

        // Get provider's professions
        const professionsResult: any = await db.prepare(`
                SELECT p.name 
                FROM provider_professions pp
                JOIN professions p ON pp.profession_id = p.id
                WHERE pp.provider_user_id = ?
            `).bind(userId).all();

        const professionNames = (professionsResult.results || []).map((p: any) => p.name);

        console.log(`[Serviços] 🔍 Buscando serviços disponíveis para as profissões do Prestador ${userId}`);

        if (professionNames.length === 0) {
            return c.json({ success: true, services: [] });
        }

        // Get provider's location
        const location: any = await db.prepare(`
                SELECT latitude, longitude 
                FROM provider_locations 
                WHERE provider_id = ? 
                LIMIT 1
            `).bind(userId).first();

        // Find available services matching provider's professions
        // Status: pending (no provider assigned yet) or offered (offered to this or other providers)
        const placeholders = professionNames.map(() => '?').join(',');
        const query = `
                SELECT sr.*, tc.name as title
                FROM service_requests sr
                LEFT JOIN task_catalog tc ON sr.task_id = tc.id
                WHERE sr.status = 'open_for_schedule'
                AND sr.provider_id IS NULL
                AND sr.profession IN (${placeholders})
                ORDER BY sr.created_at DESC
            `;

        const result: any = await db.prepare(query).bind(...professionNames).all();
        let services = result.results || [];

        console.log(`[Serviços] 📍 Encontrados ${services.length} serviços antes do filtro de proximidade`);

        // Fetch commission rate
        let platformCommissionRate = 15;
        try {
            const comm: any = await db.prepare("SELECT value FROM app_config WHERE key = 'platform_commission_rate'").first();
            if (comm) platformCommissionRate = parseFloat(comm.value);
        } catch (e) { }

        const commissionFactor = (100 - platformCommissionRate) / 100;

        // Filter by proximity if location available (50km radius)
        if (location && location.latitude && location.longitude) {
            services = services.filter((s: any) => {
                if (!s.latitude || !s.longitude) return true; // Include if no location
                const distance = calculateDistance(
                    location.latitude, location.longitude,
                    s.latitude, s.longitude
                );
                console.log(`[Serviços] 📏 Serviço ${s.id} está a ${distance.toFixed(2)}km`);

                // Attach distance and net price
                s.distance_km = distance;
                return distance <= 50; // 50km radius
            });
        }

        // Apply commission (Show NET amount to provider)
        services = services.map((s: any) => ({
            ...s,
            price_estimated: s.price_estimated ? s.price_estimated * commissionFactor : null,
            price_upfront: s.price_upfront ? s.price_upfront * commissionFactor : null,
            platform_commission: platformCommissionRate
        }));

        LOG.servico(`📍 Retornando ${services.length} serviços após filtro de proximidade (Prestador #${userId})`);

        return c.json({ success: true, services });
    } catch (error: any) {
        console.error('[Serviços] ❌ Erro ao buscar serviços disponíveis:', error.message);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Available Services for Scheduling (Maestro v2)
 * Lists services that have transitioned to OPEN_FOR_SCHEDULE status.
 */
app.get('/api/services/available-for-schedule', async (c) => {
    try {
        const db = c.env.DB;
        const authHeader = c.req.header('Authorization');

        let userId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded && decoded.email) {
                const u: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) userId = u.id;
            }
        }

        if (!userId) {
            return c.json({ success: true, services: [] });
        }

        // Get provider's professions
        const professionsResult: any = await db.prepare(`
                SELECT p.name 
                FROM provider_professions pp
                JOIN professions p ON pp.profession_id = p.id
                WHERE pp.provider_user_id = ?
            `).bind(userId).all();

        const professionNames = (professionsResult.results || []).map((p: any) => p.name);

        if (professionNames.length === 0) {
            return c.json({ success: true, services: [] });
        }

        // Find services in OPEN_FOR_SCHEDULE status matching provider's professions
        const placeholders = professionNames.map(() => '?').join(',');
        const query = `
                SELECT sr.*, tc.name as title
                FROM service_requests sr
                LEFT JOIN task_catalog tc ON sr.task_id = tc.id
                WHERE sr.status = 'open_for_schedule'
                AND sr.provider_id IS NULL
                AND sr.profession IN (${placeholders})
                ORDER BY sr.created_at DESC
            `;

        const result: any = await db.prepare(query).bind(...professionNames).all();
        let services = result.results || [];

        // Apply commission (Show NET amount to provider)
        let platformCommissionRate = 15;
        try {
            const comm: any = await db.prepare("SELECT value FROM app_config WHERE key = 'platform_commission_rate'").first();
            if (comm) platformCommissionRate = parseFloat(comm.value);
        } catch (e) { }

        const commissionFactor = (100 - platformCommissionRate) / 100;

        services = services.map((s: any) => ({
            ...s,
            price_estimated: s.price_estimated ? s.price_estimated * commissionFactor : null,
            price_upfront: s.price_upfront ? s.price_upfront * commissionFactor : null,
            platform_commission: platformCommissionRate
        }));

        LOG.servico(`📅 Encontrados ${services.length} serviços disponíveis para agendamento (Prestador #${userId})`);

        return c.json({ success: true, services });
    } catch (error: any) {
        console.error('[Agendamento] ❌ Erro ao buscar serviços para agendamento:', error.message);
        return c.json({ success: false, error: error.message }, 500);
    }
});

// [REMOVIDO] Endpoint antigo de propose-schedule (substituído pelo endpoint completo abaixo na linha ~4288)
// que distingue corretamente cliente vs prestador e evita violação de FOREIGN KEY.


/**
 * API: Create Service Request
 * Allows mobile app to create new services.
 * Note: Temporarily uses default client_id=1 until Auth Middleware is fully ported.
 */
app.post('/api/services', d1RateLimiter({ route: 'services_create', maxRequests: 5, windowMinutes: 2 }), async (c) => {
    let body;
    try {
        body = await c.req.json();
    } catch (e) {
        return c.json({ success: false, message: "Invalid JSON" }, 400);
    }

    const {
        category_id,
        description,
        latitude,
        longitude,
        address,
        price_estimated,
        price_upfront,
        location_type,
        profession,
        provider_id,
        scheduled_at,
        task_id,
        profession_id
    } = body;

    // UUID generation shim for Worker environment if crypto.randomUUID is not available (it usually is)
    const serviceId = crypto.randomUUID();

    // IMPORTANT: Get the authenticated user ID from the JWT token
    let clientId = 1; // Fallback for testing only

    try {
        const db = c.env.DB;
        const authHeader = c.req.header('Authorization');
        const bypassEmail = c.req.header('X-Test-Bypass-Email');

        if (bypassEmail) {
            console.log(`[Solicitação] 👤 Usando email de bypass: ${bypassEmail}`);
            const user: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(bypassEmail).first();
            if (user) clientId = user.id;
        } else if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);

            if (decoded && decoded.email) {
                const user: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();

                if (user) {
                    clientId = user.id;
                    console.log(`[Solicitação] 👤 Usando ID de usuário autenticado: ${clientId}`);
                } else {
                    // User not found in D1, create them automatically
                    console.log(`[Solicitação] ✨ Usuário não encontrado, criando: ${decoded.email}`);
                    const firebaseUid = decoded.sub || `firebase_${Date.now()}`;
                    const fullName = decoded.name || decoded.email.split('@')[0];
                    const avatarUrl = decoded.picture || null;

                    const newUser = await db.prepare(`
                            INSERT INTO users (firebase_uid, email, full_name, role, avatar_url, password_hash, created_at)
                            VALUES (?, ?, ?, 'client', ?, 'firebase_oauth', datetime('now'))
                            RETURNING id
                        `).bind(firebaseUid, decoded.email, fullName, avatarUrl).first();

                    if (newUser) {
                        clientId = (newUser as any).id;
                        console.log(`[Solicitação] ✨ Novo usuário criado com ID: ${clientId}`);
                    }
                }
            }
        }
    } catch (authError: any) {
        console.error('[Solicitação] ❌ Erro de autenticação:', authError.message);
        // Continue with fallback clientId = 1
    }

    // Validate task_id if provided
    let validTaskId = null;
    if (task_id) {
        try {
            const t = await c.env.DB.prepare('SELECT id FROM task_catalog WHERE id = ?').bind(task_id).first();
            if (t) {
                validTaskId = t.id;
            } else {
                console.warn(`[Solicitação] ⚠️ ID da Tarefa ${task_id} não encontrado.`);
            }
        } catch (e) {
            console.error('[Solicitação] ❌ Erro ao validar task_id:', e);
        }
    }

    try {
        const db = c.env.DB;

        // Calculate Provider Amount (Maestro v2 Financial Traceability)
        let platformCommissionRate = 15;
        try {
            const comm: any = await db.prepare("SELECT value FROM app_config WHERE key = 'platform_commission_rate'").first();
            if (comm) platformCommissionRate = parseFloat(comm.value);
        } catch (e) { }

        const commissionFactor = (100 - platformCommissionRate) / 100;
        const providerAmount = (price_estimated || 0) * commissionFactor;

        await db.prepare(`
                INSERT INTO service_requests (
                    id, client_id, category_id, description, latitude, longitude, address,
                    price_estimated, price_upfront, provider_amount, location_type, profession, profession_id, provider_id,
                    scheduled_at, task_id, status, completion_code, created_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, 'waiting_payment', ?, datetime('now')
                )
            `).bind(
            serviceId,
            clientId,
            category_id,
            description || null,
            latitude || null,
            longitude || null,
            address || null,
            price_estimated || 0,
            price_upfront || 0,
            providerAmount || 0,
            location_type || 'client',
            profession || null,
            profession_id || null,
            provider_id || null,
            scheduled_at || null,
            validTaskId || null,
            Math.floor(100000 + Math.random() * 900000).toString()
        ).run();

        // FIX: Automatically create appointment if scheduled and has provider
        if (scheduled_at && provider_id) {
            // Validate availability first!
            const validationError = await validateAppointment(db, provider_id, scheduled_at);
            if (validationError) {
                // Rollback (Delete the just inserted service)
                await db.prepare('DELETE FROM service_requests WHERE id = ?').bind(serviceId).run();
                return c.json({ success: false, message: validationError }, 409);
            }

            const startDate = new Date(scheduled_at);
            const dayOfWeek = startDate.getDay();

            // Get provider slot duration
            const config: any = await db.prepare(
                'SELECT slot_duration FROM provider_schedule_configs WHERE provider_id = ? AND day_of_week = ?'
            ).bind(provider_id, dayOfWeek).first();

            const duration = config?.slot_duration || 30;
            const endDate = new Date(startDate.getTime() + duration * 60000);
            const endTime = endDate.toISOString().replace('Z', '').split('.')[0]; // SQLite format

            await db.prepare(`
                    INSERT INTO appointments (
                        provider_id, client_id, service_request_id, 
                        start_time, end_time, status, 
                        created_at, updated_at
                    ) VALUES (
                        ?, ?, ?, 
                        ?, ?, 'scheduled', 
                        datetime('now'), datetime('now')
                    )
                `).bind(
                provider_id,
                clientId,
                serviceId,
                scheduled_at,
                endTime
            ).run();

            console.log(`[Solicitação] 📅 Agendamento criado automaticamente para ${scheduled_at}`);
        }

        // If task_id is present, link it (skipping for now to keep it simple, or add if critical)

        // START DISPATCH ONLY AFTER PAYMENT (Removed immediate call)
        LOG.servico(`🆕 Pedido de serviço criado: ${serviceId}`);
        LOG.debug(`   👤 Cliente: #${clientId}, Categoria: ${category_id}, Profissão: ${profession}`);
        if (scheduled_at) LOG.debug(`   📅 Agendamento para: ${scheduled_at}`);
        LOG.debug(`   📍 Coordenadas: ${latitude}, ${longitude}`);

        // Mirror initial state to Firestore (for real-time tracking)
        // Using 'profession' from request body
        // Ensure we pass only defined values
        c.executionCtx.waitUntil(syncToFirestore(c.env, serviceId, {
            status: 'waiting_payment',
            client_id: clientId,
            category_id,
            description,
            price_estimated: price_estimated || 0,
            location_type: location_type || 'client',
            latitude,
            longitude,
            address,
            profession_id,
            profession: profession || ''
        }));
        // await triggerServiceNotifications(serviceId, db, c.env, c.executionCtx);

        return c.json({
            success: true,
            service: {
                id: serviceId,
                status: 'pending',
                description,
                price_estimated
            }
        });

    } catch (error: any) {
        console.error('❌ Erro ao criar serviço:', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});


/**
 * API: Client Dispatch Tracking (Storytelling) (v12)
 * Provides a user-friendly timeline of the dispatch process.
 */
app.get('/api/service/:id/tracking', async (c) => {
    const serviceId = c.req.param('id');
    const db = c.env.DB;

    try {
        // 1. Fetch current status and provider details
        const service: any = await db.prepare(`
                SELECT s.status, s.profession, s.arrived_at, s.provider_id, 
                    u.full_name as provider_name, u.avatar_url as provider_avatar,
                    p.rating_avg as provider_rating, p.rating_count as provider_reviews
                FROM service_requests s
                LEFT JOIN users u ON s.provider_id = u.id
                LEFT JOIN providers p ON s.provider_id = p.user_id
                WHERE s.id = ?
            `).bind(serviceId).first();

        if (!service) return c.json({ success: false, message: "Service not found" }, 404);

        // 2. Fetch Audit History (v11)
        const { results: history } = await db.prepare(`
                SELECT h.action, h.created_at, h.provider_id, h.details, u.full_name as provider_name
                FROM service_dispatch_history h
                LEFT JOIN users u ON h.provider_id = u.id
                WHERE h.service_id = ? 
                ORDER BY h.created_at ASC
            `).bind(serviceId).all();

        // 3. Compile Story
        let headline = "Processando sua solicitação...";
        const timeline: any[] = [];
        const notifiedProviders = new Set();
        let lastNotificationTime: Date | null = null;
        let notificationCount = 0;
        let lastProviderName = "";

        for (let i = 0; i < history.length; i++) {
            const event: any = history[i];
            const date = new Date(event.created_at);
            const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const providerName = event.provider_name ? event.provider_name.split(' ')[0] : 'Motorista';

            switch (event.action) {
                case 'NOTIFIED':
                    lastNotificationTime = date;
                    lastProviderName = providerName;
                    notificationCount++;

                    if (notifiedProviders.size > 0) {
                        timeline.push({ time, message: `${lastProviderName} não respondeu. Buscando próximo...` });
                    } else {
                        timeline.push({ time, message: `Buscando prestador...` });
                    }
                    timeline.push({ time, message: `Aguardando resposta de ${providerName}...` });
                    notifiedProviders.add(event.provider_id);
                    break;

                case 'REJECTED':
                    timeline.push({ time, message: `${providerName} está ocupado. Buscando próximo...` });
                    break;

                case 'ACCEPTED':
                    timeline.push({ time, message: `✅ ${providerName} aceitou! Ele já está visualizando seu endereço.` });
                    headline = `${providerName} está a caminho!`;
                    break;
            }
        }

        // 4. Generate Dynamic Headline based on state
        const isSearching = ['searching', 'pending', 'open', 'paid', 'offered'].includes(service.status);

        if (isSearching) {
            if (lastNotificationTime) {
                const now = new Date();
                const diffSeconds = (now.getTime() - lastNotificationTime.getTime()) / 1000;

                if (notificationCount > 1) {
                    headline = `Aguardando ${lastProviderName}...`;
                } else if (diffSeconds < 10) {
                    headline = `Chamando ${lastProviderName}...`;
                } else {
                    headline = `Aguardando ${lastProviderName}...`;
                }
            } else {
                headline = "Busca iniciada";
            }
        } else if (service.status === 'accepted') {
            if (service.arrived_at) {
                headline = "O prestador chegou!";
            } else {
                headline = "Profissional a caminho!";
            }
        } else if (service.status === 'completed') {
            headline = "Serviço finalizado";
        }

        // Special Case: Ensure timeline isn't empty during search
        if (timeline.length === 0 && isSearching) {
            timeline.push({ time: "Agora", message: "Procurando prestadores disponíveis..." });
        }

        // Special Case: Provider arrived
        if (service.arrived_at) {
            timeline.push({ time: "Agora", message: "📍 O prestador chegou ao seu endereço." });
        }

        return c.json({
            success: true,
            status: service.status,
            headline,
            timeline: timeline.reverse(), // Newest first for UI
            provider: service.provider_id ? {
                id: service.provider_id,
                name: service.provider_name,
                avatar: service.provider_avatar,
                rating: service.provider_rating,
                reviews: service.provider_reviews
            } : null
        });

    } catch (error: any) {
        console.error(`[Rastreamento] ❌ Erro: ${error.message}`);
        return c.json({ success: false, message: "Error fetching tracking info" }, 500);
    }
});

/**
 * API: AI Classification Bridge
 */
app.post('/api/services/ai/classify', async (c) => {
    let text: string | undefined;
    try {
        // Tentativa robusta de ler o JSON ou Texto
        const rawBody = await c.req.text();
        if (!rawBody || rawBody.trim() === '') {
            return c.json({ success: false, message: "Empty body" }, 400);
        }

        try {
            const parsedBody = JSON.parse(rawBody);
            text = parsedBody.text;
        } catch (e) {
            // Se não for JSON, assume que o corpo é o próprio texto
            text = rawBody;
        }
    } catch (e: any) {
        return c.json({ success: false, message: "Invalid request body", error: e.message }, 400);
    }

    if (!text) return c.json({ success: false, message: "text required" }, 400);

    try {
        const fetchMethod = c.env.AI_SERVICE ? c.env.AI_SERVICE.fetch.bind(c.env.AI_SERVICE) : fetch;
        const targetUrl = c.env.AI_SERVICE ? `https://ai-service/classify` : `${c.env.AI_SERVICE_URL}/classify`;

        const response = await fetchMethod(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Adicionamos suporte a headers de acesso se configurados (para ambiente Cloudflare)
                ...(c.env.CF_ACCESS_CLIENT_ID ? { 'CF-Access-Client-Id': c.env.CF_ACCESS_CLIENT_ID } : {}),
                ...(c.env.CF_ACCESS_CLIENT_SECRET ? { 'CF-Access-Client-Secret': c.env.CF_ACCESS_CLIENT_SECRET } : {}),
            },
            body: JSON.stringify({ text })
        });
        const data: any = await response.json();

        // Mapear o resultado para o que o app mobile espera (paridade com o backend Express)
        const mappedResponse = {
            encontrado: (data.id && data.id > 0) || (data.task_id && data.task_id > 0),
            id: data.id || 0,
            profissao: data.name || data.profession_name || '',
            categoria: data.category_name || 'Geral',
            categoria_id: data.category_id || 1,
            confianca: data.score || 0,
            service_type: data.service_type || 'on_site',
            task: data.task_id ? {
                id: data.task_id,
                name: data.task_name,
                unit_price: data.price || data.unit_price,
                pricing_type: data.pricing_type,
                unit_name: data.unit_name
            } : null,
            candidates: data.candidates || []
        };

        console.log(`[IA] 🧠 Resposta mapeada: ${mappedResponse.profissao} (Encontrado: ${mappedResponse.encontrado})`);
        return c.json(mappedResponse);
    } catch (error: any) {
        console.error(`[IA] ❌ Erro de classificação: ${error.message}`);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Providers Search
 * Finds providers by profession and proximity
 */
app.get('/api/providers/search', async (c) => {
    const term = c.req.query('term');
    const profId = c.req.query('profession_id');
    const lat = parseFloat(c.req.query('lat') || '0');
    const lon = parseFloat(c.req.query('lon') || c.req.query('lng') || '0');

    try {
        const db = c.env.DB;

        // 1. Base query to find providers who have that profession
        let query = `
                SELECT 
                    u.id, u.full_name, u.avatar_url,
                    p.commercial_name, p.rating_avg, p.rating_count, p.is_online,
                    loc.latitude, loc.longitude
                FROM users u
                JOIN providers p ON u.id = p.user_id
                JOIN provider_locations loc ON u.id = loc.provider_id
                JOIN provider_professions pp ON u.id = pp.provider_user_id
                JOIN professions prof ON pp.profession_id = prof.id
                WHERE u.role = 'provider'
            `;

        const params: any[] = [];
        if (profId) {
            query += ` AND prof.id = ?`;
            params.push(profId);
        } else if (term) {
            query += ` AND prof.name LIKE ?`;
            params.push(`%${term}%`);
        }

        const result: any = await db.prepare(query).bind(...params).all();
        let providers = result.results || [];

        LOG.despacho(`📡 Busca de serviços disponíveis: ${providers.results?.length || 0} encontrados (Latitude: ${lat}, Longitude: ${lon})`);

        // 2. Fallback: If no providers with that profession, show ANY nearby providers
        if (providers.length === 0) {
            providers = (await db.prepare(`
                    SELECT 
                        u.id, u.full_name, u.avatar_url,
                        p.commercial_name, p.rating_avg, p.rating_count, p.is_online,
                        loc.latitude, loc.longitude
                    FROM users u
                    JOIN providers p ON u.id = p.user_id
                    JOIN provider_locations loc ON u.id = loc.provider_id
                    WHERE u.role = 'provider'
                    LIMIT 10
                `).all()).results || [];
        }

        // 3. Enhance with distance
        const enhanced = providers.map((u: any) => {
            let distance = null;
            if (u.latitude && u.longitude && lat && lon) {
                const R = 6371; // km
                const dLat = (u.latitude - lat) * Math.PI / 180;
                const dLon = (u.longitude - lon) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat * Math.PI / 180) * Math.cos(u.latitude * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            }

            return {
                ...u,
                id: u.id.toString(),
                distance_km: distance,
                is_open: true, // Mock for now to ensure results show up
                next_slot: null
            };
        });

        return c.json({ success: true, providers: enhanced });
    } catch (error: any) {
        return c.json({ success: false, message: error.message }, 500);
    }
});

/**
 * API: Provider Profile
 */
app.get('/api/providers/:id/profile', async (c) => {
    const id = c.req.param('id');
    try {
        const db = c.env.DB;
        const user: any = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
        if (!user) return c.json({ success: false, message: "Provider not found" }, 404);

        const provider: any = await db.prepare('SELECT * FROM providers WHERE user_id = ?').bind(id).first();

        // FIX: Switch to provider_schedule_configs which is the active table
        // provider_schedules is legacy/unused
        const schedules: any = await db.prepare('SELECT * FROM provider_schedule_configs WHERE provider_id = ?').bind(id).all();

        const services: any = await db.prepare('SELECT * FROM provider_custom_services WHERE provider_id = ? AND active = 1').bind(id).all();
        const reviews: any = await db.prepare(`
                SELECT r.*, u.full_name as reviewer_name, u.avatar_url as reviewer_avatar
                FROM reviews r
                JOIN users u ON r.reviewer_id = u.id
                WHERE r.reviewee_id = ?
                ORDER BY r.created_at DESC LIMIT 10
            `).bind(id).all();

        // Fetch specialties
        const specialtiesResult: any = await db.prepare(`
                SELECT p.name
                FROM provider_professions pp
                JOIN professions p ON pp.profession_id = p.id
                WHERE pp.provider_user_id = ?
            `).bind(id).all();
        const specialties = (specialtiesResult.results || []).map((s: any) => s.name);

        // Fetch completed services count
        const completedServices: any = await db.prepare('SELECT COUNT(*) as count FROM service_requests WHERE provider_id = ? AND status = ?').bind(id, 'completed').first();
        const servicesCompletedCount = completedServices?.count || 0;

        // FIX: Location Fallback
        // If provider table has no lat/lng, try provider_locations
        let lat = provider?.latitude;
        let lng = provider?.longitude;
        if (!lat || !lng) {
            const loc: any = await db.prepare('SELECT latitude, longitude FROM provider_locations WHERE provider_id = ?').bind(id).first();
            if (loc) {
                lat = loc.latitude;
                lng = loc.longitude;
            }
        }

        return c.json({
            success: true,
            profile: {
                id: user.id.toString(),
                full_name: user.full_name,
                avatar_url: user.avatar_url,
                commercial_name: provider?.commercial_name,
                bio: provider?.bio,
                rating_avg: provider?.rating_avg,
                rating_count: provider?.rating_count,
                address: provider?.address || 'Endereço não informado',
                latitude: lat,
                longitude: lng,
                member_since: user.created_at,
                services_completed: servicesCompletedCount,
                specialties: specialties,
                // Map configs to match frontend expectation (roughly)
                // Frontend expects: day_of_week, start_time, end_time, is_enabled
                schedules: (schedules.results || []).map((s: any) => {
                    // Helper to format time to "HH:mm" from potential ISO string
                    const formatTime = (t: string) => {
                        if (!t) return "00:00";
                        if (t.includes('T')) {
                            try {
                                const date = new Date(t);
                                return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
                            } catch (e) { return "00:00"; }
                        }
                        return t.substring(0, 5);
                    };

                    return {
                        id: s.id.toString(),
                        provider_id: s.provider_id.toString(),
                        day_of_week: s.day_of_week,
                        start_time: formatTime(s.start_time),
                        end_time: formatTime(s.end_time),
                        is_enabled: s.is_active === 1 || s.is_active === true // Handle 1/0 or true/false
                    };
                }),
                services: (services.results || []).map((s: any) => ({ ...s, id: s.id.toString(), provider_id: s.provider_id.toString() })),
                reviews: (reviews.results || []).map((r: any) => ({ ...r, id: r.id.toString() }))
            }
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});
/**
 * API: Upload Avatar
 * Receives multipart image and stores it in D1 as a blob.
 */
app.post('/api/media/avatar', async (c) => {
    try {
        const db = c.env.DB;
        const bucket = (c.env as any).AVATARS;
        const authHeader = c.req.header('Authorization');

        let userId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded && decoded.email) {
                const u: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) userId = u.id;
            }
        }

        if (!userId) {
            return c.json({ success: false, message: 'Unauthorized' }, 401);
        }

        const formData = await c.req.formData();
        const file = formData.get('file');

        if (!file || !(file instanceof File)) {
            console.error('[Media] ❌ Upload sem arquivo ou formato inválido');
            return c.json({ success: false, message: 'No file uploaded' }, 400);
        }

        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const mimeType = file.type || 'image/jpeg';

        // Log first few bytes to verify image header
        const header = Array.from(bytes.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log(`[Media] 🖼️ Recebido upload: ${mimeType}, ${bytes.length} bytes. Header: ${header}`);

        // Use a timestamp to force client-side refresh
        const timestamp = Date.now();
        const avatarUrl = `https://projeto-central-backend.carrobomebarato.workers.dev/api/media/avatar/${userId}?t=${timestamp}`;

        // Save to R2
        const key = `avatars/${userId}`;
        await bucket.put(key, bytes, {
            httpMetadata: { contentType: mimeType }
        });

        // Update database with URL (and clear blob to save space)
        await db.prepare(`
                UPDATE users 
                SET avatar_url = ?, 
                    avatar_blob = NULL,
                    avatar_mime = ?
                WHERE id = ?
            `).bind(
            avatarUrl,
            mimeType,
            userId
        ).run();

        LOG.sistema(`✅ Avatar (R2) salvo para Usuário #${userId}. URL: ${avatarUrl}`);

        return c.json({
            success: true,
            message: 'Avatar uploaded successfully',
            userId: userId,
        });
    } catch (error: any) {
        LOG.erro('[Media] ❌ Erro fatal no upload (R2):', error.message);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Get Avatar (Me)
 */
app.get('/api/media/avatar/me', async (c) => {
    try {
        const db = c.env.DB;
        const bucket = (c.env as any).AVATARS;
        const authHeader = c.req.header('Authorization');

        let userId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded && decoded.email) {
                const u: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) userId = u.id;
            }
        }

        if (!userId) return c.json({ success: false, message: 'Unauthorized' }, 401);

        const object = await bucket.get(`avatars/${userId}`);

        if (!object) {
            // Fallback to D1 for legacy if it exists
            const user: any = await db.prepare('SELECT avatar_blob, avatar_mime FROM users WHERE id = ?').bind(userId).first();
            if (user && user.avatar_blob) {
                return new Response(user.avatar_blob, {
                    headers: { 'Content-Type': user.avatar_mime || 'image/jpeg' }
                });
            }
            return c.json({ success: false, message: 'No avatar found' }, 404);
        }

        return new Response(object.body, {
            headers: {
                'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
                'Cache-Control': 'no-cache',
                'Content-Length': object.size.toString()
            }
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Get Avatar (ID)
 */
app.get('/api/media/avatar/:id', async (c) => {
    const userIdParam = c.req.param('id');
    const userId = parseInt(userIdParam);

    try {
        const bucket = (c.env as any).AVATARS;
        const db = c.env.DB;
        const object = await bucket.get(`avatars/${userId}`);

        if (!object) {
            const user: any = await db.prepare('SELECT avatar_blob, avatar_mime FROM users WHERE id = ?').bind(userId).first();
            if (user && user.avatar_blob) {
                console.log(`[Media] ⬇️ Servindo avatar (D1 ID Fallback) para ${userId}`);
                return new Response(user.avatar_blob, {
                    headers: { 'Content-Type': user.avatar_mime || 'image/jpeg' }
                });
            }
            console.warn(`[Media] ⚠️ Avatar não encontrado para ${userId}`);
            return c.json({ success: false, message: 'No avatar found' }, 404);
        }

        console.log(`[Media] ⬇️ Servindo R2 para ${userId}: ${object.size} bytes (${object.httpMetadata?.contentType})`);

        return new Response(object.body, {
            headers: {
                'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
                'Cache-Control': 'public, max-age=3600',
                'Content-Length': object.size.toString()
            }
        });
    } catch (error: any) {
        console.error(`[Media] ❌ Erro ao buscar avatar para ${userId}:`, error.message);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * CHAT API: Get Chat Messages
 */
app.get('/api/chat/:serviceId/messages', async (c) => {
    const serviceId = c.req.param('serviceId');
    const db = c.env.DB;
    try {
        const result: any = await db.prepare(
            'SELECT * FROM chat_messages WHERE service_id = ? ORDER BY sent_at ASC'
        ).bind(serviceId).all();

        return c.json({
            success: true,
            messages: result.results || []
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * CHAT API: Send Chat Message
 */
app.post('/api/chat/:serviceId/messages', async (c) => {
    const serviceId = c.req.param('serviceId');
    const db = c.env.DB;
    const authHeader = c.req.header('Authorization');

    try {
        let senderId = null;
        let senderName = 'Mensagem';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded && decoded.email) {
                const u: any = await db.prepare('SELECT id, full_name FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) {
                    senderId = u.id;
                    senderName = u.full_name;
                }
            }
        }

        if (!senderId) return c.json({ success: false, message: 'Unauthorized' }, 401);

        const body: any = await c.req.json();
        const { content, type = 'text' } = body;

        if (!content) return c.json({ success: false, message: 'Content required' }, 400);

        // 1. Insert into D1
        const result: any = await db.prepare(
            'INSERT INTO chat_messages (service_id, sender_id, content, type) VALUES (?, ?, ?, ?) RETURNING id, sent_at'
        ).bind(serviceId, senderId, content, type).first();

        // 2. Sync to Firebase (RTDB Pulse for real-time delivery)
        const service: any = await db.prepare('SELECT client_id, provider_id FROM service_requests WHERE id = ?').bind(serviceId).first();
        if (service) {
            const recipientId = senderId === service.client_id ? service.provider_id : service.client_id;

            if (recipientId) {
                // Sync via RTDB Pulse (Maestro v2 pattern)
                c.executionCtx.waitUntil((async () => {
                    await syncStatusToFirebase(
                        c.env,
                        serviceId,
                        'new_message',
                        [recipientId],
                        {
                            message_id: result.id,
                            content,
                            type,
                            sender_id: senderId,
                            sent_at: result.sent_at
                        },
                        'chat.message'
                    );

                    // 3. Notify User (Hybrid: FCM + Firestore)
                    const bodyPreview = type === 'text' ? content : (type === 'image' ? '📷 Foto' : (type === 'audio' ? '🎤 Áudio' : '🎥 Vídeo'));

                    c.executionCtx.waitUntil(sendNotificationToUser(c.env, recipientId, senderName, bodyPreview, {
                        type: 'chat.message',
                        service_id: serviceId,
                        content: bodyPreview,
                        sender_id: senderId.toString()
                    }));
                    console.log(`[Chat] 🔔 Notificação enviada para User #${recipientId}`);

                    // 4. Sync to Firestore (Real-time Chat)
                    // Collection: chats/{serviceId}/messages
                    try {
                        const saJson = c.env.FIREBASE_SERVICE_ACCOUNT;
                        if (saJson) {
                            const sa = JSON.parse(saJson);
                            const projectId = sa.project_id;
                            const accessToken = await getAccessTokenFromServiceAccount(saJson);

                            if (accessToken && projectId) {
                                const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/chats/${serviceId}/messages`;

                                await fetch(firestoreUrl, {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${accessToken}`,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        fields: {
                                            sender_id: { integerValue: senderId.toString() },
                                            sender_name: { stringValue: senderName },
                                            content: { stringValue: content },
                                            type: { stringValue: type },
                                            sent_at: { timestampValue: new Date().toISOString() }, // Use current time for Firestore
                                            recipient_id: { integerValue: recipientId.toString() }
                                        }
                                    })
                                });
                                console.log(`[Chat] 🔥 Firestore Checkpoint: Mensagem salva em chats/${serviceId}/messages`);
                            }
                        }
                    } catch (e: any) {
                        console.error(`[Chat] ❌ Falha ao espelhar no Firestore: ${e.message}`);
                    }
                })());
            }
        }

        return c.json({
            success: true,
            message: {
                id: result.id,
                service_id: serviceId,
                sender_id: senderId,
                content: content,
                type: type,
                sent_at: result.sent_at
            }
        });
    } catch (error: any) {
        console.error('[Chat] ❌ Erro ao enviar mensagem:', error.message);
        return c.json({ success: false, error: error.message }, 500);
    }
});

// ############################################################################
// #                                                                          #
// #                       MEDIA & FILE ROUTES                                #
// #                                                                          #
// ############################################################################

/**
 * MEDIA API: Chat Media Upload (Organized by serviceId)
 */
app.post('/api/media/chat/:type', async (c) => {
    const mediaType = c.req.param('type'); // 'image', 'audio', 'video'
    const serviceId = c.req.query('serviceId');
    const bucket = (c.env as any).AVATARS;

    if (!serviceId) return c.json({ success: false, message: 'serviceId required' }, 400);

    try {
        const formData = await c.req.formData();
        const file = formData.get('file');

        if (!file || !(file instanceof File)) {
            return c.json({ success: false, message: 'No file uploaded' }, 400);
        }

        const filename = `${Date.now()}_${file.name}`;
        const key = `media/chat/${serviceId}/${filename}`;

        const bytes = await file.arrayBuffer();
        await bucket.put(key, bytes, {
            httpMetadata: { contentType: file.type }
        });



        return c.json({
            success: true,
            key: key,
            url: `/api/media/chat/raw?key=${encodeURIComponent(key)}`
        });
    } catch (error: any) {
        console.error(`[Media] ❌ Erro no upload de chat ${mediaType}:`, error.message);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * MEDIA API: Serve Chat Media
 */
app.get('/api/media/chat/raw', async (c) => {
    const key = c.req.query('key');
    if (!key) return c.json({ success: false, message: 'Key required' }, 400);

    const rangeHeader = c.req.header('Range');

    try {
        const bucket = (c.env as any).AVATARS;

        // Se houver header Range, fazemos request parcial ao R2
        // Se houver header Range, fazemos request parcial ao R2
        if (rangeHeader) {
            let r2Range: any;
            const rangeMatch = rangeHeader.match(/^bytes=(\d+)-(\d+)?$/);
            const suffixMatch = rangeHeader.match(/^bytes=-(\d+)$/);

            if (suffixMatch) {
                r2Range = { suffix: parseInt(suffixMatch[1], 10) };
            } else if (rangeMatch) {
                const start = parseInt(rangeMatch[1], 10);
                const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : undefined;
                r2Range = { offset: start };
                if (end !== undefined) {
                    r2Range.length = end - start + 1;
                }
            } else {
                // Fallback if regex fails, though browsers send standard formats
                console.warn(`[Media] Invalid/Unsupported Range header: ${rangeHeader}, ignoring range.`);
            }

            const object = await bucket.get(key, {
                range: r2Range, // Pass parsed object, strict R2Range type
                onlyIf: c.req.header('If-Match') ? { etagMatches: c.req.header('If-Match') } : undefined
            });

            if (!object) return c.json({ success: false, message: 'File not found' }, 404);

            const headers = new Headers();
            object.writeHttpMetadata(headers);
            headers.set('etag', object.httpEtag);

            // R2 range response returns Content-Range automatically in some cases, 
            // but usually we rely on the object body being the chunk.
            // When using 'range' option, 'object.body' is the partial content.
            // We need to ensure we set the correct status 206 and Content-Range if R2 provides info.

            // NOTE: worker R2 get() with range returns the partial body. 
            // We should check 'object.range' to see what was returned.

            if (object.range) {
                headers.set("content-range", `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`);
                headers.set("content-length", object.range.length.toString());
            } else {
                headers.set("content-length", object.size.toString());
            }

            if (!headers.has('cache-control')) {
                headers.set('cache-control', 'public, max-age=31536000');
            }

            return new Response(object.body, {
                headers,
                status: 206
            });
        }

        // Sem Range, retorna tudo (normal)
        const object = await bucket.get(key);
        if (!object) return c.json({ success: false, message: 'File not found' }, 404);

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('content-length', object.size.toString());

        if (!headers.has('cache-control')) {
            headers.set('cache-control', 'public, max-age=31536000');
        }

        return new Response(object.body, {
            headers
        });

    } catch (error: any) {
        console.error(`[Media] ❌ Critical Error serving ${key}:`, error);
        if (error.stack) console.error(`[Media] Stack:`, error.stack);
        return c.json({ success: false, error: error.message }, 500);
    }
});

// ############################################################################
// #                                                                          #
// #                       PROVIDER SPECIFIC ROUTES                           #
// #                                                                          #
// ############################################################################

/**
 * API: Get Provider Specialties/Professions
 */
app.get('/api/profile/specialties', async (c) => {
    try {
        const db = c.env.DB;
        const authHeader = c.req.header('Authorization');

        let userId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded && decoded.email) {
                const u: any = await db.prepare('SELECT id, role FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) {
                    userId = u.id;
                    if (u.role !== 'provider') {
                        return c.json({ success: false, message: 'Only providers can view specialties' }, 403);
                    }
                }
            }
        }

        if (!userId) {
            return c.json({ success: false, message: 'Unauthorized' }, 401);
        }

        // Get provider's professions
        const result: any = await db.prepare(`
                SELECT p.id, p.name
                FROM provider_professions pp
                JOIN professions p ON pp.profession_id = p.id
                WHERE pp.provider_user_id = ?
                ORDER BY p.name ASC
            `).bind(userId).all();

        const specialties = (result.results || []).map((r: any) => ({
            id: r.id,
            name: r.name
        }));

        console.log(`[Especialidades] 🎓 Prestador ${userId} possui ${specialties.length} especialidades`);

        return c.json({
            success: true,
            specialties
        });
    } catch (error: any) {
        console.error('[Especialidades] ❌ Erro ao buscar:', error.message);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Add Provider Specialty/Profession
 */
app.post('/api/profile/specialties', async (c) => {
    let body;
    try {
        body = await c.req.json();
    } catch (e) {
        return c.json({ success: false, message: "Invalid JSON" }, 400);
    }

    const { name } = body;
    if (!name) {
        return c.json({ success: false, message: "Profession name required" }, 400);
    }

    try {
        const db = c.env.DB;
        const authHeader = c.req.header('Authorization');

        let userId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded && decoded.email) {
                const u: any = await db.prepare('SELECT id, role FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) {
                    userId = u.id;
                    if (u.role !== 'provider') {
                        return c.json({ success: false, message: 'Only providers can add specialties' }, 403);
                    }
                }
            }
        }

        if (!userId) {
            return c.json({ success: false, message: 'Unauthorized' }, 401);
        }

        // Find or create profession
        let profession: any = await db.prepare('SELECT id FROM professions WHERE name = ?').bind(name).first();

        if (!profession) {
            // Create new profession
            const result = await db.prepare('INSERT INTO professions (name) VALUES (?) RETURNING id')
                .bind(name)
                .first();
            profession = result;
        }

        if (!profession || !profession.id) {
            return c.json({ success: false, message: 'Failed to get profession id' }, 500);
        }

        // Check if already exists
        const existing = await db.prepare(
            'SELECT provider_user_id FROM provider_professions WHERE provider_user_id = ? AND profession_id = ?'
        ).bind(userId, profession.id).first();

        if (existing) {
            return c.json({ success: true, message: 'Specialty already added' });
        }

        // Add to provider_professions
        await db.prepare(
            'INSERT INTO provider_professions (provider_user_id, profession_id) VALUES (?, ?)'
        ).bind(userId, profession.id).run();

        console.log(`[Especialidades] ✅ Adicionada ${name} (id:${profession.id}) ao prestador ${userId}`);

        return c.json({ success: true, message: 'Specialty added successfully' });
    } catch (error: any) {
        console.error('[Especialidades] ❌ Erro ao adicionar:', error.message);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Remove Provider Specialty/Profession
 */
app.delete('/api/profile/specialties', async (c) => {
    let body;
    try {
        body = await c.req.json();
    } catch (e) {
        return c.json({ success: false, message: "Invalid JSON" }, 400);
    }

    const { name } = body;
    if (!name) {
        return c.json({ success: false, message: "Profession name required" }, 400);
    }

    try {
        const db = c.env.DB;
        const authHeader = c.req.header('Authorization');

        let userId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded && decoded.email) {
                const u: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) userId = u.id;
            }
        }

        if (!userId) {
            return c.json({ success: false, message: 'Unauthorized' }, 401);
        }

        // Find profession
        const profession: any = await db.prepare('SELECT id FROM professions WHERE name = ?').bind(name).first();

        if (!profession) {
            return c.json({ success: false, message: 'Profession not found' }, 404);
        }

        // Remove from provider_professions
        await db.prepare(
            'DELETE FROM provider_professions WHERE provider_user_id = ? AND profession_id = ?'
        ).bind(userId, profession.id).run();

        console.log(`[Especialidades] 🗑️ Removida ${name} do prestador ${userId}`);

        return c.json({ success: true, message: 'Specialty removed successfully' });
    } catch (error: any) {
        console.error('[Especialidades] ❌ Erro ao remover:', error.message);
        return c.json({ success: false, error: error.message }, 500);
    }
});
// ############################################################################
// #                                                                          #
// #                       USER PROFILE ROUTES                                #
// #                                                                          #
// ############################################################################

/**
 * API: User Profile
 * Returns mocked or real user profile from D1
 */
app.get('/api/profile/me', async (c) => {
    try {
        const db = c.env.DB;
        const authHeader = c.req.header('Authorization');

        let userId = 1; // Fallback for testing only

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded && decoded.email) {
                const u: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) {
                    userId = u.id;
                    LOG.auth(`🔑 Perfil solicitado por ${decoded.email} (ID: ${userId})`);
                }
            }
        }

        const user: any = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();

        if (!user) {
            return c.json({ success: false, message: 'User not found' }, 404);
        }

        let providerData: any = null;
        if (user.role === 'provider') {
            providerData = await db.prepare('SELECT p.wallet_balance, p.commercial_name, p.is_fixed_location, p.user_id FROM providers p WHERE p.user_id = ?').bind(userId).first();

            // Auto-Correct: If provider has any fixed-location profession (at_provider) but is stored as Mobile (0), fix it.
            if (providerData) {
                const fixedProfession = await db.prepare(`
                        SELECT 1 
                        FROM provider_professions pp
                        JOIN professions prof ON pp.profession_id = prof.id
                        WHERE pp.provider_user_id = ? AND prof.service_type = 'at_provider'
                        LIMIT 1
                    `).bind(userId).first();

                if (fixedProfession && providerData.is_fixed_location !== 1) {
                    await db.prepare('UPDATE providers SET is_fixed_location = 1 WHERE user_id = ?').bind(userId).run();
                    providerData.is_fixed_location = 1; // Reflect in response immediately
                }

                // Fetch professions for client-side filtering (Firestore)
                const professions: any = await db.prepare(`
                    SELECT p.name
                    FROM provider_professions pp
                    JOIN professions p ON pp.profession_id = p.id
                    WHERE pp.provider_user_id = ?
                `).bind(userId).all();

                providerData.professions = (professions.results || []).map((p: any) => p.name);
            }
        }

        LOG.sistema(`👤 Retornando perfil para #${user.id} (${user.full_name}) - Cargo: ${user.role}`);

        return c.json({
            success: true,
            user: {
                id: user.id,
                name: user.full_name,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                avatar_url: user.avatar_url,
                wallet_balance: providerData?.wallet_balance || 0,
                balance: providerData?.wallet_balance || 0, // Frontend alias
                commercial_name: providerData?.commercial_name,
                is_medical: false, // Default for now
                is_fixed_location: providerData ? providerData.is_fixed_location === 1 : false,
                professions: providerData?.professions || []
            }
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Update User Profile
 * Updates full_name, email, and phone for the current user.
 */
app.put('/api/profile/me', async (c) => {
    try {
        const db = c.env.DB;
        const authHeader = c.req.header('Authorization');

        let userId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded && decoded.email) {
                const u: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) userId = u.id;
            }
        }

        if (!userId) {
            return c.json({ success: false, message: 'Unauthorized' }, 401);
        }

        const body: any = await c.req.json();
        const { name, email, phone } = body;

        // Update users table. Name maps to full_name.
        const result = await db.prepare(`
                UPDATE users 
                SET full_name = COALESCE(?, full_name),
                    email = COALESCE(?, email),
                    phone = COALESCE(?, phone)
                WHERE id = ?
            `).bind(name || null, email || null, phone || null, userId).run();

        if (result.meta.changes === 0) {
            return c.json({ success: false, message: 'User not found or no changes made' }, 404);
        }

        console.log(`[Perfil] 👤 Usuário ${userId} atualizou o perfil: ${name || 'N/A'}, ${email || 'N/A'}, ${phone || 'N/A'}`);

        return c.json({ success: true, message: 'Profile updated successfully' });
    } catch (error: any) {
        console.error('[Perfil] ❌ Erro ao atualizar perfil:', error.message);
        return c.json({ success: false, error: error.message }, 500);
    }
});

// ############################################################################
// #                                                                          #
// #                       SERVICE OPERATION ROUTES                           #
// #                                                                          #
// ############################################################################

/**
 * API: Service Details
 */
app.get('/api/services/:id', async (c) => {
    const serviceId = c.req.param('id');
    try {
        const db = c.env.DB;
        const authHeader = c.req.header('Authorization');

        let userRole = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded && decoded.email) {
                const u: any = await db.prepare('SELECT role FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) userRole = u.role;
            }
        }

        let service: any = await db.prepare(`
                SELECT sr.*, tc.name as title
                FROM service_requests sr
                LEFT JOIN task_catalog tc ON sr.task_id = tc.id
                WHERE sr.id = ?
            `).bind(serviceId).first();

        if (!service) {
            return c.json({ success: false, message: "Service not found" }, 404);
        }

        // Apply commission if requester is a provider
        if (userRole === 'provider') {
            let platformCommissionRate = 15;
            try {
                const comm: any = await db.prepare("SELECT value FROM app_config WHERE key = 'platform_commission_rate'").first();
                if (comm) platformCommissionRate = parseFloat(comm.value);
            } catch (e) { }

            const commissionFactor = (100 - platformCommissionRate) / 100;

            // If provider_amount is not set, we calculate it dynamically for display
            // but we also override the price_estimated and price_upfront fields
            // so the provider sees the "Take Home" pay across all fields.
            service = {
                ...service,
                price_estimated: service.provider_amount || (service.price_estimated ? service.price_estimated * commissionFactor : null),
                price_upfront: service.price_upfront
                    ? service.price_upfront * commissionFactor
                    : (service.price_estimated ? service.price_estimated * commissionFactor : null),
                platform_commission: platformCommissionRate
            };
        }

        // Fetch provider if assigned
        let provider = null;
        if (service.provider_id) {
            provider = await db.prepare('SELECT * FROM providers WHERE user_id = ?').bind(service.provider_id).first();
        }

        return c.json({
            success: true,
            service: {
                ...service,
                provider: provider
            }
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Cancel Service
 */
app.post('/api/services/:id/cancel', async (c) => {
    const serviceId = c.req.param('id');
    try {
        const db = c.env.DB;

        // 1. Fetch current status and arrival info
        const service: any = await db.prepare('SELECT status, arrived_at, provider_id, client_id FROM service_requests WHERE id = ?')
            .bind(serviceId)
            .first();

        if (!service) return c.json({ success: false, message: 'Service not found' }, 404);

        // 2. Strict Rule: Cannot cancel if provider has already arrived
        if (service.arrived_at) {
            LOG.warn(`🚫 Tentativa de cancelamento bloqueada para serviço ${serviceId}: Prestador já chegou.`);
            return c.json({
                success: false,
                message: 'Não é possível cancelar após a chegada do prestador. Entre em contato com o suporte se houver problemas.'
            }, 403);
        }

        // 3. Identificar quem está cancelando (Cliente ou Prestador)
        const clientId = (c.get('user') as any)?.id || null;
        const isProvider = clientId && service.provider_id === clientId; // clientId aqui é o userId logado

        // 4 & 5. Maestro v2: Operação Atômica de Status + Notificação
        const notifyList = [service.client_id];
        if (service.provider_id) notifyList.push(service.provider_id);

        let newStatus = ServiceStatus.CANCELLED;
        let eventType = 'service.deleted';
        let extraUpdates: any = {};

        if (isProvider) {
            // Prestador desistiu: o serviço volta para a fila de espera
            newStatus = ServiceStatus.OPEN_FOR_SCHEDULE;
            eventType = 'service.status';
            extraUpdates = {
                provider_id: null,
                accepted_at: null,
                arrived_at: null,
                status_updated_at: new Date().toISOString()
            };
            LOG.servico(`🔄 Prestador ${clientId} desistiu do serviço ${serviceId}. Reabrindo para agendamento.`);
        }

        await updateServiceStatus(
            c.env,
            serviceId,
            newStatus,
            notifyList,
            {},
            extraUpdates,
            'id = ?',
            [],
            eventType,
            c.executionCtx
        );

        // Limpeza/Atualização da fila de notificações
        c.executionCtx.waitUntil((async () => {
            if (isProvider) {
                // Se o prestador desistiu, limpamos a notificação específica dele para que ele não veja mais
                // ou mantemos para histórico? O plano diz "disponível novamente para outros".
                // IMPORTANTE: Se o prestador cancelou, talvez ele não devesse ver de novo IMEDIATAMENTE.
                // Mas a regra de negócio solicitada é que eles reapareçam.
                await db.prepare("DELETE FROM notificacao_de_servicos WHERE service_id = ?").bind(serviceId).run();
            } else {
                await db.prepare("UPDATE notificacao_de_servicos SET status = 'CANCELLED' WHERE service_id = ?").bind(serviceId).run();
            }
        })());

        // Notificação específica para o cliente se o prestador desistiu
        if (isProvider) {
            c.executionCtx.waitUntil(sendNotificationToUser(
                c.env,
                service.client_id,
                '⚠️ O prestador desistiu',
                'O prestador que aceitou seu serviço precisou cancelar. O serviço já está disponível novamente para outros profissionais.',
                { service_id: serviceId, type: 'provider_withdrew' }
            ));
        }

        LOG.servico(`🗑️ Serviço ${serviceId} cancelado pelo Usuário #${clientId}`);

        return c.json({ success: true, message: isProvider ? 'Desistência registrada. Serviço reaberto.' : 'Service cancelled' });
    } catch (error: any) {
        LOG.erro(`Erro ao processar cancelamento do serviço ${serviceId}:`, error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Confirm Payment Release (Client Confirmation)
 * Called by client to confirm service completion and release payment
 */
app.post('/api/services/:id/confirm-payment-release', async (c) => {
    const serviceId = c.req.param('id');
    const db = c.env.DB;
    const authHeader = c.req.header('Authorization');

    try {
        // 1. Auth Check
        let clientId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded && decoded.email) {
                const u: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) clientId = u.id;
            }
        }

        if (!clientId) return c.json({ success: false, message: 'Unauthorized' }, 401);

        // 2. Fetch Service
        const service: any = await db.prepare('SELECT * FROM service_requests WHERE id = ?').bind(serviceId).first();
        if (!service) return c.json({ success: false, message: 'Service not found' }, 404);

        if (service.client_id !== clientId) {
            return c.json({ success: false, message: 'Only the client can confirm completion' }, 403);
        }

        if (service.status !== 'waiting_client_confirmation') {
            return c.json({ success: false, message: `Service is not waiting for confirmation (Status: ${service.status})` }, 400);
        }

        // 3. Atomic Update: Status COMPLETED + Wallet Transaction + Payment Released
        // We use a status check in the WHERE clause for idempotency/safety
        const transactionId = `WT-${serviceId}-${Date.now()}`; // Unique ID for wallet transaction

        const batch = [
            // A. Update Service Status (Only if currently waiting)
            db.prepare(`
                    UPDATE service_requests 
                    SET status = ?, completed_at = CURRENT_TIMESTAMP 
                    WHERE id = ? AND status = 'waiting_client_confirmation'
                `).bind(ServiceStatus.COMPLETED, serviceId),

            // B. Insert Wallet Transaction for Provider
            db.prepare(`
                    INSERT INTO wallet_transactions (id, user_id, service_id, amount, type, description)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).bind(
                transactionId,
                service.provider_id,
                serviceId,
                service.provider_amount || 0,
                'earning',
                `Recebimento pelo serviço #${serviceId}`
            ),

            // C. Release Payment Link (if any)
            db.prepare("UPDATE payments SET status = 'released' WHERE mission_id = ? AND status = 'approved'")
                .bind(serviceId),

            // D. UPDATE PROVIDER BALANCE (The missing piece!)
            db.prepare(`
                    UPDATE providers 
                    SET wallet_balance = wallet_balance + ? 
                    WHERE user_id = ?
                `).bind(service.provider_amount || 0, service.provider_id)
        ];

        const results = await db.batch(batch);

        // Check if the service was actually updated (if status was changed in this batch)
        const updateResult = results[0];
        if (updateResult.meta.changes === 0) {
            return c.json({ success: false, message: 'Service already confirmed or in invalid state' }, 400);
        }

        // 4. Notify via Firebase (Async)
        c.executionCtx.waitUntil((async () => {
            const notifyList = [service.provider_id, service.client_id];
            await syncStatusToFirebase(
                c.env,
                serviceId,
                ServiceStatus.COMPLETED,
                notifyList,
                { provider_id: service.provider_id },
                'service.completed'
            );
        })());

        LOG.sucesso(`✅ Cliente #${clientId} confirmou conclusão do serviço ${serviceId}. Créditos liberados para #${service.provider_id}`);

        return c.json({ success: true, message: 'Service confirmed and payment released' });
    } catch (error: any) {
        LOG.erro(`Erro ao confirmar serviço ${serviceId}:`, error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Submit Review
 */
app.post('/api/services/:id/review', async (c) => {
    const serviceId = c.req.param('id');
    const db = c.env.DB;
    const authHeader = c.req.header('Authorization');

    try {
        const body: any = await c.req.json();
        const rating = body.rating;
        const comment = body.comment;

        // 1. Auth Check
        let reviewerId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded && decoded.email) {
                const u: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) reviewerId = u.id;
            }
        }

        if (!reviewerId) return c.json({ success: false, message: 'Unauthorized' }, 401);

        // 2. Fetch Service to verify participation and status
        const service: any = await db.prepare('SELECT client_id, provider_id, status FROM service_requests WHERE id = ?').bind(serviceId).first();
        if (!service) return c.json({ success: false, message: 'Service not found' }, 404);

        if (service.client_id !== reviewerId) {
            return c.json({ success: false, message: 'Only the client can review this service' }, 403);
        }

        // 3. Check if already reviewed (Basic check)
        const existingReview = await db.prepare('SELECT id FROM reviews WHERE service_id = ? AND reviewer_id = ?').bind(serviceId, reviewerId).first();
        if (existingReview) {
            return c.json({ success: false, message: 'Review already submitted for this service' }, 409);
        }

        // 4. Atomic Update: Insert Review + Update Provider Stats
        const batch = [
            db.prepare(`
                    INSERT INTO reviews (service_id, reviewer_id, reviewee_id, rating, comment, created_at)
                    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `).bind(serviceId, reviewerId, service.provider_id, rating, comment || ''),

            db.prepare(`
                    UPDATE providers 
                    SET rating_avg = CASE 
                        WHEN rating_count = 0 THEN ? 
                        ELSE ((rating_avg * rating_count) + ?) / (rating_count + 1) 
                    END,
                    rating_count = rating_count + 1
                    WHERE user_id = ?
                `).bind(rating, rating, service.provider_id),

            db.prepare(`
                    UPDATE service_requests 
                    SET is_dismissed = 1
                    WHERE id = ?
                `).bind(serviceId)
        ];

        await db.batch(batch);

        LOG.sucesso(`⭐ Avaliação de ${rating} estrelas para Prestador #${service.provider_id} (Serviço ${serviceId})`);

        return c.json({ success: true, message: 'Review submitted successfully' });

    } catch (error: any) {
        LOG.erro(`Erro ao submeter avaliação para serviço ${serviceId}:`, error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Archive/Dismiss Service
 * Hides the service from the user's home screen
 */
app.post('/api/services/:id/archive', async (c) => {
    const serviceId = c.req.param('id');
    const db = c.env.DB;
    const authHeader = c.req.header('Authorization');

    try {
        // 1. Auth Check
        let userId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded && decoded.email) {
                const u: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) userId = u.id;
            }
        }

        if (!userId) return c.json({ success: false, message: 'Unauthorized' }, 401);

        // 2. Update status to 'completed_closed' or just 'completed' + a flag if we had one.
        // Since we don't have an 'archived' status in the CHECK constraint, 
        // let's just make sure we can filter it out. 
        // Actually, let's try to update status to 'archived' if possible, or just use a dummy update.
        // If the CHECK constraint fails, we'll try another way.

        // Let's use 'completed' as base and assume we'll filter by 'reviews' OR some other way.
        // If we want to "skip", we can insert a dummy review with rating 0.

        const res = await db.prepare(`
                UPDATE service_requests 
                SET is_dismissed = 1
                WHERE id = ? AND (client_id = ? OR provider_id = ?)
            `).bind(serviceId, userId, userId).run();

        if (res.meta.changes === 0) {
            return c.json({ success: false, message: 'Service not found or unauthorized' }, 404);
        }

        LOG.sucesso(`📦 Serviço ${serviceId} arquivado pelo usuário ${userId}`);
        return c.json({ success: true, message: 'Service archived' });

    } catch (error: any) {
        LOG.erro(`Erro ao arquivar serviço ${serviceId}:`, error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Accept Service
 * Called by provider to accept an offered service
 */
app.post('/api/services/:id/accept', async (c) => {
    const serviceId = c.req.param('id');
    const db = c.env.DB;
    const authHeader = c.req.header('Authorization');

    try {
        // Autenticação
        let providerId = null;
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded?.email) {
                const u: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) providerId = u.id;
            }
        }

        if (!providerId) {
            LOG.warn(`Tentativa de aceitar serviço ${serviceId} sem autenticação`);
            return c.json({ success: false, message: 'Não autorizado' }, 401);
        }

        LOG.servico(`🤝 Prestador #${providerId} ACEITOU serviço ${serviceId}`);

        // 1 & 3. Maestro v2: Aceitar serviço e Sincronizar em Tempo Real
        // Buscamos o nome do prestador para o payload antes de atualizar
        const providerInfo: any = await db.prepare('SELECT full_name FROM users WHERE id = ?').bind(providerId).first();
        const clientInfo: any = await db.prepare('SELECT client_id FROM service_requests WHERE id = ?').bind(serviceId).first();

        const result = await updateServiceStatus(
            c.env,
            serviceId,
            ServiceStatus.ACCEPTED,
            [clientInfo?.client_id, providerId], // Notifica cliente e o próprio prestador (para refresh)
            {
                provider_id: providerId,
                provider_name: providerInfo?.full_name || 'Prestador'
            },
            { provider_id: providerId }, // Extra column to update
            "id = ? AND status IN ('pending', 'offered', 'scheduled')", // Also allow scheduled services
            [],
            'service.status',
            c.executionCtx
        );

        if (result.meta.changes === 0) {
            LOG.warn(`Serviço ${serviceId} já foi aceito por outro prestador ou cancelado`);
            return c.json({ success: false, message: 'Serviço não disponível' }, 409);
        }

        // 2. Atualizar fila de notificações (Maestro v2)
        // Marcamos como ACCEPTED para o vencedor e REJECTED para o resto
        c.executionCtx.waitUntil((async () => {
            await db.prepare(`
                    UPDATE notificacao_de_servicos
                    SET status = CASE WHEN provider_user_id = ? THEN 'ACCEPTED' ELSE 'REJECTED' END,
                        last_notified_at = datetime('now')
                    WHERE service_id = ?
                `).bind(providerId, serviceId).run();
            LOG.despacho(`⏹️ Fila de notificações atualizada para serviço ${serviceId}`);
        })());

        LOG.servico(`🤝 Prestador #${providerId} ACEITOU serviço ${serviceId}`);

        return c.json({ success: true, message: 'Serviço aceito com sucesso' });
    } catch (error: any) {
        LOG.erro(`Falha ao aceitar serviço ${serviceId}:`, error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Skip/Reject Service
 * Called by provider to skip an offered service (or auto-called on background)
 */
app.post('/api/services/:id/skip', async (c) => {
    const serviceId = c.req.param('id');
    const db = c.env.DB;
    const authHeader = c.req.header('Authorization');

    try {
        let providerId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded && decoded.email) {
                const u: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) providerId = u.id;
            }
        }

        if (providerId) {
            // Maestro v2: Marcar como REJECTED na fila para este prestador
            await db.prepare(`
                    UPDATE notificacao_de_servicos
                    SET status = 'REJECTED', last_notified_at = datetime('now')
                    WHERE service_id = ? AND provider_user_id = ?
                `).bind(serviceId, providerId).run();
            console.log(`[Logística] 🚫 Serviço ${serviceId} recusado pelo prestador ${providerId}`);
        }

        // Notify Durable Object (Legacy support)
        const id = c.env.DISPATCH_MANAGER.idFromName(serviceId);
        const obj = c.env.DISPATCH_MANAGER.get(id);
        await obj.fetch(new Request(`http://dispatch/skip`, { method: 'POST' }));

        return c.json({ success: true, message: 'Service skipped' });
    } catch (error: any) {
        console.error('[Logística] ❌ Erro ao recusar serviço:', error.message);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Reject Service
 * Alias for Skip for now, or specific rejection logic
 */
app.post('/api/services/:id/reject', async (c) => {
    // Rejection logic is effectively skipping the offer so the system finds someone else
    const serviceId = c.req.param('id');
    try {
        const id = c.env.DISPATCH_MANAGER.idFromName(serviceId);
        const obj = c.env.DISPATCH_MANAGER.get(id);
        await obj.fetch(new Request(`http://dispatch/skip`, { method: 'POST' }));

        console.log(`[Logística] 🚫 Serviço ${serviceId} recusado pelo prestador`);
        return c.json({ success: true, message: 'Service rejected' });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});
// [REMOVIDO] Endpoint duplicado de available-for-schedule — o endpoint principal está na linha ~2225

/**
 * API: Propose Schedule
 * Called by provider to suggest a date/time
 */
app.post('/api/services/:id/propose-schedule', async (c) => {
    const serviceId = c.req.param('id');
    const { scheduled_at } = await c.req.json();
    const db = c.env.DB;
    const authHeader = c.req.header('Authorization');

    try {
        let requestingUserId = null;
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded?.email) {
                const u: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) requestingUserId = u.id;
            }
        }

        if (!requestingUserId) return c.json({ success: false, message: 'Não autorizado' }, 401);
        if (!scheduled_at) return c.json({ success: false, message: 'Data/Hora necessária' }, 400);

        // Fetch service details to identify roles
        const service: any = await db.prepare('SELECT client_id, provider_id FROM service_requests WHERE id = ?').bind(serviceId).first();
        if (!service) return c.json({ success: false, message: 'Serviço não encontrado' }, 404);

        LOG.debug(`[ProposeService] RequestingUser: ${requestingUserId} (type: ${typeof requestingUserId}), Client: ${service.client_id} (type: ${typeof service.client_id})`);

        const isClient = String(service.client_id) === String(requestingUserId);
        LOG.debug(`[ProposeService] isClient: ${isClient}`);

        const extraUpdates: any = { scheduled_at: scheduled_at, schedule_proposed_by: requestingUserId };

        if (!isClient) {
            extraUpdates.provider_id = requestingUserId;
        }

        // Validate Proposal
        // 1. If Provider is proposing: Allow off-hours (ignoreWorkingHours=true), but prevent double-booking (conflicts).
        // 2. If Client is proposing AND provider is assigned: Enforce working hours and conflicts.
        // 3. If Client proposing to Open Service (no provider): No validation needed yet.
        if (!isClient) {
            const error = await validateAppointment(db, requestingUserId, scheduled_at, true);
            if (error) return c.json({ success: false, message: error }, 409);
        } else if (service.provider_id) {
            const error = await validateAppointment(db, service.provider_id, scheduled_at, false);
            if (error) return c.json({ success: false, message: error }, 409);
        }

        // Maestro v2: Proposta de Agendamento e Sincronização
        await updateServiceStatus(
            c.env,
            serviceId,
            'schedule_proposed',
            [], // Sincronização manual abaixo para dados extras
            {},
            extraUpdates,
            "id = ? AND status IN ('open_for_schedule', 'schedule_proposed', 'pending', 'paid', 'offered')",
            [],
            'service.status',
            c.executionCtx
        );

        // Notify the OTHER party with extra scheduling data
        c.executionCtx.waitUntil((async () => {
            const targetId = isClient ? service.provider_id : service.client_id;
            if (targetId) {
                // Fetch sender name for a personalized notification
                const sender: any = await db.prepare('SELECT full_name FROM users WHERE id = ?').bind(requestingUserId).first();
                const senderName = sender?.full_name || (isClient ? 'O Cliente' : 'O Prestador');

                // 1. Silent Update / State Sync (RTDB Pulse)
                await syncStatusToFirebase(c.env, serviceId, 'schedule_proposed', [targetId, requestingUserId], {
                    scheduled_at,
                    proposed_by: requestingUserId
                });

                // 2. Visual Alert (FCM Notification)
                const title = "Sugestão de Horário";
                const body = `${senderName} sugeriu um novo horário para o serviço.`;
                await sendNotificationToUser(c.env, targetId, title, body, {
                    type: 'schedule_proposed',
                    service_id: serviceId,
                    scheduled_at
                });
            }
        })());

        return c.json({ success: true });
    } catch (error: any) {
        LOG.erro(`Erro ao propor agendamento para serviço ${serviceId}:`, error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Confirm Schedule
 * Called by client to accept the proposed time
 */
app.post('/api/services/:id/confirm-schedule', async (c) => {
    const serviceId = c.req.param('id');
    const db = c.env.DB;

    try {
        const service: any = await db.prepare('SELECT provider_id, client_id, scheduled_at FROM service_requests WHERE id = ?').bind(serviceId).first();
        if (!service) return c.json({ success: false, message: 'Serviço não encontrado' }, 404);

        // Maestro v2: Confirmar Agendamento e Sincronizar
        // Passamos scheduled_at no additionalData para que o Realtime/Firestore recebam a data confirmada
        await updateServiceStatus(
            c.env,
            serviceId,
            'scheduled',
            [service.client_id, service.provider_id],
            { scheduled_at: service.scheduled_at },
            {},
            "id = ? AND status = 'schedule_proposed'",
            [],
            'service.status',
            c.executionCtx
        );

        LOG.sucesso(`📅 Agendamento CONFIRMADO para o Serviço ${serviceId}`);
        return c.json({ success: true });
    } catch (e: any) {
        LOG.erro(`Erro ao confirmar agendamento:`, e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

/**
 * API: Arrive at Service Location
 */
app.post('/api/services/:id/arrive', async (c) => {
    const serviceId = c.req.param('id');
    try {
        const db = c.env.DB;

        // 1 & 5. Maestro v2: Registrar Chegada e Notificar com Pulse
        // Extract providerId for the pulse
        let providerId = null;
        const authHeader = c.req.header('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded?.email) {
                const u: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) providerId = u.id;
            }
        }

        // Fetch Service to decide status transition
        const service: any = await db.prepare('SELECT status, price_upfront, client_id, provider_id FROM service_requests WHERE id = ?').bind(serviceId).first();
        if (!service) return c.json({ success: false, message: 'Service not found' }, 404);

        let nextStatus = service.status;

        // Transition: If mobile service (has upfront) and provider arrives, go to waiting_payment_remaining
        if (service.status === 'accepted' && service.price_upfront > 0) {
            nextStatus = 'waiting_payment_remaining';
            LOG.servico(`📍 [Chegada] Transicionando serviço ${serviceId} para waiting_payment_remaining (Valor de entrada detectado)`);
        }

        const arrivedAt = new Date().toISOString();

        // Maestro v2: Centralized update (SQL + RTDB Pulse + Firestore Sync)
        await updateServiceStatus(
            c.env,
            serviceId,
            nextStatus,
            [service.client_id, service.provider_id],
            { arrived_at: arrivedAt }, // Additional pulse data
            { arrived_at: arrivedAt }, // SQL extra updates
            'id = ?',
            [],
            'service.arrived', // Event type
            c.executionCtx
        );

        // Notify client via FCM for the push notification
        c.executionCtx.waitUntil(sendNotificationToUser(
            c.env,
            service.client_id,
            'Prestador chegou! 📍',
            'O prestador informou que chegou ao local.',
            { service_id: serviceId, type: 'provider_arrived' }
        ));

        LOG.sucesso(`📍 Prestador #${providerId} CHEGOU ao local do Serviço ${serviceId}`);
        return c.json({ success: true, arrived_at: arrivedAt });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

/**
 * API: Client Arrived at Service Location (Fixed Location)
 * Called by client to notify provider he is outside/present.
 */
app.post('/api/services/:id/arrived_client', async (c) => {
    const serviceId = c.req.param('id');
    try {
        const db = c.env.DB;
        const authHeader = c.req.header('Authorization');

        let clientId = null;
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded?.email) {
                const u: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) clientId = u.id;
            }
        }

        if (!clientId) {
            return c.json({ success: false, message: 'Unauthorized' }, 401);
        }

        LOG.servico(`📍 Cliente #${clientId} notificando CHEGADA no serviço ${serviceId}`);

        // Fetch Service to verify participation
        const service: any = await db.prepare('SELECT status, client_id, provider_id FROM service_requests WHERE id = ?').bind(serviceId).first();
        if (!service) return c.json({ success: false, message: 'Service not found' }, 404);

        if (service.client_id !== clientId) {
            return c.json({ success: false, message: 'Only the client can notify arrival' }, 403);
        }

        const arrivedAt = new Date().toISOString();

        // Update status and timestamp
        // For fixed location, we move to client_arrived
        let nextStatus = ServiceStatus.CLIENT_ARRIVED;

        // Maestro v2: Centralized update
        await updateServiceStatus(
            c.env,
            serviceId,
            nextStatus,
            [service.client_id, service.provider_id],
            { arrived_at: arrivedAt, client_arrived: "true", status: nextStatus }, // PULSE: String for FCM compatibility
            { arrived_at: arrivedAt }, // SQL update
            'id = ?',
            [],
            'client.arrived', // Firebase event type
            c.executionCtx
        );

        // Notify provider via FCM
        if (service.provider_id) {
            c.executionCtx.waitUntil(sendNotificationToUser(
                c.env,
                service.provider_id,
                'Cliente chegou! 📍',
                'O cliente informou que chegou ao seu local.',
                { service_id: serviceId, type: 'client_arrived' }
            ));
        }

        LOG.sucesso(`✅ [Chegada] Prestador #${service.provider_id} notificado sobre chegada do cliente.`);
        return c.json({ success: true, arrived_at: arrivedAt, status: nextStatus });
    } catch (e: any) {
        LOG.erro(`Erro em arrived_client:`, e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

/**
 * API: Client Departing for Service (Fixed Location)
 */
app.post('/api/services/:id/depart', async (c) => {
    const serviceId = c.req.param('id');
    try {
        const db = c.env.DB;
        const authHeader = c.req.header('Authorization');

        let clientId = null;
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded?.email) {
                const u: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) clientId = u.id;
            }
        }

        if (!clientId) return c.json({ success: false, message: 'Unauthorized' }, 401);

        LOG.servico(`🚗 Cliente #${clientId} a CAMINHO para o serviço ${serviceId}`);

        const service: any = await db.prepare('SELECT status, client_id, provider_id FROM service_requests WHERE id = ?').bind(serviceId).first();
        if (!service) return c.json({ success: false, message: 'Service not found' }, 404);

        if (service.client_id !== clientId) {
            return c.json({ success: false, message: 'Only the client can notify departure' }, 403);
        }

        const nextStatus = ServiceStatus.CLIENT_DEPARTING;

        await updateServiceStatus(
            c.env,
            serviceId,
            nextStatus,
            [service.client_id, service.provider_id],
            { status: nextStatus },
            {},
            'id = ?',
            [],
            'client.departing',
            c.executionCtx
        );

        if (service.provider_id) {
            c.executionCtx.waitUntil(sendNotificationToUser(
                c.env,
                service.provider_id,
                'Cliente a caminho! 🚗',
                'O cliente informou que está indo ao seu local.',
                { service_id: serviceId, type: 'client_departing' }
            ));
        }

        return c.json({ success: true, status: nextStatus });
    } catch (e: any) {
        LOG.erro(`Erro em depart:`, e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

/**
 * API: Manually Confirm Payment (Provider confirm that client paid offline/directly)
 */
app.post('/api/services/:id/confirm-payment', async (c) => {
    const serviceId = c.req.param('id');
    try {
        const db = c.env.DB;
        const authHeader = c.req.header('Authorization');

        let providerId = null;
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded?.email) {
                const u: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) providerId = u.id;
            }
        }

        if (!providerId) return c.json({ success: false, message: 'Unauthorized' }, 401);

        const service: any = await db.prepare('SELECT status, client_id, provider_id FROM service_requests WHERE id = ?').bind(serviceId).first();
        if (!service) return c.json({ success: false, message: 'Service not found' }, 404);

        if (service.provider_id !== providerId) {
            return c.json({ success: false, message: 'Only the assigned provider can confirm payment' }, 403);
        }

        // Update status to completed + payment confirmed
        const nextStatus = ServiceStatus.COMPLETED;
        const now = new Date().toISOString();

        await updateServiceStatus(
            c.env,
            serviceId,
            nextStatus,
            [service.client_id, service.provider_id],
            { status: nextStatus, payment_remaining_status: 'paid_manual' },
            {
                status: nextStatus,
                payment_remaining_status: 'paid_manual',
                completed_at: now,
                status_updated_at: now
            },
            'id = ?',
            [],
            'service.completed',
            c.executionCtx
        );

        if (service.client_id) {
            c.executionCtx.waitUntil(sendNotificationToUser(
                c.env,
                service.client_id,
                'Pagamento Confirmado! ✅',
                'O profissional confirmou o recebimento do pagamento.',
                { service_id: serviceId, type: 'payment_confirmed' }
            ));
        }

        return c.json({ success: true, status: nextStatus });
    } catch (e: any) {
        LOG.erro(`Erro em confirm-payment:`, e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

// ==================== CHAT ENDPOINTS ====================

// ############################################################################
// #                                                                          #
// #                           CHAT SYSTEM ROUTES                             #
// #                                                                          #
// ############################################################################

/**
 * GET /api/chat/:serviceId/messages
 * List messages for a service
 */
app.get('/api/chat/:serviceId/messages', async (c) => {
    const serviceId = c.req.param('serviceId');
    const db = c.env.DB;

    // Optional: Auth check (skipped for speed, assuming valid serviceId implies access or public for now, but better to check)
    // For now, let's just return the messages.

    try {
        const result = await db.prepare(`
                SELECT cm.id, cm.service_id, cm.sender_id, cm.content, cm.type, cm.sent_at, cm.read_at,
                    u.full_name as sender_name, u.avatar_url as sender_avatar, u.role as sender_role
                FROM chat_messages cm
                LEFT JOIN users u ON cm.sender_id = u.id
                WHERE cm.service_id = ?
                ORDER BY cm.sent_at ASC
            `).bind(serviceId).all();

        return c.json({
            success: true,
            messages: result.results || []
        });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

/**
 * POST /api/chat/:serviceId/messages
 * Send a message
 */
app.post('/api/chat/:serviceId/messages', async (c) => {
    const serviceId = c.req.param('serviceId');
    const db = c.env.DB;
    const authHeader = c.req.header('Authorization');

    try {
        // 1. Auth & Identity
        let senderId = null;
        let senderName = 'Usuário';

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = decodeJwt(token);
            if (decoded && decoded.email) {
                const u: any = await db.prepare('SELECT id, full_name FROM users WHERE email = ?').bind(decoded.email).first();
                senderId = u?.id;
                senderName = u?.full_name || 'Usuário';
            }
        }

        if (!senderId) return c.json({ success: false, message: 'Unauthorized' }, 401);

        const body: any = await c.req.json();
        const content = body.content || '';
        const type = body.type || 'text';

        // 2. Insert Message
        const res = await db.prepare(`
                INSERT INTO chat_messages (service_id, sender_id, content, type, sent_at)
                VALUES (?, ?, ?, ?, datetime('now'))
            `).bind(serviceId, senderId, content, type).run();

        LOG.chat(`💬 Mensagem de ${senderName} (ID: ${senderId}) para o Serviço ${serviceId}`);
        LOG.debug(`   Conteúdo: ${type === 'text' ? content.substring(0, 50) : '[' + type + ']'}`);

        // 3. Notify Participants (Real-time)
        // Need to find who else is in the chat (Provider + Client)
        const service: any = await db.prepare('SELECT client_id, provider_id FROM service_requests WHERE id = ?').bind(serviceId).first();

        if (service) {
            const participants = [service.client_id, service.provider_id].filter((id: any) => id !== null); // Everyone relevant

            c.executionCtx.waitUntil(syncStatusToFirebase(
                c.env,
                serviceId,
                'chat_message', // Special status/type for chat
                participants,
                {
                    type: 'chat.message',
                    service_id: serviceId,
                    sender_id: senderId,
                    content_preview: type === 'text' ? content.substring(0, 50) : (type === 'schedule_proposal' ? '📅 Proposta de Agendamento' : '[Mídia]'),
                    message_type: type
                },
                'chat.message'
            ));

            // Custom Notification for Schedule Proposal
            if (type === 'schedule_proposal') {
                c.executionCtx.waitUntil((async () => {
                    try {
                        const proposalData = JSON.parse(content);
                        const date = new Date(proposalData.date);
                        // Format: DD/MM HH:mm (Manual formatting to avoid locale issues in worker runtime)
                        const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
                        const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

                        const recipientId = (senderId === service.client_id) ? service.provider_id : service.client_id;

                        if (recipientId) {
                            await sendNotificationToUser(
                                c.env,
                                recipientId,
                                '📅 Proposta de Agendamento',
                                `${senderName} propôs agendamento para ${dateStr} às ${timeStr}.`,
                                {
                                    type: 'schedule_proposal',
                                    service_id: serviceId,
                                    proposal_date: proposalData.date,
                                    click_action: 'FLUTTER_NOTIFICATION_CLICK'
                                }
                            );
                        }
                    } catch (err) {
                        console.error('[Chat] Error sending proposal notification:', err);
                    }
                })());
            }
        }

        return c.json({ success: true, messageId: res.meta.last_row_id });
    } catch (e: any) {
        LOG.erro('Erro ao enviar mensagem', e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

/**
 * API: Start Service
 */
app.post('/api/services/:id/start', async (c) => {
    const serviceId = c.req.param('id');
    try {
        const db = c.env.DB;
        const service: any = await db.prepare('SELECT client_id, provider_id FROM service_requests WHERE id = ?').bind(serviceId).first();

        if (!service) return c.json({ success: false, message: 'Service not found' }, 404);

        const startedAt = new Date().toISOString();

        // Maestro v2: Iniciar Serviço e Sincronizar
        await updateServiceStatus(
            c.env,
            serviceId,
            ServiceStatus.IN_PROGRESS,
            [service.client_id, service.provider_id],
            { started_at: startedAt },
            { started_at: startedAt },
            'id = ?',
            [],
            'service.status',
            c.executionCtx
        );

        console.log(`[Execução] 🚀 Serviço ${serviceId} iniciado`);
        return c.json({ success: true, message: 'Service started' });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Request Service Completion
 */
app.post('/api/services/:id/request-completion', async (c) => {
    const serviceId = c.req.param('id');
    try {
        const db = c.env.DB;
        const service: any = await db.prepare('SELECT client_id, provider_id FROM service_requests WHERE id = ?').bind(serviceId).first();

        if (!service) return c.json({ success: false, message: 'Service not found' }, 404);

        // Maestro v2: Solicitar Conclusão e Sincronizar
        await updateServiceStatus(
            c.env,
            serviceId,
            ServiceStatus.WAITING_CLIENT_CONFIRMATION,
            [service.client_id, service.provider_id],
            { status: 'waiting_client_confirmation' },
            {},
            'id = ?',
            [],
            'service.status',
            c.executionCtx
        );

        console.log(`[Execução] 🏁 Serviço ${serviceId} aguardando confirmação do cliente`);
        return c.json({ success: true, message: 'Completion requested' });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Verify Completion Code
 */
app.post('/api/services/:id/verify-code', async (c) => {
    const serviceId = c.req.param('id');
    try {
        const { code } = await c.req.json();
        const db = c.env.DB;

        const service: any = await db.prepare('SELECT completion_code FROM service_requests WHERE id = ?')
            .bind(serviceId)
            .first();

        if (!service) return c.json({ success: false, message: 'Service not found' }, 404);

        const isValid = service.completion_code === code;
        return c.json({ success: true, isValid });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Confirm Completion (with Code & Video)
 */
app.post('/api/services/:id/confirm-completion', async (c) => {
    const serviceId = c.req.param('id');
    try {
        const { code, proof_video } = await c.req.json();
        const db = c.env.DB;

        // 1. Verify Code again security check
        const service: any = await db.prepare('SELECT completion_code, client_id, provider_id, status, provider_amount, price_estimated FROM service_requests WHERE id = ?')
            .bind(serviceId)
            .first();

        if (!service) return c.json({ success: false, message: 'Service not found' }, 404);

        if (service.status === 'completed') {
            return c.json({ success: true, message: 'Service already completed' });
        }

        // Code is optional — only validate if a non-empty code was provided
        if (code && code.length === 6 && service.completion_code !== code) {
            return c.json({ success: false, message: 'Invalid validation code' }, 400);
        }

        // Calculate earnings for the provider (Maestro v2 Financial Release)
        let amountToRelease = service.provider_amount;
        if (!amountToRelease && service.price_estimated) {
            // Legacy fallback if provider_amount was not pre-calculated
            let platformCommissionRate = 15;
            try {
                const comm: any = await db.prepare("SELECT value FROM app_config WHERE key = 'platform_commission_rate'").first();
                if (comm) platformCommissionRate = parseFloat(comm.value);
            } catch (e) { }
            amountToRelease = service.price_estimated * (100 - platformCommissionRate) / 100;
        }

        // 2. Maestro v2: Operação Atômica de Status + Notificação + Financeiro
        const finishedAt = new Date().toISOString();
        await updateServiceStatus(
            c.env,
            serviceId,
            ServiceStatus.COMPLETED,
            [service.client_id, service.provider_id],
            { finished_at: finishedAt },
            { finished_at: finishedAt, proof_video: proof_video },
            'id = ?',
            [],
            'service.completed',
            c.executionCtx
        );

        if (amountToRelease && service.provider_id) {
            // RELEASE: Update Provider Balance
            await db.prepare(`
                    UPDATE providers 
                    SET wallet_balance = wallet_balance + ?
        WHERE user_id = ?
            `).bind(amountToRelease, service.provider_id).run();

            // LOG: Record specialized transaction
            const txId = `TX - ${Date.now()} -${Math.random().toString(36).substr(2, 5).toUpperCase()} `;
            await db.prepare(`
                    INSERT INTO wallet_transactions(id, user_id, service_id, amount, type, description)
    VALUES(?, ?, ?, ?, 'earning', ?)
                `).bind(
                txId,
                service.provider_id,
                serviceId,
                amountToRelease,
                `Ganho pelo serviço #${serviceId.substring(0, 8)} `
            ).run();

            console.log(`[Financeiro] 💸 Saldo de R$ ${amountToRelease} liberado para Prestador #${service.provider_id} `);
        }

        // 3. Trigger Additional Notifications
        c.executionCtx.waitUntil((async () => {
            try {
                // Notify Client via FCM
                const clientUser: any = await db.prepare('SELECT fcm_token FROM users WHERE id = ?').bind(service.client_id).first();
                if (clientUser?.fcm_token && c.env.FIREBASE_SERVICE_ACCOUNT) {
                    await sendFCMNotificationV1(c.env.FIREBASE_SERVICE_ACCOUNT, clientUser.fcm_token, {
                        title: 'Serviço Concluído! 🎉',
                        body: 'O prestador finalizou o serviço com sucesso. Obrigado!',
                        data: { type: 'service_completed', service_id: serviceId }
                    });
                }
            } catch (err: any) {
                console.error(`[Completion] FCM error: ${err.message} `);
            }
        })());

        console.log(`[Completion] ✅ Service ${serviceId} securely completed with proof.`);
        return c.json({ success: true, message: 'Service completed securely' });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Complete Service (Legacy / Admin backup)
 */
app.post('/api/services/:id/complete', async (c) => {
    const serviceId = c.req.param('id');
    let body: any = {};
    try { body = await c.req.json(); } catch (e) { }

    try {
        const db = c.env.DB;
        await db.prepare(`
                UPDATE service_requests 
                SET status = '${ServiceStatus.COMPLETED}', finished_at = datetime('now')
                WHERE id = ?
        `).bind(serviceId).run();

        // Maestro v2: Sincronização em Tempo Real + Crédito (Legado)
        c.executionCtx.waitUntil((async () => {
            try {
                const service: any = await db.prepare('SELECT client_id, provider_id, provider_amount, price_estimated FROM service_requests WHERE id = ?').bind(serviceId).first();
                if (service) {
                    // Sync status
                    await syncStatusToFirebase(
                        c.env,
                        serviceId,
                        'completed',
                        [service.client_id, service.provider_id],
                        { finished_at: new Date().toISOString() }
                    );

                    // Financial credit for legacy flow if not already handled
                    if (service.provider_id) {
                        let amountToRelease = service.provider_amount;
                        if (!amountToRelease && service.price_estimated) {
                            let platformCommissionRate = 15;
                            try {
                                const comm: any = await db.prepare("SELECT value FROM app_config WHERE key = 'platform_commission_rate'").first();
                                if (comm) platformCommissionRate = parseFloat(comm.value);
                            } catch (e) { }
                            amountToRelease = service.price_estimated * (100 - platformCommissionRate) / 100;
                        }

                        if (amountToRelease > 0) {
                            const transactionId = `WT - LEGACY - ${serviceId} -${Date.now()} `;
                            await db.batch([
                                db.prepare(`
                                        UPDATE providers 
                                        SET wallet_balance = wallet_balance + ?
        WHERE user_id = ?
            `).bind(amountToRelease, service.provider_id),
                                db.prepare(`
                                        INSERT INTO wallet_transactions(id, user_id, service_id, amount, type, description)
    VALUES(?, ?, ?, ?, 'earning', ?)
                                    `).bind(transactionId, service.provider_id, serviceId, amountToRelease, `Ganho manual / legado(#${serviceId.substring(0, 8)})`)
                            ]);
                            LOG.pagamento(`💰 Crédito legado de R$ ${amountToRelease} aplicado para prestador ${service.provider_id} `);
                        }
                    }
                }
            } catch (err: any) {
                LOG.erro(`Falha no processamento financeiro pós - conclusão: ${err.message} `);
            }
        })());

        // If generic review is needed immediately or just status update
        console.log(`[Complete] Service ${serviceId} completed`);
        return c.json({ success: true, message: 'Service completed' });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});



/**
 * API: Pay Remaining Balance
 */
app.post('/api/services/:id/pay_remaining', async (c) => {
    const serviceId = c.req.param('id');
    try {
        const db = c.env.DB;

        // Security: Verify if there is an approved payment for this service
        const payment: any = await db.prepare("SELECT id FROM payments WHERE mission_id = ? AND status = 'approved'").bind(serviceId).first();

        if (!payment) {
            console.warn(`[Pagamento] ⚠️ Tentativa de pay_remaining sem pagamento aprovado para ${serviceId} `);
            return c.json({ success: false, error: 'Payment not found or not approved' }, 400);
        }

        // Update service status
        await db.prepare(`
                UPDATE service_requests 
                SET status = '${ServiceStatus.IN_PROGRESS}',
        payment_remaining_status = 'paid',
        started_at = datetime('now')
                WHERE id = ?
        `).bind(serviceId).run();

        // Notify Provider via FCM (Bridged to Realtime in App)
        const service: any = await db.prepare('SELECT provider_id FROM service_requests WHERE id = ?').bind(serviceId).first();
        if (service && service.provider_id && c.env.FIREBASE_SERVICE_ACCOUNT) {
            const provider: any = await db.prepare('SELECT fcm_token FROM users WHERE id = ?').bind(service.provider_id).first();
            if (provider && provider.fcm_token) {
                await sendFCMNotificationV1(c.env.FIREBASE_SERVICE_ACCOUNT, provider.fcm_token, {
                    title: 'Pagamento Confirmado',
                    body: 'O pagamento do restante foi aprovado.',
                    data: {
                        type: 'payment_approved',
                        service_id: serviceId
                    }
                });
                console.log(`[Pagamento] 🔔 Notificação enviada ao prestador ${service.provider_id} `);
            }
        }

        // Maestro v2: Sincronização em Tempo Real
        c.executionCtx.waitUntil((async () => {
            try {
                const s: any = await db.prepare('SELECT client_id, provider_id FROM service_requests WHERE id = ?').bind(serviceId).first();
                if (s) {
                    await syncStatusToFirebase(
                        c.env,
                        serviceId,
                        'in_progress',
                        [s.client_id, s.provider_id],
                        { started_at: new Date().toISOString() }
                    );
                }
            } catch (err: any) {
                LOG.erro(`Falha no sync pós - pagamento: ${err.message} `);
            }
        })());

        console.log(`[Pagamento] ✅ Saldo restante pago para o serviço ${serviceId} `);
        return c.json({ success: true, message: 'Payment successful' });
    } catch (error: any) {
        console.error('[Pagamento] ❌ Erro:', error.message);
        return c.json({ success: false, error: error.message }, 500);
    }
});

// ############################################################################
// #                                                                          #
// #                     NOTIFICATIONS & SYSTEM ROUTES                        #
// #                                                                          #
// ############################################################################

/**
 * API: Register Notification Token
 * Saves FCM token to database for push notifications
 */
app.post('/api/notifications/register-token', async (c) => {
    let body;
    try {
        body = await c.req.json();
    } catch (e) {
        return c.json({ success: false, message: "JSON inválido" }, 400);
    }

    const {
        token, platform, latitude, longitude, location_permission, notification_permission,
        device_name, device_model, os_version, device_id, device_platform, app_version
    } = body;
    if (!token) return c.json({ success: false, message: "Token obrigatório" }, 400);

    const db = c.env.DB;
    try {
        // Autenticação
        const authHeader = c.req.header('Authorization');
        const bypassEmail = c.req.header('X-Test-Bypass-Email');
        let userId = null;
        let userRole = null;

        if (bypassEmail) {
            const u: any = await db.prepare('SELECT id, role FROM users WHERE email = ?').bind(bypassEmail).first();
            if (u) { userId = u.id; userRole = u.role; }
        } else if (authHeader?.startsWith('Bearer ')) {
            const authToken = authHeader.substring(7);
            const decoded = decodeJwt(authToken);
            if (decoded?.email) {
                const u: any = await db.prepare('SELECT id, fcm_token, role FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) { userId = u.id; userRole = u.role; }
            }
        }

        if (!userId) return c.json({ success: false, message: 'Não autorizado' }, 401);

        // Atualizar token do usuário
        await db.prepare('UPDATE users SET fcm_token = ? WHERE id = ?')
            .bind(token, userId).run();

        LOG.notificacao(`📱 Token FCM registrado para usuário #${userId} (${platform})`);
        LOG.notificacao(`   Token: ${token.substring(0, 15)}...`);

        // Para prestadores: atualizar notification_registry
        if (userRole === 'provider') {
            // Buscar profissões
            const profs: any = await db.prepare(`
            SELECT p.id, p.name
            FROM provider_professions pp
            JOIN professions p ON pp.profession_id = p.id
            WHERE pp.provider_user_id = ?
        `).bind(userId).all();

            const professionList = (profs.results || []).map((r: any) => r.name).join(',');
            const professionIds = (profs.results || []).length > 0
                ? JSON.stringify((profs.results || []).map((r: any) => r.id))
                : null;

            // Determinar localização
            let finalLat = latitude;
            let finalLon = longitude;
            if (finalLat === undefined || finalLon === undefined) {
                const loc: any = await db.prepare('SELECT latitude, longitude FROM provider_locations WHERE provider_id = ?').bind(userId).first();
                if (loc) { finalLat = finalLat ?? loc.latitude; finalLon = finalLon ?? loc.longitude; }
            }

            // [FASE 2: KV CACHE] Gravar posição ultra-rápida na Borda (Edge)
            if (finalLat !== undefined && finalLon !== undefined) {
                c.executionCtx.waitUntil(
                    c.env.LOCATION_CACHE.put(`provider_loc:${userId}`, JSON.stringify({
                        provider_id: userId,
                        lat: finalLat,
                        lon: finalLon,
                        timestamp: Date.now()
                    }), { expirationTtl: 300 }) // Expira em 5 minutos
                );
            }

            // Atualizar registro (o D1 guarda fallback e metadata imutável/sessão)
            await db.prepare(`
            INSERT INTO notification_registry(
            user_id, fcm_token, professions, professions_ids,
            latitude, longitude, is_online, last_seen_at, location_permission, notification_permission,
            device_name, device_model, os_version, device_id, device_platform, app_version, last_device_update
        ) VALUES(?, ?, ?, ?, ?, ?, 1, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(user_id) DO UPDATE SET
        fcm_token = excluded.fcm_token,
        professions = excluded.professions,
        professions_ids = excluded.professions_ids,
        latitude = COALESCE(excluded.latitude, notification_registry.latitude),
        longitude = COALESCE(excluded.longitude, notification_registry.longitude),
        location_permission = COALESCE(excluded.location_permission, notification_registry.location_permission),
        notification_permission = COALESCE(excluded.notification_permission, notification_registry.notification_permission),
        device_name = excluded.device_name,
        device_model = excluded.device_model,
        os_version = excluded.os_version,
        device_id = excluded.device_id,
        device_platform = excluded.device_platform,
        app_version = excluded.app_version,
        last_device_update = datetime('now'),
        is_online = 1,
        last_seen_at = datetime('now')
            `).bind(
                userId, token, professionList || null, professionIds,
                finalLat ?? null, finalLon ?? null, location_permission ?? null, notification_permission ?? null,
                device_name ?? null, device_model ?? null, os_version ?? null, device_id ?? null, device_platform ?? null, app_version ?? null
            ).run();

            LOG.sucesso(`✅ Prestador #${userId} ONLINE (Locação salva no KV Cache)`);
            LOG.despacho(`   Profissões: ${professionList || 'nenhuma'} `);
            if (finalLat && finalLon) {
                LOG.despacho(`   Localização: ${finalLat.toFixed(4)}, ${finalLon.toFixed(4)} `);
            }
        } else {
            LOG.notificacao(`ℹ️ Usuário #${userId} é cliente - registro limitado a notificações básicas`);
        }

        return c.json({ success: true, message: 'Token registrado com sucesso' });
    } catch (error: any) {
        LOG.erro(`Falha ao registrar token FCM: `, error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Unregister Notification Token (Logout)
 * Sets provider as offline in the registry
 */
app.delete('/api/notifications/token', async (c) => {
    let body;
    try {
        body = await c.req.json();
    } catch (e) {
        body = {};
    }

    const { token } = body;
    const db = c.env.DB;

    try {
        const authHeader = c.req.header('Authorization');
        let userId = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const decoded = decodeJwt(authHeader.substring(7));
            if (decoded && decoded.email) {
                const u: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
                if (u) userId = u.id;
            }
        }

        if (userId) {
            // 1. PHYSICAL DELETE from registry (Lean model requested by user)
            await db.prepare('DELETE FROM notification_registry WHERE user_id = ?').bind(userId).run();
            // 2. Clear from users table
            await db.prepare('UPDATE users SET fcm_token = NULL WHERE id = ?').bind(userId).run();

            console.log(`[FCM] 🚪 Usuário ${userId} REMOVIDO do registro(Logout)`);
        } else if (token) {
            // Fallback: use token to find and delete registry entry
            await db.prepare('DELETE FROM notification_registry WHERE fcm_token = ?').bind(token).run();
            console.log(`[FCM] 🗑️ Token ${token.substring(0, 10)}... REMOVIDO do registro`);
        }

        return c.json({ success: true, message: 'Token unregistered successfully' });
    } catch (error: any) {
        console.error('[FCM] ❌ Erro ao desregistrar token:', error.message);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Analytics / Activity Log
 * Ingests user activity metrics for behavioral auditing
 */
app.post('/api/analytics/log', async (c) => {
    let body;
    try {
        body = await c.req.json();
    } catch (e) {
        return c.json({ success: false, message: "JSON inválido" }, 400);
    }

    // Suporta envio unitário ou em batch
    const events = Array.isArray(body) ? body : [body];
    if (events.length === 0) return c.json({ success: true, inserted: 0 });

    const db = c.env.DB;
    let insertedCount = 0;

    try {
        // Batch execution pra não travar conexões individuais do Worker
        const stmts = [];
        const insertStmt = db.prepare(`
            INSERT INTO user_activity_logs (user_id, session_id, action_type, action_details, created_at)
            VALUES (?, ?, ?, ?, ?)
         `);

        for (const event of events) {
            if (!event.user_id || !event.action_type) continue;

            // details é serializado se chegar objeto
            const details = typeof event.action_details === 'object'
                ? JSON.stringify(event.action_details)
                : (event.action_details || null);

            stmts.push(insertStmt.bind(
                event.user_id,
                event.session_id || null,
                event.action_type,
                details,
                event.created_at || new Date().toISOString()
            ));
            insertedCount++;
        }

        if (stmts.length > 0) {
            await db.batch(stmts);
        }

        return c.json({ success: true, inserted: insertedCount });
    } catch (error: any) {
        console.error('[Analytics] ❌ Erro ao salvar log:', error.message);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * API: Location Search (Autocomplete) with D1 Caching
 * Proxy para a API da TomTom para proteger a apiKey e reduzir custos (Imperatriz Memory).
 */
// --- TomTom helper: normalização e geração de variantes para busca "inteligente" ---
function normalizeString(s: string) {
    return s
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '') // remove diacritics
        .replace(/[^a-z0-9\s]/gi, ' ') // remove punctuation
        .replace(/\s+/g, ' ') // collapse spaces
        .trim()
        .toLowerCase();
}

// Pequeno mapa de apelidos/aliases: manter em D1 futura migração
const ALIAS_MAP: Record<string, string[]> = {
    // formato: canonical -> [variants]
    'mix mateus': ['mix matheus', 'mateus da babaculandia', 'mix da rodoviaria', 'mix da rodoviária'],
    'farmacia rodoviaria': ['farmadia ali da rodoviaria', 'farmacia da rodoviaria', 'farmácia rodoviaria'],
};

function generateVariants(query: string): string[] {
    const norm = normalizeString(query);
    const variants = new Set<string>();
    variants.add(norm);

    // split tokens and also consider joining adjacent tokens
    const tokens = norm.split(' ');
    for (let i = 0; i < tokens.length; i++) {
        // single token
        variants.add(tokens[i]);
        // bi-gram
        if (i + 1 < tokens.length) {
            variants.add(`${tokens[i]} ${tokens[i + 1]}`);
        }
    }

    // check alias map for any alias that includes a token
    for (const [canon, arr] of Object.entries(ALIAS_MAP)) {
        for (const v of arr) {
            if (norm.includes(normalizeString(v))) {
                variants.add(normalizeString(canon));
                arr.forEach(x => variants.add(normalizeString(x)));
            }
        }
    }

    // return array, preferring longer phrases first
    return Array.from(variants).sort((a, b) => b.length - a.length);
}

// Simple similarity: normalized equality or inclusion
function isLikelySame(a: string, b: string) {
    const na = normalizeString(a);
    const nb = normalizeString(b);
    if (na === nb) return true;
    if (na.includes(nb) || nb.includes(na)) return true;
    return false;
}

app.get('/api/location/search', async (c) => {
    const query = c.req.query('q');
    if (!query || query.length < 3) {
        return c.json({ success: false, error: 'Query inválida ou curta demais' }, 400);
    }

    const { env } = c;
    const db = env.DB;
    const cleanQuery = query.trim().toLowerCase();

    // parse optional proximity param sent by mobile client (proximity=lat,lon)
    let biasLat = -5.5263;
    let biasLon = -47.4742;
    const proximity = c.req.query('proximity');
    if (proximity) {
        try {
            const parts = proximity.split(',');
            const pl = parseFloat(parts[0]);
            const plon = parseFloat(parts[1]);
            if (!Number.isNaN(pl) && !Number.isNaN(plon)) {
                biasLat = pl;
                biasLon = plon;
            }
        } catch (e) {
            // ignore invalid proximity
        }
    }

    try {
        // 1. TENTA BUSCAR NO "CAHCE DE IMPERATRIZ" (D1)
        // Usar variantes inteligentes (apelidos, tokens) antes de gastar crédito

        const ENABLE_CACHE_READ = false; // MODO APRENDIZADO: Apenas salva, não lê.

        if (ENABLE_CACHE_READ) {
            const variants = generateVariants(cleanQuery);
            for (const v of variants) {
                const localResults: any = await db.prepare(
                    `SELECT * FROM cached_addresses WHERE search_query LIKE ? LIMIT 5`
                ).bind(`%${v}%`).all();

                if (localResults && localResults.results && localResults.results.length > 0) {
                    console.log(`[Location Cache] ⚡ HIT local para variante: '${v}' (orig: ${cleanQuery})`);

                    // Formatando igual ao padrão exigido no frontend
                    const formattedLocal = localResults.results.map((row: any) => ({
                        address: {
                            freeformAddress: row.full_address,
                            streetName: row.full_address.split(',')[0],
                        },
                        poi: row.name ? { name: row.name } : null,
                        position: { lat: row.lat, lon: row.lng }
                    }));

                    return c.json({ success: true, cached: true, variant: v, results: formattedLocal });
                }
            }
        }

        // 2. SE NÃO ACHOU EM NENHUMA VARIANTE, GASTA CRÉDITO NA API TOMTOM
        console.log(`[Location Cache] 🐢 MISS para variantes. Buscando na TomTom oficial: '${cleanQuery}'`);

        // Em produção, o segredo TOMTOM_API_KEY deve ser injetado via `wrangler secret put`
        const apiKey = (env as any).TOMTOM_API_KEY || "9fHkwxRUexp066shZeSS0REtfDL0pkpy";

        let results: any[] = [];
        let debugCause = "";

        try {
            // Utilizando a Rota de Busca Oficial (search) ao invés de fuzzySearch descontinuada
            const tomtomUrl = `https://api.tomtom.com/search/2/search/${encodeURIComponent(cleanQuery)}.json?key=${apiKey}&lat=${biasLat}&lon=${biasLon}&radius=15000&language=pt-BR&countrySet=BR&limit=5`;

            const response = await fetch(tomtomUrl, {
                headers: {
                    "User-Agent": "ProjetoCentralApp/1.0 (Mobile Client)",
                    "Accept": "application/json"
                }
            });

            if (response.ok) {
                const data: any = await response.json();
                results = data.results || [];
                console.log(`[TomTom API] ✓ Sucesso. Encontrados ${results.length} resultados para '${cleanQuery}'`);
            } else {
                const errBody = await response.text();
                // Extensão log
                debugCause = `HTTP ${response.status}: ${errBody} (URL: ${tomtomUrl.replace(apiKey, '***')})`;
                console.error(`[TomTom API] ❌ Falha Requisicao HTTP ${response.status}: ${errBody}`);
                console.error(`[TomTom API] URL Tentada: ${tomtomUrl.replace(apiKey, '***')}`);
            }
        } catch (e: any) {
            debugCause = `Catch Error: ${e.message}`;
            console.error(`[TomTom API] Falha de Rede Crítica: ${e.message}`);
        }

        // Se a TomTom sucumbir (Erro de Chave, Rate Limit Diário, Bot Block), 
        // Em Modo de Manutenção/Debug vamos lançar o erro na cara do usuário pra ver porque a url quebrou.
        if (results.length === 0) {
            return c.json({ success: false, cached: false, debug_error: debugCause, results: [] });
        }

        // 3. SALVA OS RESULTADOS (FIRE AND FORGET) NO D1 PARA A PRÓXIMA
        if (results.length > 0) {
            c.executionCtx.waitUntil((async () => {
                try {
                    const insertStmt = db.prepare(`
                        INSERT OR IGNORE INTO cached_addresses (search_query, full_address, name, lat, lng) 
                        VALUES (?, ?, ?, ?, ?)
                    `);

                    const batchStmts = results.map((r: any) => {
                        let name = null;
                        if (r.poi && r.poi.name) name = r.poi.name;
                        let addressStr = r.address?.freeformAddress || r.address?.streetName || cleanQuery;

                        return insertStmt.bind(
                            cleanQuery,
                            addressStr,
                            name,
                            r.position?.lat || 0,
                            r.position?.lon || 0
                        );
                    });

                    if (batchStmts.length > 0) {
                        await db.batch(batchStmts);
                        console.log(`[Location Cache] 💾 Salvos ${batchStmts.length} endereços novos no D1.`);
                    }
                } catch (e) {
                    console.error('[Location Cache] Erro ao salvar endereços em background', e);
                }
            })());
        }

        return c.json({ success: true, cached: false, results: results });

    } catch (err: any) {
        console.error('[Location Cache] ❌ Falha geral na Busca:', err);
        return c.json({ success: false, error: err.message }, 500);
    }
});

/**
 * API: Geo Reverse (Lat/Lon to Address)
 */
app.get('/api/geo/reverse', async (c) => {
    const lat = c.req.query('lat');
    const lon = c.req.query('lon');

    if (!lat || !lon) return c.json({ error: "Lat/Lon required" }, 400);

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
        const response = await fetch(url, {
            headers: {
                "User-Agent": "ProjetoCentral/1.0",
                "Accept-Language": "pt-BR"
            }
        });

        const data: any = await response.json();
        if (data && data.address) {
            const addr = data.address;
            const formatted = [
                addr.road || addr.pedestrian || addr.suburb,
                addr.house_number,
                addr.suburb || addr.neighbourhood,
                addr.city || addr.town || addr.municipality,
                addr.state
            ].filter(Boolean).join(", ");

            return c.json({
                success: true,
                address: formatted,
                details: data.address
            });
        }
        return c.json({ success: false, message: "Address not found" });
    } catch (error: any) {
        return c.json({ success: true, address: `Lat: ${lat}, Lon: ${lon}`, fallback: true });
    }
});



/**
 * API: Process Payment (Mercado Pago)
 * Optimized for high Quality Score (81/100+)
 */
app.post('/api/payment/process', async (c) => {
    let body;
    try {
        body = await c.req.json();
    } catch (e) {
        return c.json({ success: false, message: "Invalid JSON" }, 400);
    }

    const {
        transaction_amount,
        payment_method_id,
        payer,
        service_id,
        payment_type,
        token,
        description,
        installments,
        device_id
    } = body;

    if (!service_id) return c.json({ success: false, message: "service_id required" }, 400);

    try {
        const db = c.env.DB;
        const mpToken = c.env.MP_ACCESS_TOKEN;

        // 1. Fetch service details from D1
        const service: any = await db.prepare('SELECT profession, price_estimated, price_upfront FROM service_requests WHERE id = ?')
            .bind(service_id)
            .first();

        if (!service) return c.json({ success: false, message: "Service not found" }, 404);

        // 2. Determine real amount
        let realAmount = (payment_type === 'remaining')
            ? Number(service.price_estimated) - Number(service.price_upfront)
            : (Number(service.price_upfront) > 0 ? Number(service.price_upfront) : Number(service.price_estimated));

        // 3. Prepare Enriched Payment Body (Score Booster)
        const paymentBody: any = {
            transaction_amount: realAmount,
            description: description || `Payment for ${service.profession}`,
            payment_method_id,
            notification_url: "https://projeto-central-backend.carrobomebarato.workers.dev/api/payment/webhook",
            payer: {
                email: payer?.email || "customer@example.com",
                identification: payer?.identification,
                first_name: payer?.first_name
            },
            metadata: {
                service_id,
                payment_type: payment_type || 'initial',
                device_id: device_id
            },
            external_reference: `SERVICE-${service_id}`,
            statement_descriptor: "101SERVICE",
            binary_mode: true,
            additional_info: {
                items: [
                    {
                        id: service_id,
                        title: service.profession || "Service 101",
                        description: description || `Service: ${service.profession}`,
                        category_id: "services", // Categorização ganha pontos
                        quantity: 1,
                        unit_price: realAmount
                    }
                ],
                payer: {
                    first_name: payer?.first_name || "Customer",
                    registration_date: new Date().toISOString()
                }
            }
        };

        if (payment_method_id !== "pix") {
            paymentBody.token = token;
            paymentBody.installments = Number(installments || 1);
        }

        // 4. Call Mercado Pago API
        const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${mpToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `PAY-${service_id}-${payment_type || 'initial'}-${Date.now()}`,
                'X-Meli-Session-Id': device_id || ''
            },
            body: JSON.stringify(paymentBody)
        });

        const result: any = await mpResponse.json();

        if (!mpResponse.ok) {
            console.error('[Pagamento] ❌ Erro na API do Mercado Pago:', result);
            return c.json({ success: false, error: result }, mpResponse.status as any);
        }

        // 5. Log payment to D1
        await db.prepare('INSERT INTO payments (mission_id, user_id, amount, status, mp_payment_id, payment_method_id, payer_email) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(
                service_id,
                0, // User ID (should be extracted from token in future)
                realAmount,
                result.status,
                String(result.id),
                payment_method_id,
                payer?.email || "customer@example.com"
            )
            .run();

        return c.json({ success: true, payment: result });

    } catch (error: any) {
        console.error('[Pagamento] ❌ Erro ao processar pagamento:', error.message);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * Mercado Pago Webhook
 * Uses direct REST API and Raw D1 for high reliability.
 */
app.post('/api/payment/webhook', async (c) => {
    let body;
    try {
        body = await c.req.json();
    } catch (e) {
        return c.text('Invalid JSON', 400);
    }

    // Mercado Pago provides data in body or query parameters depending on the event type/version
    const query = c.req.query();
    const eventType = body.type || query.type || query.topic;
    const paymentId = body.data?.id || query['data.id'] || query.id;

    LOG.pagamento(`📥 Webhook recebido: type=${eventType} | payment_id=${paymentId}`);

    if ((eventType === 'payment' || eventType === 'payment.updated') && paymentId) {
        try {
            const db = c.env.DB;
            const token = c.env.MP_ACCESS_TOKEN;

            // Verificar status diretamente na API do Mercado Pago
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                LOG.erro(`Falha na verificação do pagamento ${paymentId} com MP API`);
                return c.text('Verification failed', 200);
            }

            const paymentInfo: any = await response.json();
            const pStatus = paymentInfo.status;
            const externalRef = paymentInfo.external_reference;

            LOG.pagamento(`💰 Pagamento ${paymentId}: status=${pStatus} | ref=${externalRef}`);

            if (pStatus === 'approved' && externalRef?.startsWith('SERVICE-')) {
                const serviceId = externalRef.replace('SERVICE-', '');
                LOG.pagamento(`✅ Pagamento APROVADO para serviço ${serviceId}`);

                // 1. Atualizar registro de pagamento
                await db.prepare('UPDATE payments SET status = ? WHERE mp_payment_id = ?')
                    .bind('approved', String(paymentId)).run();
                LOG.pagamento(`📝 Registro de pagamento atualizado para ${serviceId}`);

                // 2. Buscar serviço
                const service: any = await db.prepare('SELECT status, provider_id, client_id, scheduled_at, address, location_type FROM service_requests WHERE id = ?')
                    .bind(serviceId).first();

                if (!service) {
                    LOG.erro(`Serviço ${serviceId} não encontrado no banco`);
                    return c.text('OK', 200);
                }

                LOG.pagamento(`Estado atual do serviço ${serviceId}: ${service.status}`);

                // 3. Transição de status baseada no estado atual
                let updateSql = '';
                let params: any[] = [];
                let transitionMsg = '';
                let newStatus = '';

                if (service.status === 'waiting_payment') {
                    newStatus = service.provider_id ? ServiceStatus.ACCEPTED : ServiceStatus.PENDING;
                    updateSql = 'UPDATE service_requests SET status = ? WHERE id = ?';
                    params = [newStatus, serviceId];
                    transitionMsg = `→ ${newStatus} (pagamento inicial aprovado)`;
                }
                else if (service.status === 'waiting_payment_remaining' || (service.status === 'accepted' && service.arrived_at !== null)) {
                    newStatus = ServiceStatus.IN_PROGRESS;
                    updateSql = 'UPDATE service_requests SET status = ?, payment_remaining_status = ? WHERE id = ?';
                    params = [ServiceStatus.IN_PROGRESS, 'paid', serviceId];
                    transitionMsg = `→ ${ServiceStatus.IN_PROGRESS} (pagamento restante aprovado)`;
                }

                if (updateSql) {
                    // Maestro v2: Transição de Status e Sincronização Real-time
                    const extra = params.length > 2 ? { payment_remaining_status: params[1] } : {};

                    await updateServiceStatus(
                        c.env,
                        serviceId,
                        newStatus,
                        [service.client_id, service.provider_id].filter(id => id !== null) as number[],
                        { provider_id: service.provider_id },
                        extra
                    );

                    LOG.sucesso(`🔄 Serviço ${serviceId} ${transitionMsg}`);

                    // LÓGICA DE DESPACHO / NOTIFICAÇÃO
                    if (newStatus === ServiceStatus.PENDING) {
                        // MOBILE / BROADCAST: Popula fila e acorda despachante
                        c.executionCtx.waitUntil((async () => {
                            const updatedService: any = await db.prepare('SELECT * FROM service_requests WHERE id = ?').bind(serviceId).first();
                            if (updatedService) {
                                const { count: qCount } = await populateServiceQueue(db, serviceId, updatedService);
                                LOG.despacho(`🚀 Fila populada com ${qCount} prestadores para serviço ${serviceId}`);

                                await triggerServiceNotifications(serviceId, db, c.env, c.executionCtx);
                            }
                        })());
                    } else if (newStatus === ServiceStatus.ACCEPTED && service.provider_id) {
                        // FIXED / SCHEDULED: Notificação direta ao prestador
                        c.executionCtx.waitUntil((async () => {
                            let bodyText = 'Novo serviço confirmado!';
                            const isScheduled = !!service.scheduled_at;

                            if (isScheduled) {
                                const date = new Date(service.scheduled_at);
                                const formattedDate = `${date.getDate()}/${date.getMonth() + 1} às ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
                                bodyText = `📅 Agendamento Confirmado: ${formattedDate}\n📍 ${service.address || 'Ver detalhes no app'}`;
                            } else {
                                bodyText = 'O pagamento foi confirmado e você já pode iniciar o serviço.';
                            }

                            await sendNotificationToUser(
                                c.env,
                                service.provider_id,
                                isScheduled ? '⏰ No Horário! Agendamento Ativo' : '✅ Serviço Confirmado!',
                                bodyText,
                                {
                                    service_id: serviceId,
                                    type: isScheduled ? 'scheduled_started' : 'service_accepted',
                                    scheduled_at: service.scheduled_at
                                }
                            );
                            LOG.notificacao(`🔔 Notificação direta enviada para prestador ${service.provider_id} (tipo: ${isScheduled ? 'scheduled_started' : 'service_accepted'})`);
                        })());
                    }
                } else {
                    LOG.warn(`Nenhuma transição necessária para serviço ${serviceId} no estado ${service.status}`);
                }
            }
        } catch (error: any) {
            LOG.erro(`Erro crítico no processamento do webhook:`, error);
        }
    }

    return c.text('OK', 200);
});

// ############################################################################
// #                                                                          #
// #                       PAYMENT VERIFICATION ROUTES                        #
// #                                                                          #
// ############################################################################

/**
 * API: Confirm Payment (Generic/Simulated)
 * Used by mobile app after gateway success to instantly trigger transition
 */
app.post('/api/payments/confirm', d1RateLimiter({ route: 'payment_confirm', maxRequests: 5, windowMinutes: 1 }), async (c) => {
    let body;
    try {
        body = await c.req.json();
    } catch (e) {
        return c.json({ success: false, message: "Invalid JSON" }, 400);
    }

    const { service_id, payment_id } = body;
    if (!service_id) return c.json({ success: false, message: "service_id required" }, 400);

    const db = c.env.DB;

    // 1. Verify if service exists and is waiting payment
    const service: any = await db.prepare('SELECT status, provider_id, client_id, scheduled_at, address, price_estimated, price_upfront FROM service_requests WHERE id = ?')
        .bind(service_id).first();

    if (!service) return c.json({ success: false, message: "Service not found" }, 404);

    let newStatus: string | null = null;
    let transitionMsg = "";
    let extraUpdate = {};

    // Logic: Transition based on current state
    if (service.status === 'waiting_payment') {
        newStatus = service.provider_id ? ServiceStatus.ACCEPTED : ServiceStatus.PENDING;
        transitionMsg = `Payment Confirmed (Initial) -> ${newStatus}`;
    } else if (service.status === 'waiting_payment_remaining') {
        newStatus = ServiceStatus.IN_PROGRESS;
        extraUpdate = { payment_remaining_status: 'paid' };
        transitionMsg = `Payment Confirmed (Remaining) -> Available to Start`;
    } else {
        // Already paid or in another state
        return c.json({ success: true, message: "Payment already processed or not required", status: service.status });
    }

    try {
        // 2. Update Status (Maestro v2)
        await updateServiceStatus(
            c.env,
            service_id,
            newStatus,
            [service.client_id, service.provider_id].filter(id => id !== null) as number[],
            { provider_id: service.provider_id },
            extraUpdate
        );

        // 3. Log Payment (Mock reference if not provided)
        const pId = payment_id || `MANUAL-${Date.now()}`;
        await db.prepare('INSERT OR REPLACE INTO payments (mission_id, user_id, amount, status, mp_payment_id, payment_method_id, payer_email) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(service_id, service.client_id || 0, service.price_upfront || 0, 'approved', pId, 'credit_card', 'app_confirm@user.com')
            .run();

        // 4. Trigger Dispatch / Notification Logic
        c.executionCtx.waitUntil((async () => {
            if (newStatus === ServiceStatus.PENDING) {
                // MOBILE / BROADCAST
                const updatedService: any = await db.prepare('SELECT * FROM service_requests WHERE id = ?').bind(service_id).first();
                if (updatedService) {
                    await populateServiceQueue(db, service_id, updatedService);
                    await triggerServiceNotifications(service_id, db, c.env, c.executionCtx);
                }
            } else if (newStatus === ServiceStatus.ACCEPTED && service.provider_id) {
                // FIXED / SCHEDULED
                let bodyText = 'Novo serviço confirmado!';
                if (service.scheduled_at) {
                    const date = new Date(service.scheduled_at);
                    const formattedDate = `${date.getDate()}/${date.getMonth() + 1} às ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
                    bodyText = `📅 Agendamento Confirmado: ${formattedDate}\n📍 ${service.address || 'Ver detalhes no app'}`;
                }

                await sendNotificationToUser(
                    c.env,
                    service.provider_id,
                    '✅ Serviço Confirmado!',
                    bodyText,
                    {
                        service_id: service_id,
                        type: 'service_accepted',
                        scheduled_at: service.scheduled_at
                    }
                );
            }
        })());

        LOG.sucesso(`✅ [Confirmação Manual] ${transitionMsg}`);
        return c.json({ success: true, status: newStatus });

    } catch (e: any) {
        LOG.erro(`Erro ao confirmar pagamento manual:`, e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

/**
 * Robust check for Pix payments - redundant to Webhook
 */
app.get('/api/payment/check/:serviceId', async (c) => {
    const service_id = c.req.param('serviceId');
    const db = c.env.DB;
    const mpToken = c.env.MP_ACCESS_TOKEN;

    try {
        LOG.pagamento(`🔍 Verificação manual para o serviço: ${service_id}`);

        // 1. Look for payment records for this mission
        const payment: any = await db.prepare('SELECT * FROM payments WHERE mission_id = ? ORDER BY id DESC LIMIT 1')
            .bind(service_id)
            .first();

        if (!payment) {
            return c.json({ success: false, message: "No payment record found" });
        }

        if (payment.status === 'approved') {
            return c.json({ success: true, status: 'approved' });
        }

        // 2. If status is pending/null, check directly with MP
        if (payment.mp_payment_id) {
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${payment.mp_payment_id}`, {
                headers: { 'Authorization': `Bearer ${mpToken}` }
            });

            if (response.ok) {
                const mpInfo: any = await response.json();
                LOG.pagamento(`💰 Verificação direta MP: ${mpInfo.status}`);

                if (mpInfo.status === 'approved') {
                    // Update DB manually since webhook might be lost
                    await db.prepare('UPDATE payments SET status = ? WHERE id = ?')
                        .bind('approved', payment.id)
                        .run();

                    // Update service status
                    const service: any = await db.prepare('SELECT * FROM service_requests WHERE id = ?')
                        .bind(service_id)
                        .first();

                    if (service && (service.status === 'waiting_payment' || service.status === 'waiting_payment_remaining')) {
                        let newStatus = service.status === 'waiting_payment_remaining' ? 'in_progress' : (service.provider_id ? 'accepted' : 'pending');

                        if (service.status === 'waiting_payment_remaining') {
                            await db.prepare('UPDATE service_requests SET status = ?, payment_remaining_status = ? WHERE id = ?')
                                .bind('in_progress', 'paid', service_id)
                                .run();
                            LOG.sucesso(`Serviço ${service_id} atualizado para EM ANDAMENTO (Pagamento final)`);
                        } else {
                            await db.prepare('UPDATE service_requests SET status = ? WHERE id = ?')
                                .bind(newStatus, service_id)
                                .run();
                            LOG.sucesso(`Serviço ${service_id} aprovado para ${newStatus}`);
                        }

                        // Maestro v2 Activation
                        if (newStatus === 'pending') {
                            c.executionCtx.waitUntil((async () => {
                                await populateServiceQueue(db, service_id, service);
                                await triggerServiceNotifications(service_id, db, c.env, c.executionCtx);
                                LOG.despacho(`🚀 Fila populada e despacho iniciado para ${service_id}`);
                            })());
                        } else if (newStatus === 'accepted') {
                            // Notify specific provider if manually approved and already assigned
                            await triggerServiceNotifications(service_id, db, c.env, c.executionCtx);
                        }
                    }

                    return c.json({ success: true, status: 'approved' });
                }
                return c.json({ success: true, status: mpInfo.status });
            }
        }

        return c.json({ success: true, status: payment.status || 'pending' });

    } catch (e: any) {
        LOG.erro(`Erro na verificação manual de pagamento ${service_id}:`, e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

// =============================================
// App Configuration / Feature Flags
// =============================================
app.get('/api/config', async (c) => {
    try {
        const db = c.env.DB;
        const configs: any = await db.prepare('SELECT key, value, type FROM app_config').all();

        const payload: Record<string, any> = {};

        if (configs.results) {
            for (const row of configs.results) {
                let parsedValue: any = row.value;
                if (row.type === 'boolean') {
                    parsedValue = row.value === 'true' || row.value === '1';
                } else if (row.type === 'number') {
                    parsedValue = Number(row.value);
                }
                payload[row.key] = parsedValue;
            }
        }

        return c.json({
            success: true,
            configs: payload,
            timestamp: new Date().toISOString()
        });
    } catch (e: any) {
        LOG.erro('Erro ao buscar configurações:', e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

// =============================================
// Campaign Proxy (CORS workaround for web)
// =============================================
app.get('/api/campaign/:campaignId', async (c) => {
    try {
        const campaignId = c.req.param('campaignId');
        const response = await fetch(`https://campanha-simples.vercel.app/api/manifest?campaign=${campaignId}`);
        const data = await response.json();
        return c.json(data);
    } catch (error: any) {
        console.error('[Campanha] ❌ Erro no proxy:', error.message);
        return c.json({ error: 'Failed to fetch campaign' }, 500);
    }
});

// =============================================
// Debug / Test Endpoints
// =============================================

/**
 * DEBUG: Wake up Global Dispatcher
 */
app.get('/api/dispatch/wake-up', async (c) => {
    try {
        const id = c.env.DISPATCH_MANAGER.idFromName('GLOBAL_DISPATCHER');
        const obj = c.env.DISPATCH_MANAGER.get(id);
        await obj.fetch(new Request(`http://dispatch/wake-up`, { method: 'POST' }));
        return c.json({ success: true, message: "DispatchManager wake-up signal sent" });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});


/**
 * DEBUG ENDPOINT: Inspect specific provider details (Location, Professions, Token)
 */
app.get('/api/debug/provider/:id', async (c) => {
    const id = c.req.param('id');
    const db = c.env.DB;
    try {
        const user: any = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
        const location: any = await db.prepare('SELECT * FROM provider_locations WHERE provider_id = ?').bind(id).first();
        const professions: any = await db.prepare(`
                SELECT p.name, pp.* 
                FROM provider_professions pp
                JOIN professions p ON pp.profession_id = p.id
                WHERE pp.provider_user_id = ?
            `).bind(id).all();

        return c.json({
            success: true,
            user,
            location,
            professions: professions.results
        });
    } catch (e: any) {
        return c.json({ success: false, error: e.message });
    }
});

/**
 * DEBUG ENDPOINT: Check all FCM tokens in database
 */
app.get('/api/test/check-tokens', async (c) => {
    try {
        const db = c.env.DB;
        const tokens: any = await db.prepare(`
                SELECT id, full_name, role, fcm_token
                FROM users
                WHERE fcm_token IS NOT NULL AND fcm_token != ''
                ORDER BY role, full_name
            `).all();

        return c.json({
            success: true,
            count: tokens.results?.length || 0,
            tokens: tokens.results
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * DEBUG ENDPOINT: Test provider matching
 */
app.post('/api/test/find-providers', async (c) => {
    try {
        const db = c.env.DB;
        const { profession, latitude, longitude } = await c.req.json();

        const providers = await findProvidersByDistance(c.env, profession, latitude, longitude, 50);

        return c.json({
            success: true,
            query: { profession, latitude, longitude, radius: 50 },
            count: providers.length,
            providers
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * DEBUG ENDPOINT: Check FCM configuration
 */
app.get('/api/test/fcm-config', async (c) => {
    const serverKey = c.env.FCM_SERVER_KEY;
    return c.json({
        fcm_configured: !!serverKey,
        fcm_key_length: serverKey?.length || 0,
        fcm_key_prefix: serverKey ? serverKey.substring(0, 10) + '...' : 'N/A'
    });
});

/**
 * TEST ENDPOINT: Create simulated service and notify providers by distance
 */
app.post('/api/test/create-service-and-notify', async (c) => {
    try {
        const db = c.env.DB;
        const body = await c.req.json();
        const { profession, latitude, longitude, price = 50.0 } = body;

        const serviceId = 'test-' + Date.now();
        console.log(`[TEST-SERVICE] ====== Creating Simulated Service for Escalation Test ======`);

        // 1. Insert into DB so triggerServiceNotifications can find it
        await db.prepare(`
                INSERT INTO service_requests (
                    id, client_id, category_id, profession, description, latitude, longitude, address,
                    price_estimated, status, created_at
                ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, '${ServiceStatus.PENDING}', datetime('now'))
            `).bind(
            serviceId,
            1, // Default category
            profession || 'Chaveiro',
            `Teste de Escalonamento (${profession})`,
            latitude || -5.52639,
            longitude || -47.49167,
            'Rua Rui Barbosa, Centro, Imperatriz - MA (TESTE)',
            price
        ).run();

        // 2. Trigger real escalation logic
        console.log(`[TEST-SERVICE] Triggering triggerServiceNotifications for ${serviceId}`);
        c.executionCtx.waitUntil(triggerServiceNotifications(serviceId, db, c.env, c.executionCtx));

        return c.json({
            success: true,
            message: `Service ${serviceId} created. Escalation started in background.`,
            serviceId
        });

    } catch (error: any) {
        console.error('[TEST-SERVICE] Error:', error.message);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * TEST ENDPOINT: Force send notification to test FCM
 */
app.post('/api/test/send-notification', async (c) => {
    try {
        const db = c.env.DB;
        const serviceAccount = c.env.FIREBASE_SERVICE_ACCOUNT;

        console.log(`[TEST] ====== Testing Notification System ======`);
        console.log(`[TEST] FIREBASE_SERVICE_ACCOUNT configured: ${!!serviceAccount}`);

        if (!serviceAccount) {
            return c.json({ success: false, message: 'FIREBASE_SERVICE_ACCOUNT not configured' }, 500);
        }

        // Get all providers with FCM tokens
        const providers: any = await db.prepare(`
                SELECT id, full_name, fcm_token, role
                FROM users
                WHERE role = 'provider'
                AND fcm_token IS NOT NULL
                AND fcm_token != ''
                LIMIT 10
            `).all();

        console.log(`[TEST] Found ${providers.results?.length || 0} providers with FCM tokens`);

        if (!providers.results || providers.results.length === 0) {
            return c.json({
                success: false,
                message: 'No providers with FCM tokens found',
                details: 'Check that providers have logged in and registered their FCM tokens'
            }, 404);
        }

        const results = [];
        for (const provider of providers.results) {
            console.log(`[TEST] Sending to provider ${provider.id} (${provider.full_name})`);
            const success = await sendFCMNotificationV1(serviceAccount, provider.fcm_token, {
                title: '🧪 Teste de Notificação',
                body: 'Esta é uma notificação de teste do sistema',
                data: {
                    type: 'test',
                    timestamp: new Date().toISOString()
                }
            });
            results.push({
                providerId: provider.id,
                providerName: provider.full_name,
                success
            });
        }

        return c.json({
            success: true,
            message: `Sent ${results.filter(r => r.success).length}/${results.length} notifications`,
            results
        });
    } catch (error: any) {
        console.error('[TEST] Error:', error.message);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * DEBUG ENDPOINT: Manually approve a payment and trigger notifications
 */
app.post('/api/payment/debug-confirm', async (c) => {
    try {
        const db = c.env.DB;
        const { serviceId } = await c.req.json();

        if (!serviceId) return c.json({ success: false, message: 'serviceId required' }, 400);

        LOG.pagamento(`⚖️ [DEBUG] Aprovando serviço manualmente: ${serviceId}`);

        // 1. Update service status
        const service: any = await db.prepare('SELECT * FROM service_requests WHERE id = ?')
            .bind(serviceId)
            .first();

        if (!service) return c.json({ success: false, message: 'Service not found' }, 404);

        let newStatus = service.status === 'waiting_payment_remaining'
            ? ServiceStatus.IN_PROGRESS
            : (service.provider_id ? ServiceStatus.ACCEPTED : ServiceStatus.PENDING);

        // Maestro v2: Aprovação Manual Debug com Sincronização
        const extra = service.status === 'waiting_payment_remaining' ? { payment_remaining_status: 'paid' } : {};

        await updateServiceStatus(
            c.env,
            serviceId,
            newStatus,
            [service.client_id, service.provider_id].filter(id => id !== null) as number[],
            { provider_id: service.provider_id },
            extra
        );

        // 2. Insert/Update payment record as approved
        await db.prepare('INSERT OR REPLACE INTO payments (mission_id, user_id, amount, status, mp_payment_id, payment_method_id, payer_email) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(serviceId, 0, 0, 'approved', 'DEBUG-' + Date.now(), 'pix', 'debug@test.com')
            .run();

        // 3. Maestro v2: Popular fila de despacho e acordar motor
        if (newStatus === 'pending') {
            c.executionCtx.waitUntil((async () => {
                await populateServiceQueue(db, serviceId, service);
                await triggerServiceNotifications(serviceId, db, c.env, c.executionCtx);
                LOG.despacho(`🚀 [DEBUG] Fila populada e motor acordado para o serviço ${serviceId}`);
            })());
        } else if (newStatus === 'accepted') {
            await triggerServiceNotifications(serviceId, db, c.env, c.executionCtx);
        }

        return c.json({
            success: true,
            message: `Service ${serviceId} manually approved. Status changed to ${newStatus}.`,
            notifications_triggered: true
        });

    } catch (error: any) {
        LOG.erro(`Erro na aprovação manual debug:`, error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

// ############################################################################
// #                                                                          #
// #                       THEME & CONFIG ROUTES                              #
// #                                                                          #
// ############################################################################

// =====================================================
// THEME & LOCALIZATION ENDPOINTS
// =====================================================

/**
 * GET /api/theme/active
 * Retorna o tema ativo com todas as configurações visuais
 */
app.get('/api/theme/active', async (c) => {
    try {
        const db = c.env.DB;

        // Buscar tema ativo
        const theme: any = await db.prepare(`
                SELECT * FROM app_theme WHERE is_active = 1 LIMIT 1
            `).first();

        if (!theme) {
            return c.json({
                success: false,
                message: 'No active theme found'
            }, 404);
        }

        // Estruturar resposta
        const themeData = {
            version: theme.version,
            name: theme.name,
            colors: {
                primary: theme.primary_color,
                primaryBlue: theme.primary_blue,
                secondary: theme.secondary_color,
                background: theme.background_color,
                surface: theme.surface_color,
                error: theme.error_color,
                success: theme.success_color,
                warning: theme.warning_color,
                textPrimary: theme.text_primary_color,
                textSecondary: theme.text_secondary_color,
                textDisabled: theme.text_disabled_color,
                textHint: theme.text_hint_color,
                buttonPrimaryBg: theme.button_primary_bg,
                buttonPrimaryText: theme.button_primary_text,
                buttonSecondaryBg: theme.button_secondary_bg,
                buttonSecondaryText: theme.button_secondary_text,
                buttonOutlineColor: theme.button_outline_color,
                categoryTripBg: theme.category_trip_bg,
                categoryServiceBg: theme.category_service_bg,
                categoryPackageBg: theme.category_package_bg,
                categoryReserveBg: theme.category_reserve_bg,
            },
            borders: {
                radiusSmall: theme.border_radius_small,
                radiusMedium: theme.border_radius_medium,
                radiusLarge: theme.border_radius_large,
                radiusXLarge: theme.border_radius_xlarge,
                width: theme.border_width,
                color: theme.border_color,
                shadowColor: theme.shadow_color || '#000000',
                shadowOpacity: theme.shadow_opacity ?? 0.08,
                shadowBlur: theme.shadow_blur ?? 6,
                shadowOffsetX: theme.shadow_offset_x ?? 0,
                shadowOffsetY: theme.shadow_offset_y ?? 3,
            },
            typography: {
                fontFamily: theme.font_family,
                sizeTiny: theme.font_size_tiny,
                sizeSmall: theme.font_size_small,
                sizeMedium: theme.font_size_medium,
                sizeLarge: theme.font_size_large,
                sizeXLarge: theme.font_size_xlarge,
                sizeTitle: theme.font_size_title,
            },
            spacing: {
                tiny: theme.spacing_tiny,
                small: theme.spacing_small,
                medium: theme.spacing_medium,
                large: theme.spacing_large,
                xlarge: theme.spacing_xlarge,
            }
        };

        return c.json({
            success: true,
            theme: themeData,
            lastUpdated: theme.updated_at
        });

    } catch (error: any) {
        console.error('[Tema] ❌ Erro ao buscar tema:', error);
        return c.json({
            success: false,
            error: error.message
        }, 500);
    }
});

/**
 * GET /api/strings/:language
 * Retorna todas as strings traduzidas para um idioma
 */
app.get('/api/strings/:language?', async (c) => {
    try {
        const db = c.env.DB;
        const language = c.req.param('language') || 'pt-BR';

        const result = await db.prepare(`
                SELECT key, value, category FROM app_strings 
                WHERE language = ?
                ORDER BY category, key
            `).bind(language).all();

        // Converter para mapa { key: value }
        const stringsMap: Record<string, string> = {};
        const byCategory: Record<string, Record<string, string>> = {};

        result.results.forEach((row: any) => {
            stringsMap[row.key] = row.value;

            // Agrupar por categoria
            if (!byCategory[row.category]) {
                byCategory[row.category] = {};
            }
            byCategory[row.category][row.key] = row.value;
        });

        return c.json({
            success: true,
            language,
            total: result.results.length,
            strings: stringsMap,
            byCategory
        });

    } catch (error: any) {
        console.error('[Tradução] ❌ Erro ao buscar strings:', error);
        return c.json({
            success: false,
            error: error.message
        }, 500);
    }
});

/**
 * GET /api/config
 * Retorna configurações gerais do app
 */
app.get('/api/config', async (c) => {
    try {
        const db = c.env.DB;

        const result = await db.prepare(`
                SELECT key, value, type FROM app_config
            `).all();

        const config: Record<string, any> = {};

        result.results.forEach((row: any) => {
            let value: any = row.value;

            // Converter tipo
            if (row.type === 'number') {
                value = parseFloat(value);
            } else if (row.type === 'boolean') {
                value = value === 'true';
            } else if (row.type === 'json') {
                value = JSON.parse(value);
            }

            config[row.key] = value;
        });

        LOG.sistema(`⚙️ Configurações gerais carregadas (${result.results.length} chaves)`);
        return c.json({ success: true, config });
    } catch (e: any) {
        LOG.erro('Erro ao buscar configurações:', e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

// =====================================================
// UBER-LIKE MODULE ENDPOINTS
// =====================================================

/**
 * POST /api/uber/calculate-fare
 */
app.post('/api/uber/calculate-fare', async (c) => {
    const disabled = await checkUberModuleEnabled(c);
    if (disabled) return disabled;

    const {
        pickup_lat, pickup_lng,
        dropoff_lat, dropoff_lng,
        vehicle_type_id
    } = await c.req.json();

    const db = c.env.DB;
    const distance = calculateDistance(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng);
    const durationMinutes = Math.ceil((distance / 30) * 60);

    const vehicleType: any = await db.prepare(
        'SELECT * FROM vehicle_types WHERE id = ? AND is_active = 1'
    ).bind(vehicle_type_id).first();

    if (!vehicleType) {
        return c.json({ success: false, message: 'Invalid vehicle type' }, 400);
    }

    let fare = vehicleType.base_fare +
        (distance * vehicleType.per_km_rate) +
        (durationMinutes * vehicleType.per_min_rate);

    fare = Math.max(fare, vehicleType.min_fare);

    return c.json({
        success: true,
        fare: {
            estimated: parseFloat(fare.toFixed(2)),
            currency: 'BRL',
            distance_km: parseFloat(distance.toFixed(2)),
            duration_minutes: durationMinutes
        },
        vehicle_type: vehicleType.display_name
    });
});

/**
 * POST /api/uber/request
 */
app.post('/api/uber/request', async (c) => {
    const disabled = await checkUberModuleEnabled(c);
    if (disabled) return disabled;

    const db = c.env.DB;
    const body = await c.req.json();
    const {
        pickup_lat, pickup_lng, pickup_address,
        dropoff_lat, dropoff_lng, dropoff_address,
        vehicle_type_id
    } = body;

    // Obter ID do cliente (usando padrão simplificado para o auth deste app)
    // Em um app real, viria do JWT
    const clientId = 1; // TO-DO: Integrar com auth real

    const tripId = crypto.randomUUID();
    const distance = calculateDistance(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng);

    await db.prepare(`
        INSERT INTO trips (
            id, client_id, vehicle_type_id,
            pickup_latitude, pickup_longitude, pickup_address,
            dropoff_latitude, dropoff_longitude, dropoff_address,
            status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'searching')
    `).bind(
        tripId, clientId, vehicle_type_id,
        pickup_lat, pickup_lng, pickup_address,
        dropoff_lat, dropoff_lng, dropoff_address
    ).run();

    // Notificar motoristas próximos
    const drivers = await findNearbyDrivers(db, pickup_lat, pickup_lng, 10);
    const serviceAccount = c.env.FIREBASE_SERVICE_ACCOUNT;

    if (serviceAccount) {
        for (const driver of drivers) {
            c.executionCtx.waitUntil(sendFCMNotificationV1(
                serviceAccount,
                driver.fcm_token,
                {
                    title: '🚗 Nova Viagem',
                    body: `Viagem disponível próxima a você`,
                    data: { type: 'uber_trip_request', trip_id: tripId }
                }
            ));
        }
    } else {
        LOG.warn('FIREBASE_SERVICE_ACCOUNT não configurado. Notificações não enviadas.');
    }

    c.executionCtx.waitUntil(syncTripToFirebase(c.env, tripId, { status: 'searching' }));

    return c.json({ success: true, trip_id: tripId });
});

/**
 * POST /api/uber/driver/toggle
 */
app.post('/api/uber/driver/toggle', async (c) => {
    const disabled = await checkUberModuleEnabled(c);
    if (disabled) return disabled;

    const { is_online, latitude, longitude, driver_id } = await c.req.json();
    const db = c.env.DB;

    await db.prepare(`
        INSERT INTO driver_availability (driver_id, is_online, current_latitude, current_longitude)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(driver_id) DO UPDATE SET
            is_online = excluded.is_online,
            current_latitude = excluded.current_latitude,
            current_longitude = excluded.current_longitude,
            last_seen_at = CURRENT_TIMESTAMP
    `).bind(driver_id, is_online ? 1 : 0, latitude, longitude).run();

    return c.json({ success: true, status: is_online ? 'online' : 'offline' });
});

// ############################################################################
// #                                                                          #
// #                          ADMIN ROUTES                                    #
// #                                                                          #
// ############################################################################

/**
 * POST /api/admin/theme/update
 * Atualiza tema ativo (requer autenticação admin)
 * TODO: Adicionar autenticação admin
 */
app.post('/api/admin/theme/update', async (c) => {
    try {
        const db = c.env.DB;
        const data = await c.req.json();

        // Construir query de update dinamicamente
        const updates: string[] = [];
        const values: any[] = [];

        // Mapear campos do request para colunas do banco
        const fieldMap: Record<string, string> = {
            'primaryColor': 'primary_color',
            'secondaryColor': 'secondary_color',
            'backgroundColor': 'background_color',
            'textPrimaryColor': 'text_primary_color',
            'buttonPrimaryBg': 'button_primary_bg',
            'buttonPrimaryText': 'button_primary_text',
            'borderRadiusMedium': 'border_radius_medium',
            'borderWidth': 'border_width',
        };

        Object.keys(data).forEach(key => {
            if (fieldMap[key]) {
                updates.push(`${fieldMap[key]} = ?`);
                values.push(data[key]);
            }
        });

        if (updates.length === 0) {
            return c.json({
                success: false,
                message: 'No valid fields to update'
            }, 400);
        }

        // Adicionar updated_at
        updates.push('updated_at = CURRENT_TIMESTAMP');
        updates.push('version = version + 1');

        const query = `
                UPDATE app_theme 
                SET ${updates.join(', ')}
                WHERE is_active = 1
            `;

        await db.prepare(query).bind(...values).run();

        return c.json({
            success: true,
            message: 'Theme updated successfully'
        });

    } catch (error: any) {
        console.error('[Admin] ❌ Erro ao atualizar tema:', error);
        return c.json({
            success: false,
            error: error.message
        }, 500);
    }
});

/**
 * POST /api/admin/strings/update
 * Atualiza ou cria string (requer autenticação admin)
 */
app.post('/api/admin/strings/update', async (c) => {
    try {
        const db = c.env.DB;
        const { key, value, language = 'pt-BR', category } = await c.req.json();

        if (!key || !value) {
            return c.json({
                success: false,
                message: 'Key and value are required'
            }, 400);
        }

        await db.prepare(`
                INSERT INTO app_strings (key, value, language, category, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key, language) 
                DO UPDATE SET value = ?, category = ?, updated_at = CURRENT_TIMESTAMP
            `).bind(key, value, language, category, value, category).run();

        return c.json({
            success: true,
            message: 'String updated successfully'
        });

    } catch (error: any) {
        console.error('[Admin] ❌ Erro ao atualizar string:', error);
        return c.json({
            success: false,
            error: error.message
        }, 500);
    }
});

/**
 * Cron / Scheduled Watchdog: Ensure Dispatcher is always alive
 * Runs periodically to wake up the DispatchManager if it's sleeping while pending services exist.
 */


/**
 * Auto-Complete Services that are waiting for client confirmation for too long
 */
async function checkAutoCompletion(env: any) {
    const db = env.DB;
    try {
        // 1. Get Config
        let timeoutMinutes = 24 * 60; // Default 24 hours
        try {
            const conf: any = await db.prepare("SELECT value FROM app_config WHERE key = 'service_auto_complete_minutes'").first();
            if (conf && conf.value) timeoutMinutes = parseInt(conf.value);
        } catch (e) { }

        // 2. Find Stale Services
        // status = 'waiting_client_confirmation' AND status_updated_at < NOW - timeout
        const staleResults: any = await db.prepare(`
                SELECT id, provider_id, client_id, provider_amount, status_updated_at 
                FROM service_requests 
                WHERE status = 'waiting_client_confirmation' 
                AND status_updated_at < datetime('now', '-' || ? || ' minutes')
                LIMIT 50
            `).bind(timeoutMinutes).all();

        if (!staleResults.results || staleResults.results.length === 0) return;

        console.log(`[Auto-Complete] 🧹 Found ${staleResults.results.length} stale services to auto-complete`);

        // 3. Process Each
        for (const service of staleResults.results) {
            console.log(`[Auto-Complete] Completing service ${service.id} (stale since ${service.status_updated_at})`);
            const serviceId = service.id;
            const transactionId = `WT-AUTO-${serviceId}-${Date.now()}`;

            const batch = [
                // A. Update Status
                db.prepare(`
                        UPDATE service_requests 
                        SET status = ?, completed_at = CURRENT_TIMESTAMP 
                        WHERE id = ? AND status = 'waiting_client_confirmation'
                    `).bind(ServiceStatus.COMPLETED, serviceId),

                // B. Insert Wallet Entry
                db.prepare(`
                        INSERT INTO wallet_transactions (id, user_id, service_id, amount, type, description)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `).bind(
                    transactionId,
                    service.provider_id,
                    serviceId,
                    service.provider_amount || 0,
                    'earning',
                    `Recebimento automático (#${serviceId})`
                ),

                // C. Release Payment Link
                db.prepare("UPDATE payments SET status = 'released' WHERE mission_id = ? AND status = 'approved'")
                    .bind(serviceId),

                // D. Update Wallet Balance (Missing in auto-complete!)
                db.prepare(`
                        UPDATE providers 
                        SET wallet_balance = wallet_balance + ? 
                        WHERE user_id = ?
                    `).bind(service.provider_amount || 0, service.provider_id)
            ];

            const batchResults = await db.batch(batch);

            // Notify if successful
            if (batchResults[0].meta.changes > 0) {
                env.executionCtx?.waitUntil((async () => {
                    const notifyList = [service.client_id, service.provider_id].filter(Boolean);
                    await syncStatusToFirebase(
                        env,
                        serviceId,
                        ServiceStatus.COMPLETED,
                        notifyList,
                        { provider_id: service.provider_id, auto_completed: true },
                        'service.completed'
                    );
                })());
            }
        }

    } catch (error: any) {
        console.error('[Auto-Complete] ❌ Error:', error.message);
    }
}

/**
 * Scheduled Event Handler - Runs every 5 minutes
 * Checks for scheduled services that should start now
 */
async function handleScheduledServices(env: WorkerBindings) {
    try {
        LOG.sistema('🕐 Verificando serviços agendados...');

        const now = new Date().toISOString();

        // Find scheduled services that should start
        const services = await env.DB.prepare(`
                SELECT id, client_id, provider_id, scheduled_at, profession, location_type
                FROM service_requests
                WHERE status = ?
                AND scheduled_at <= ?
            `).bind(ServiceStatus.SCHEDULED, now).all();

        LOG.sistema(`📋 Encontrados ${services.results.length} serviços para iniciar`);

        for (const service of services.results) {
            try {
                // FIXED VS MOBILE LOGIC:
                // Both now transition to SCHEDULED_STARTED (Accepted/In Progress intent)
                // Payment is NOT required to start. 
                // Both parties get a Wake Up Alarm.

                const nextStatus = ServiceStatus.ACCEPTED; // Keep as ACCEPTED visually, but trigger events
                // Or we can use a new status if we want to distinguish "Started Journey"

                LOG.servico(`⏰ Acordando agendamento: ${service.id} (${service.location_type})`);

                // Update updated_at to trigger re-fetch if needed, but status remains ACCEPTED or moves to IN_PROGRESS?
                // Actually, let's keep it simple: Status remains ACCEPTED (or moves to IN_PROGRESS if we had that).
                // But we MUST trigger the 'scheduled_started' event.

                // Let's stick to 'ACCEPTED' but we update 'status_updated_at' to force refresh
                await env.DB.prepare(`
                        UPDATE service_requests
                        SET status_updated_at = ?
                        WHERE id = ?
                    `).bind(now, service.id).run();

                // Send notifications
                if (service.client_id) {
                    await sendNotificationToUser(
                        env,
                        service.client_id,
                        '⏰ Hora do Agendamento!',
                        'Seu serviço agendado está prestes a começar. Fique atento ao prestador!',
                        {
                            service_id: service.id,
                            type: 'scheduled_started', // Triggers ClientWakeUpModal
                            scheduled_at: service.scheduled_at,
                            role: 'client'
                        }
                    );
                    LOG.notificacao(`🔔 Alarm cliente enviado: ${service.client_id}`);
                }

                if (service.provider_id) {
                    const scheduledTime = new Date(service.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                    await sendNotificationToUser(
                        env,
                        service.provider_id,
                        '⏰ Hora de Iniciar!',
                        `Prepare-se! Seu serviço das ${scheduledTime} deve começar agora.`,
                        {
                            service_id: service.id,
                            type: 'scheduled_started', // Triggers ScheduledNotificationModal (Provider)
                            role: 'provider'
                        }
                    );
                    LOG.notificacao(`🔔 Alarm prestador enviado: ${service.provider_id}`);
                }

                // Sync event to Firebase so apps can react if open
                const notifyList = [service.client_id, service.provider_id].filter(Boolean);
                await syncStatusToFirebase(
                    env,
                    service.id,
                    ServiceStatus.ACCEPTED, // Status didn't change really, but we want to broadcast event
                    notifyList,
                    {
                        scheduled_at: service.scheduled_at,
                        event: 'scheduled_started'
                    },
                    'service.scheduled_started'
                );

                LOG.sucesso(`✅ Serviço ${service.id} processado (Wake Up Alarms Enviados)`);
            } catch (error: any) {
                LOG.erro(`Erro ao processar serviço ${service.id}`, error);
            }
        }

    } catch (error: any) {
        LOG.erro('Erro ao verificar serviços agendados', error);
    }
}

/**
 * Helper: Send notification to a specific user
 */
async function sendNotificationToUser(
    env: WorkerBindings,
    userId: number | string,
    title: string,
    body: string,
    data: any = {}
) {
    try {
        // Find user devices
        const devices = await env.DB.prepare(
            'SELECT token FROM notification_devices WHERE user_id = ?'
        ).bind(userId).all();

        if (!devices.results || devices.results.length === 0) {
            console.log(`[Notification] No devices found for user ${userId}`);
            return;
        }

        const tokens = devices.results.map((d: any) => d.token);
        const serviceAccount = env.FIREBASE_SERVICE_ACCOUNT;

        if (!serviceAccount) {
            console.error('[Notification] FIREBASE_SERVICE_ACCOUNT not set');
            return;
        }

        // Send to all devices
        for (const token of tokens) {
            await sendFCMNotificationV1(serviceAccount, token as string, {
                title,
                body,
                data
            });
        }
    } catch (error: any) {
        console.error('[Notification] Error sending to user:', error);
    }
}


// ==================== APPOINTMENTS / SLOTS ENDPOINTS ====================

/**
 * GET /api/appointments/:providerId/slots
 * Generates time slots for a given provider on a given date
 * based on their schedule config (provider_schedule_configs)
 */
app.get('/api/appointments/:providerId/slots', async (c) => {
    try {
        const db = c.env.DB;
        const providerId = parseInt(c.req.param('providerId'));
        const dateStr = c.req.query('date');

        if (!providerId || isNaN(providerId)) {
            return c.json({ success: false, message: 'Invalid provider ID' }, 400);
        }

        // Use today if no date provided (in Brasilia timezone UTC-3)
        const now = new Date();
        const brasiliaOffset = -3 * 60; // minutes
        const brasiliaTime = new Date(now.getTime() + (brasiliaOffset + now.getTimezoneOffset()) * 60000);

        let targetDate: Date;
        if (dateStr) {
            targetDate = new Date(dateStr + 'T00:00:00');
        } else {
            targetDate = new Date(brasiliaTime.getFullYear(), brasiliaTime.getMonth(), brasiliaTime.getDate());
        }

        // Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
        const dayOfWeek = targetDate.getDay();

        // Check if it's a schedule exception day
        const formattedDate = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
        const exception: any = await db.prepare(
            'SELECT * FROM provider_schedule_exceptions WHERE provider_id = ? AND date = ?'
        ).bind(providerId, formattedDate).first();

        if (exception) {
            // If exception exists with no times, it's a closed day
            if (!exception.start_time || !exception.end_time) {
                return c.json([]); // Closed day
            }
        }

        // Get schedule config for this day
        const config: any = await db.prepare(
            'SELECT * FROM provider_schedule_configs WHERE provider_id = ? AND day_of_week = ?'
        ).bind(providerId, dayOfWeek).first();

        if (!config || config.is_active === 0 || config.is_active === false) {
            return c.json([]); // Day not active
        }

        // Parse times from config
        const parseTime = (timeStr: string) => {
            if (!timeStr) return null;
            const parts = timeStr.split(':');
            return { hour: parseInt(parts[0]), minute: parseInt(parts[1] || '0') };
        };

        const startTime = parseTime(config.start_time);
        const endTime = parseTime(config.end_time);
        const lunchStart = parseTime(config.lunch_start);
        const lunchEnd = parseTime(config.lunch_end);
        const slotDuration = config.slot_duration || 30;

        if (!startTime || !endTime) {
            return c.json([]);
        }

        // Get existing appointments for this day AND next day (for overnight schedules)
        const isOvernight = (endTime.hour < startTime.hour) || (endTime.hour === startTime.hour && endTime.minute <= startTime.minute);

        // Calculate next day date for overnight schedules
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayFormatted = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;

        // Fetch appointments spanning both days if overnight
        const dayStart = `${formattedDate}T00:00:00`;
        const dayEnd = isOvernight ? `${nextDayFormatted}T23:59:59` : `${formattedDate}T23:59:59`;

        // Modified query to fetch client and service details
        const appointments = await db.prepare(`
                SELECT 
                    a.id, a.start_time, a.end_time, a.status, a.service_request_id, a.client_id,
                    u.full_name as client_name, u.avatar_url as client_avatar,
                    s.profession as service_profession, s.description as service_description, s.address as service_address,
                    s.status as service_status, s.price_estimated as price_total, s.price_upfront as price_paid
                FROM appointments a
                LEFT JOIN users u ON a.client_id = u.id
                LEFT JOIN service_requests s ON a.service_request_id = s.id
                WHERE a.provider_id = ? AND a.start_time >= ? AND a.start_time <= ? 
                ORDER BY a.start_time
            `).bind(providerId, dayStart, dayEnd).all();

        const appointmentList = appointments.results || [];

        // Generate slots
        const slots: any[] = [];
        let currentHour = startTime.hour;
        let currentMinute = startTime.minute;

        // Handle overnight schedules: treat end hour as 24+ for iteration
        let endHour = endTime.hour;
        let endMinute = endTime.minute;
        if (isOvernight) {
            endHour += 24; // e.g., 04:00 becomes 28:00 for iteration
        }

        while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
            // Determine which date this slot belongs to
            const actualHour = currentHour % 24;
            const crossedMidnight = currentHour >= 24;
            const slotDate = crossedMidnight ? nextDayFormatted : formattedDate;

            const slotStart = `${slotDate}T${String(actualHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}:00`;

            // Calculate next slot time
            let nextMinute = currentMinute + slotDuration;
            let nextHour = currentHour;
            while (nextMinute >= 60) {
                nextMinute -= 60;
                nextHour += 1;
            }

            const nextActualHour = nextHour % 24;
            const nextCrossedMidnight = nextHour >= 24;
            const nextSlotDate = nextCrossedMidnight ? nextDayFormatted : formattedDate;
            const slotEnd = `${nextSlotDate}T${String(nextActualHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}:00`;

            // Determine slot status
            let status = 'free';
            let appointmentId: number | null = null;
            let appointmentData: any = null;

            // Check if slot is during lunch (lunch doesn't apply after midnight typically)
            if (lunchStart && lunchEnd && !crossedMidnight) {
                const inLunch = (actualHour > lunchStart.hour || (actualHour === lunchStart.hour && currentMinute >= lunchStart.minute)) &&
                    (actualHour < lunchEnd.hour || (actualHour === lunchEnd.hour && currentMinute < lunchEnd.minute));
                if (inLunch) {
                    status = 'lunch';
                }
            }

            // Check if slot has an appointment
            if (status !== 'lunch') {
                for (const apt of appointmentList as any[]) {
                    const aptStart = apt.start_time?.substring(0, 16); // 'YYYY-MM-DDTHH:MM'
                    const slotStartTrunc = slotStart.substring(0, 16);
                    if (aptStart === slotStartTrunc) {
                        status = apt.status === 'scheduled' ? 'booked' : 'busy';
                        appointmentId = apt.id;
                        appointmentData = {
                            client_name: apt.client_name,
                            client_id: apt.client_id,
                            client_avatar: apt.client_avatar,
                            service_id: apt.service_request_id,
                            service_profession: apt.service_profession,
                            service_description: apt.service_description,
                            service_address: apt.service_address,
                            service_status: apt.service_status,
                            price_total: apt.price_total,
                            price_paid: apt.price_paid
                        };
                        break;
                    }
                }
            }

            slots.push({
                start_time: slotStart,
                end_time: slotEnd,
                status,
                appointment_id: appointmentId,
                // ...appointmentData // Spread appointment details if exists
                client_name: appointmentData?.client_name,
                client_id: appointmentData?.client_id,
                client_avatar: appointmentData?.client_avatar,
                service_id: appointmentData?.service_request_id,
                service_profession: appointmentData?.service_profession,
                service_description: appointmentData?.service_description,
                service_address: appointmentData?.service_address,
                service_status: appointmentData?.service_status,
                price_total: appointmentData?.price_total,
                price_paid: appointmentData?.price_paid
            });


            currentHour = nextHour;
            currentMinute = nextMinute;
        }

        return c.json(slots);
    } catch (error: any) {
        LOG.erro('Erro ao gerar slots', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * POST /api/appointments/busy
 * Marks a time slot as busy (provider blocks own time)
 */
app.post('/api/appointments/busy', async (c) => {
    try {
        const db = c.env.DB;
        const authHeader = c.req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ success: false, message: 'Unauthorized' }, 401);
        }

        const token = authHeader.substring(7);
        const decoded = decodeJwt(token);
        if (!decoded || !decoded.email) {
            return c.json({ success: false, message: 'Invalid token' }, 401);
        }

        const user: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
        if (!user) {
            return c.json({ success: false, message: 'User not found' }, 404);
        }

        const body = await c.req.json();
        const startTime = body.start_time;

        if (!startTime) {
            return c.json({ success: false, message: 'start_time is required' }, 400);
        }

        // Parse start_time and calculate end_time based on provider's slot_duration
        const startDate = new Date(startTime);
        const dateStr = startTime.substring(0, 10);
        const dayOfWeek = startDate.getDay();

        const config: any = await db.prepare(
            'SELECT slot_duration FROM provider_schedule_configs WHERE provider_id = ? AND day_of_week = ?'
        ).bind(user.id, dayOfWeek).first();

        const duration = config?.slot_duration || 30;
        const endDate = new Date(startDate.getTime() + duration * 60000);
        const endTime = endDate.toISOString().replace('Z', '').split('.')[0];

        // Insert blocking appointment
        await db.prepare(
            `INSERT INTO appointments (provider_id, start_time, end_time, status, notes, created_at, updated_at)
                VALUES (?, ?, ?, 'busy', 'Bloqueado pelo prestador', datetime('now'), datetime('now'))`
        ).bind(user.id, startTime, endTime).run();

        LOG.sucesso(`✅ Slot bloqueado: ${startTime} para provider ${user.id}`);
        return c.json({ success: true, message: 'Slot marked as busy' });
    } catch (error: any) {
        LOG.erro('Erro ao bloquear slot', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * POST /api/appointments/book
 * Books an appointment slot (client books a provider's time)
 */
app.post('/api/appointments/book', async (c) => {
    try {
        const db = c.env.DB;
        const authHeader = c.req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ success: false, message: 'Unauthorized' }, 401);
        }

        const token = authHeader.substring(7);
        const decoded = decodeJwt(token);
        if (!decoded || !decoded.email) {
            return c.json({ success: false, message: 'Invalid token' }, 401);
        }

        const user: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
        if (!user) {
            return c.json({ success: false, message: 'User not found' }, 404);
        }

        const body = await c.req.json();
        const { provider_id, start_time } = body;

        if (!provider_id || !start_time) {
            return c.json({ success: false, message: 'provider_id and start_time are required' }, 400);
        }

        // Get slot duration
        const startDate = new Date(start_time);
        const dayOfWeek = startDate.getDay();
        const config: any = await db.prepare(
            'SELECT slot_duration FROM provider_schedule_configs WHERE provider_id = ? AND day_of_week = ?'
        ).bind(provider_id, dayOfWeek).first();

        const duration = config?.slot_duration || 30;
        const endDate = new Date(startDate.getTime() + duration * 60000);
        const endTime = endDate.toISOString().replace('Z', '').split('.')[0];

        // Check for conflicting appointments
        const existing: any = await db.prepare(
            'SELECT id FROM appointments WHERE provider_id = ? AND start_time = ? AND status != ?'
        ).bind(provider_id, start_time, 'cancelled').first();

        if (existing) {
            return c.json({ success: false, message: 'Este horário já está ocupado' }, 409);
        }

        await db.prepare(
            `INSERT INTO appointments (provider_id, client_id, start_time, end_time, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'scheduled', datetime('now'), datetime('now'))`
        ).bind(provider_id, user.id, start_time, endTime).run();

        // Notify Provider of new appointment
        c.executionCtx.waitUntil(syncStatusToFirebase(
            c.env,
            `appt-${Date.now()}`,
            'scheduled',
            [provider_id],
            {
                start_time,
                client_name: user.name || 'User',
                type: 'schedule_update'
            },
            'schedule_update'
        ));

        LOG.sucesso(`✅ Agendamento criado: ${start_time} provider ${provider_id} client ${user.id}`);
        return c.json({ success: true, message: 'Appointment booked' });
    } catch (error: any) {
        LOG.erro('Erro ao agendar', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * DELETE /api/appointments/:id
 * Deletes/cancels an appointment
 */
app.delete('/api/appointments/:id', async (c) => {
    try {
        const db = c.env.DB;
        const authHeader = c.req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ success: false, message: 'Unauthorized' }, 401);
        }

        const token = authHeader.substring(7);
        const decoded = decodeJwt(token);
        if (!decoded || !decoded.email) {
            return c.json({ success: false, message: 'Invalid token' }, 401);
        }

        const user: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
        if (!user) {
            return c.json({ success: false, message: 'User not found' }, 404);
        }

        const appointmentId = parseInt(c.req.param('id'));
        if (!appointmentId || isNaN(appointmentId)) {
            return c.json({ success: false, message: 'Invalid appointment ID' }, 400);
        }

        // Verify ownership
        const appointment: any = await db.prepare(
            'SELECT id, provider_id, client_id FROM appointments WHERE id = ?'
        ).bind(appointmentId).first();

        if (!appointment) {
            return c.json({ success: false, message: 'Appointment not found' }, 404);
        }

        if (appointment.provider_id !== user.id && appointment.client_id !== user.id) {
            return c.json({ success: false, message: 'Not authorized to delete this appointment' }, 403);
        }

        await db.prepare('DELETE FROM appointments WHERE id = ?').bind(appointmentId).run();

        LOG.sucesso(`✅ Agendamento ${appointmentId} removido por user ${user.id}`);
        return c.json({ success: true, message: 'Appointment deleted' });
    } catch (error: any) {
        LOG.erro('Erro ao deletar agendamento', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

// ==================== SCHEDULE CONFIG ENDPOINTS ====================

/**
 * GET /api/appointments/config
 * Returns the provider's schedule configuration for all days of the week
 */
app.get('/api/appointments/config', async (c) => {
    try {
        const db = c.env.DB;
        const authHeader = c.req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ success: false, message: 'Unauthorized' }, 401);
        }

        const token = authHeader.substring(7);
        const decoded = decodeJwt(token);
        if (!decoded || !decoded.email) {
            return c.json({ success: false, message: 'Invalid token' }, 401);
        }

        const user: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
        if (!user) {
            return c.json({ success: false, message: 'User not found' }, 404);
        }

        const configs = await db.prepare(
            'SELECT id, provider_id, day_of_week, start_time, end_time, is_active, lunch_start, lunch_end, slot_duration FROM provider_schedule_configs WHERE provider_id = ? ORDER BY day_of_week'
        ).bind(user.id).all();

        return c.json(configs.results || []);
    } catch (error: any) {
        LOG.erro('Erro ao buscar schedule config', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * POST /api/appointments/config
 * Saves the provider's schedule configuration (upsert for each day)
 */
app.post('/api/appointments/config', async (c) => {
    try {
        const db = c.env.DB;
        const authHeader = c.req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ success: false, message: 'Unauthorized' }, 401);
        }

        const token = authHeader.substring(7);
        const decoded = decodeJwt(token);
        if (!decoded || !decoded.email) {
            return c.json({ success: false, message: 'Invalid token' }, 401);
        }

        const user: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
        if (!user) {
            return c.json({ success: false, message: 'User not found' }, 404);
        }

        const body = await c.req.json();
        const configs = Array.isArray(body) ? body : (body.configs || []);

        // Delete existing configs and re-insert (simpler than upsert in D1)
        await db.prepare('DELETE FROM provider_schedule_configs WHERE provider_id = ?').bind(user.id).run();

        for (const conf of configs) {
            await db.prepare(
                `INSERT INTO provider_schedule_configs (provider_id, day_of_week, start_time, end_time, is_active, lunch_start, lunch_end, slot_duration, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
            ).bind(
                user.id,
                conf.day_of_week,
                conf.start_time || '08:00:00',
                conf.end_time || '18:00:00',
                conf.is_enabled === true || conf.is_active === true ? 1 : 0,
                conf.lunch_start || null,
                conf.lunch_end || null,
                conf.slot_duration || 30
            ).run();
        }

        LOG.sucesso(`✅ Schedule config salvo para provider ${user.id}`);
        return c.json({ success: true, message: 'Config saved' });
    } catch (error: any) {
        LOG.erro('Erro ao salvar schedule config', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * GET /api/provider/schedule/exceptions
 * Returns the provider's schedule exceptions (holidays, special dates)
 */
app.get('/api/provider/schedule/exceptions', async (c) => {
    try {
        const db = c.env.DB;
        const authHeader = c.req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ success: false, message: 'Unauthorized' }, 401);
        }

        const token = authHeader.substring(7);
        const decoded = decodeJwt(token);
        if (!decoded || !decoded.email) {
            return c.json({ success: false, message: 'Invalid token' }, 401);
        }

        const user: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
        if (!user) {
            return c.json({ success: false, message: 'User not found' }, 404);
        }

        const exceptions = await db.prepare(
            'SELECT id, provider_id, date, start_time, end_time, reason FROM provider_schedule_exceptions WHERE provider_id = ? ORDER BY date'
        ).bind(user.id).all();

        return c.json({ exceptions: exceptions.results || [] });
    } catch (error: any) {
        LOG.erro('Erro ao buscar schedule exceptions', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

/**
 * POST /api/provider/schedule/exceptions
 * Saves the provider's schedule exceptions (replaces all)
 */
app.post('/api/provider/schedule/exceptions', async (c) => {
    try {
        const db = c.env.DB;
        const authHeader = c.req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ success: false, message: 'Unauthorized' }, 401);
        }

        const token = authHeader.substring(7);
        const decoded = decodeJwt(token);
        if (!decoded || !decoded.email) {
            return c.json({ success: false, message: 'Invalid token' }, 401);
        }

        const user: any = await db.prepare('SELECT id FROM users WHERE email = ?').bind(decoded.email).first();
        if (!user) {
            return c.json({ success: false, message: 'User not found' }, 404);
        }

        const body = await c.req.json();
        const exceptions = body.exceptions || [];

        // Delete existing exceptions and re-insert
        await db.prepare('DELETE FROM provider_schedule_exceptions WHERE provider_id = ?').bind(user.id).run();

        for (const ex of exceptions) {
            await db.prepare(
                `INSERT INTO provider_schedule_exceptions (provider_id, date, start_time, end_time, reason)
                    VALUES (?, ?, ?, ?, ?)`
            ).bind(
                user.id,
                ex.date,
                ex.start_time || null,
                ex.end_time || null,
                ex.reason || (ex.is_closed ? 'Fechado' : null)
            ).run();
        }

        LOG.sucesso(`✅ Schedule exceptions salvas para provider ${user.id}`);
        return c.json({ success: true, message: 'Exceptions saved' });
    } catch (error: any) {
        LOG.erro('Erro ao salvar schedule exceptions', error);
        return c.json({ success: false, error: error.message }, 500);
    }
});

// --- Debug Endpoints ---

app.get('/api/debug/firestore-test', async (c) => {
    const env = c.env;
    const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT;

    if (!serviceAccountJson) {
        return c.json({ success: false, error: 'FIREBASE_SERVICE_ACCOUNT not configured' }, 500);
    }

    try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        const projectId = serviceAccount.project_id;
        const accessToken = await getAccessTokenFromServiceAccount(serviceAccountJson);

        if (!accessToken) {
            return c.json({ success: false, error: 'Failed to get OAuth token' }, 500);
        }

        const testId = `test_${Date.now()}`;
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/_debug/${testId}`;

        const resp = await fetch(firestoreUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    status: { stringValue: 'ok' },
                    timestamp: { integerValue: Date.now().toString() },
                    message: { stringValue: 'Hello from Cloudflare Worker!' }
                }
            })
        });

        if (resp.ok) {
            return c.json({ success: true, message: 'Firestore write successful', docId: testId, projectId });
        } else {
            const errText = await resp.text();
            return c.json({ success: false, error: 'Firestore write failed', details: errText }, 500);
        }
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

export default {
    fetch: app.fetch,
    scheduled: async (event: ScheduledEvent, env: WorkerBindings, ctx: ExecutionContext) => {
        LOG.sistema(`⏲️ Cron Trigger: ${event.cron || 'manual'}`);

        // 1. Dispatcher Watchdog
        const id = env.DISPATCH_MANAGER.idFromName('GLOBAL_DISPATCHER');
        const obj = env.DISPATCH_MANAGER.get(id);
        ctx.waitUntil(
            obj.fetch(new Request(`http://dispatch/wake-up`, { method: 'POST' }))
        );

        // 2. Service Auto-Completion Watchdog
        ctx.waitUntil(checkAutoCompletion(env));

        // 3. Handle Scheduled Services
        ctx.waitUntil(handleScheduledServices(env));
    }
};

// --- Uber-like Module Helpers ---

/**
 * Sincroniza o status da viagem com o Firestore para tempo real
 */
async function syncTripToFirebase(env: any, tripId: string, data: any) {
    try {
        const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT;
        if (!serviceAccountJson) return;

        const serviceAccount = JSON.parse(serviceAccountJson);
        const accessToken = await getAccessTokenFromServiceAccount(serviceAccountJson);

        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)/documents/trips/${tripId}`;

        const fields: any = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                fields[key] = { stringValue: value };
            } else if (typeof value === 'number') {
                fields[key] = { doubleValue: value };
            } else if (typeof value === 'boolean') {
                fields[key] = { booleanValue: value };
            }
        }

        // Adicionar timestamp
        fields['updated_at'] = { integerValue: Date.now().toString() };

        await fetch(firestoreUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields })
        });
    } catch (e) {
        LOG.erro(`Erro ao sincronizar viagem ${tripId} com Firebase:`, e);
    }
}

/**
 * Busca motoristas próximos que estão online
 */
async function findNearbyDrivers(db: any, lat: number, lng: number, radiusKm: number) {
    const latDelta = radiusKm / 111.32;
    const lngDelta = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180));

    const result = await db.prepare(`
        SELECT da.driver_id, da.current_latitude, da.current_longitude, nr.fcm_token
        FROM driver_availability da
        JOIN notification_registry nr ON da.driver_id = nr.user_id
        WHERE da.is_online = 1 
          AND da.current_latitude BETWEEN ? AND ?
          AND da.current_longitude BETWEEN ? AND ?
    `).bind(
        lat - latDelta, lat + latDelta,
        lng - lngDelta, lng + lngDelta
    ).all();

    return (result.results || []).filter((d: any) => {
        const dist = calculateDistance(lat, lng, d.current_latitude, d.current_longitude);
        return dist <= radiusKm;
    });
}

