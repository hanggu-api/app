
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { USERS, PROVIDERS, SERVICES, NOTIFICATIONS } from './mock_data';

const app = express();
const PORT = 4012;

app.use(cors());
app.use(bodyParser.json());

// --- AUTH ---
app.post('/api/auth/login', (req, res) => {
    // Fake login: accepts any token, returns first user
    // Or if email provided, match user
    console.log('[Auth] Login request', req.body);
    const user = USERS[0]; // Always return 'Investidor Demo'
    res.json({
        success: true,
        user: {
            ...user,
            token: "fake-jwt-token-demo"
        }
    });
});

app.post('/api/auth/register', (req, res) => {
    console.log('[Auth] Register request', req.body);
    const newUser = { id: USERS.length + 1, ...req.body, role: 'client' };
    USERS.push(newUser);
    res.json({
        success: true,
        user: {
            ...newUser,
            token: "fake-jwt-token-demo"
        }
    });
});

// --- PROFILE ---
app.get('/api/profile/me', (req, res) => {
    // Return mock user
    res.json({ success: true, user: USERS[0] });
});

// --- AI CLASSIFICATION ---
app.post('/api/services/ai/classify', (req, res) => {
    const { text } = req.body;
    console.log(`[AI] Classifying: "${text}"`);

    if (!text) return res.status(400).json({ error: "No text" });

    // Simple keyword matching
    const normalized = text.toLowerCase();

    // Improved matching: Split input into words and check if ANY keyword matches a word exactly
    // OR check if keyword matches a multi-word phrase in the input
    const match = SERVICES.find(s => {
        return s.keywords.some(k => {
            const keyword = k.toLowerCase();
            // 1. Exact phrase match (e.g. "ar condicionado")
            if (normalized.includes(keyword)) return true;

            // 2. Exact word match (e.g. "ar") prevents "cort[ar]" triggering "ar"
            // We pad with spaces to ensure we match whole words
            return ` ${normalized} `.includes(` ${keyword} `);
        });
    });

    if (match) {
        console.log(`[AI] Match found: ${match.name}`);
        return res.json({
            encontrado: true,
            // Compatible with Mobile App expectations
            categoria_id: 1, // Default category
            categoria: "Serviços Gerais",
            profissao: match.profession_name, // Mapped to 'profissao'
            confianca: 0.99,

            // Task details
            task: {
                id: match.id,
                name: match.task_name,
                unit_price: match.price
            },

            // Extra legacy fields just in case
            id: match.id,
            name: match.profession_name,
            task_name: match.task_name,
            price: match.price,
            pricing_type: match.pricing_type,
            unit_name: "Unidade",
            service_type: match.service_type,

            candidates: SERVICES.filter(s => s.id !== match.id).slice(0, 2).map(s => ({
                id: s.id,
                name: s.profession_name,
                task_name: s.task_name,
                price: s.price,
                service_type: s.service_type
            }))
        });
    }

    // Default fallback
    console.log(`[AI] No match, returning generic fallback.`);
    return res.json({
        encontrado: false,
        candidates: SERVICES.slice(0, 3).map(s => ({
            id: s.id,
            name: s.profession_name,
            task_name: s.task_name,
            price: s.price
        }))
    });
});

// --- PROVIDERS ---
app.get('/api/providers/search', (req, res) => {
    const term = (req.query.term as string || '').toLowerCase();
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    console.log(`[Providers] Searching term="${term}" lat=${lat} lon=${lon}`);

    const matches = PROVIDERS.filter(p => {
        // Name match
        if (p.name.toLowerCase().includes(term)) return true;
        // Profession match
        return p.professions.some(prof => prof.toLowerCase().includes(term));
    });

    console.log(`[Providers] Found ${matches.length} matches.`);
    res.json(matches);
});

app.get('/api/providers', (req, res) => {
    res.json(PROVIDERS);
});

// --- APPOINTMENTS (Mock) ---
app.get('/api/appointments/:providerId/slots', (req, res) => {
    const { providerId } = req.params;
    const { date } = req.query;
    console.log(`[Appointments] Getting slots for provider ${providerId} on ${date}`);

    // Generate fake slots
    const slots = [];
    const baseHour = 8;
    for (let i = 0; i < 10; i++) {
        const hour = baseHour + i;
        // 50% chance of being free, unless it's demo/forced
        const isFree = Math.random() > 0.3;

        // Ensure at least some slots are free for demo
        const status = (i % 2 === 0 || isFree) ? 'free' : 'busy';

        slots.push({
            start_time: `${date}T${hour.toString().padStart(2, '0')}:00:00`,
            end_time: `${date}T${hour.toString().padStart(2, '0')}:30:00`,
            status: status
        });

        // Half hour slot
        slots.push({
            start_time: `${date}T${hour.toString().padStart(2, '0')}:30:00`,
            end_time: `${date}T${(hour + 1).toString().padStart(2, '0')}:00:00`,
            status: 'free' // Make half-hours mostly free
        });
    }

    res.json(slots);
});

// --- NOTIFICATIONS ---
app.get('/api/notifications', (req, res) => {
    res.json(NOTIFICATIONS);
});

// --- APPOINTMENTS (Mock) ---
app.post('/api/appointments/book', (req, res) => {
    console.log('[Appointment] Book request', req.body);
    // Simulate Random Fake Notification
    setTimeout(() => {
        console.log('[Notification] Sending fake confirmation...');
        // In a real app we'd emit a socket event. Here polling will catch it if we implemented polling.
        // For demo, just successful response is often enough.
    }, 2000);

    res.json({ success: true, message: "Agendamento realizado com sucesso (Demo)!" });
});

app.listen(PORT, () => {
    console.log(`🚀 DEMO Backend running on http://localhost:${PORT}`);
});
