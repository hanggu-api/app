import cors from "cors";
import express from "express";
import helmet from "helmet";
import appointmentRoutes from "./routes/appointments";
import authRoutes from "./routes/auth";
import chatRoutes from "./routes/chat";
import fuelRoutes from "./routes/fuel";
import integrationRoutes from "./routes/integration";
import locationRoutes from "./routes/location";
import mediaRoutes from "./routes/media";
import notificationRoutes from "./routes/notifications";
import paymentRoutes from "./routes/payment.routes";
import profileRoutes from "./routes/profile";
import providerRoutes from "./routes/providers";
import providerSetupRoutes from "./routes/providerSetup";
import serviceRoutes from "./routes/services";
import settingsRoutes from "./routes/settings";
import logger from "./utils/logger";

// classifier carregado dinamicamente apenas fora de ambientes serverless
let _classifyText:
  | ((text: string) => Promise<{ id: number; name: string; score: number }>)
  | null = null;
const getClassifier = async () => {
  if (!_classifyText) {
    const mod = await import("./ai/localClassifier");
    _classifyText = mod.classifyText;
  }
  return _classifyText;
};

import rateLimit from "express-rate-limit";

const app = express();

const TRUST_PROXY = Number(process.env.TRUST_PROXY || 1);
app.set("trust proxy", TRUST_PROXY);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https://firebasestorage.googleapis.com", "*.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests from this IP, please try again later." },
  validate: { xForwardedForHeader: false } // Disable validation to prevent crashes behind proxies
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Limit each IP to 1000 registrations/logins per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login/registration attempts. Please try again in an hour." },
  validate: { xForwardedForHeader: false } // Disable validation to prevent crashes behind proxies
});

app.use(cors({
  origin: process.env.CORS_ALLOWED_ORIGINS === '*' ? '*' : (process.env.NODE_ENV === 'production' ? [process.env.CORS_ALLOWED_ORIGINS, 'https://cardapyia.com', 'https://www.cardapyia.com', 'https://backend-iota-lyart-77.vercel.app', 'https://cardapyia-service-2025.web.app'].filter((o): o is string => !!o) : '*'),
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
}));

import securityMiddleware from "./middleware/securityMiddleware";

app.use(express.json());
app.use(securityMiddleware);
app.use("/api", generalLimiter);
app.use("/api/auth", authLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/fuel", fuelRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/provider", providerSetupRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/geo", locationRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/integrations", integrationRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, _res: express.Response, _next: express.NextFunction) => {
  logger.error("Global Error Handler", err);
  _res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

app.get("/", (_req, res) => {
  res.send("101 Service API Running (Serverless)");
});
app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, v: 2 });
});

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const aliases: Record<string, string> = {
  caia: "calha",
  calia: "calha",
  telhado: "telhado",
  goteira: "vazamento",
  emfiltracao: "infiltracao",
  enfiltracao: "infiltracao",
  eletricista: "eletricista",
  eletrecista: "eletricista",
  eltricista: "eletricista",
  fuzivel: "disjuntor",
  disjuntor: "disjuntor",
  lampada: "lampada",
  lanpada: "lampada",
  tomada: "tomada",
  tumada: "tomada",
  encanador: "encanador",
  incanador: "encanador",
  vazamento: "vazamento",
  vazamentu: "vazamento",
  desentupir: "desentupir",
  desentupi: "desentupir",
  vazo: "vaso",
  "vazo sanitario": "vaso",
  torneira: "torneira",
  turneira: "torneira",
  ceifao: "sifao",
  sifao: "sifao",
  peneu: "pneu",
  puneu: "pneu",
  boracheiro: "borracheiro",
  calibragen: "calibragem",
  calibragem: "calibragem",
  estepe: "estepe",
  estepi: "estepe",
  mecanico: "mecanico",
  micanico: "mecanico",
  feichadura: "fechadura",
  fechadua: "fechadura",
  chaveiro: "chaveiro",
  chavelro: "chaveiro",
  tranca: "tranca",
  pintor: "pintor",
  pintura: "pintura",
  "ar condicionado": "ar condicionado",
  arcondicionado: "ar condicionado",
  geladeira: "geladeira",
  geladera: "geladeira",
  "maquina de lavar": "maquina de lavar",
  "macina de lavar": "maquina de lavar",
};
const applyAliases = (t: string): string => {
  let r = t;
  for (const k of Object.keys(aliases)) {
    const v = aliases[k];
    const re = new RegExp(`\\b${k}\\b`, "g");
    r = r.replace(re, v);
  }
  return r;
};

type Prof = { id: number; name: string; search_vector: number[] };
let professions: Prof[] = [];
try {
  const professionsJson = require("./ai/professions.json");
  professions = (professionsJson as any).map((r: any) => ({
    id: Number(r.id || 0),
    name: String(r.name || ""),
    search_vector: Array.isArray(r.search_vector)
      ? r.search_vector.map((n: any) => Number(n || 0))
      : [],
  }));
} catch (e) {
  console.warn("Failed to load professions.json", e);
}
const cosSim = (a: number[], b: number[]): number => {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return -1;
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i],
      y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
};
const meanPool = (out: any): number[] => {
  if (out && Array.isArray(out)) {
    if (Array.isArray(out[0]) && Array.isArray(out[0][0])) {
      const tokens = out[0] as number[][];
      const dim = tokens[0].length;
      const sum = new Array(dim).fill(0);
      for (const t of tokens) {
        for (let i = 0; i < dim; i++) sum[i] += Number(t[i] || 0);
      }
      const den = tokens.length || 1;
      return sum.map((v) => v / den);
    } else if (Array.isArray(out[0])) {
      return (out[0] as number[]).map((n) => Number(n || 0));
    }
  }
  return [];
};
const hfToken = process.env.HF_API_TOKEN || "";
const classifyRemote = async (
  text: string,
): Promise<{ id: number; name: string; score: number }> => {
  const url =
    "https://api-inference.huggingface.co/models/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2";
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(hfToken ? { Authorization: `Bearer ${hfToken}` } : {}),
    },
    body: JSON.stringify({ inputs: text }),
  });
  if (!resp.ok) return { id: 0, name: "", score: -1 };
  const arr = await resp.json();
  const emb = meanPool(arr);
  let best = { id: 0, name: "", score: -1 };
  for (const p of professions) {
    const s = cosSim(emb, p.search_vector || []);
    if (s > best.score) best = { id: p.id, name: p.name, score: s };
  }
  return best;
};
app.post("/classify", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text) {
      res.status(400).json({ success: false, message: "text required" });
      return;
    }
    const isServerless = !!process.env.VERCEL || !!process.env.NEXT_RUNTIME;
    const t = applyAliases(norm(text)).replace(/\s+/g, " ");
    const veh =
      t.includes("carro") ||
      t.includes("automovel") ||
      t.includes("automóvel") ||
      t.includes("veiculo") ||
      t.includes("veículo");
    const moto = t.includes("moto");
    const bike = t.includes("bicicleta") || t.includes("bike");
    const tire =
      t.includes("pneu") ||
      t.includes("estepe") ||
      t.includes("calibragem") ||
      t.includes("remendo") ||
      t.includes("camara de ar") ||
      t.includes("câmara de ar");
    if (tire) {
      const nome = veh
        ? "Troca de Pneu de Carro"
        : moto
          ? "Troca de Pneu de Moto"
          : bike
            ? "Troca de Pneu de Bicicleta"
            : "Borracheiro";
      res.json({
        success: true,
        encontrado: true,
        profissao: nome,
        confianca: 0.9,
      });
      return;
    }
    const hasAny = (arr: string[]) => arr.some((k) => t.includes(norm(k)));
    if (
      hasAny([
        "tomada",
        "interruptor",
        "disjuntor",
        "fiacao",
        "fiação",
        "curto",
        "quadro de luz",
        "chuveiro",
      ])
    ) {
      res.json({
        success: true,
        encontrado: true,
        profissao: "Eletricista",
        confianca: 0.85,
      });
      return;
    }
    if (
      hasAny([
        "vazamento",
        "cano",
        "canos",
        "pia",
        "torneira",
        "ralo",
        "esgoto",
      ])
    ) {
      res.json({
        success: true,
        encontrado: true,
        profissao: "Encanador",
        confianca: 0.8,
      });
      return;
    }
    if (
      hasAny([
        "pintura",
        "pintar",
        "tinta",
        "parede",
        "massa corrida",
        "mofo",
        "lixa",
      ])
    ) {
      res.json({
        success: true,
        encontrado: true,
        profissao: "Pintor",
        confianca: 0.8,
      });
      return;
    }
    if (
      hasAny([
        "ignicao",
        "ignição",
        "arranque",
        "bateria",
        "motor",
        "não liga",
        "nao liga",
        "partida",
      ])
    ) {
      res.json({
        success: true,
        encontrado: true,
        profissao: "Mecânico",
        confianca: 0.8,
      });
      return;
    }
    if (
      hasAny([
        "chave",
        "fechadura",
        "tranca",
        "cadeado",
        "copia de chave",
        "cópia de chave",
        "perdi a chave",
      ])
    ) {
      res.json({
        success: true,
        encontrado: true,
        profissao: "Chaveiro",
        confianca: 0.8,
      });
      return;
    }
    if (isServerless) {
      const best = await classifyRemote(text);
      const conf = Number(best.score || 0);
      if (!best || conf < 0.45) {
        res.json({
          success: true,
          encontrado: false,
          message:
            "Não consegui identificar o profissional. Pode dar mais detalhes?",
        });
        return;
      }
      res.json({
        success: true,
        encontrado: true,
        profissao: best.name,
        confianca: Number(conf.toFixed(2)),
      });
      return;
    }
    const classifyText = await getClassifier();
    const best = await classifyText(text);
    const conf = Number(best.score || 0);
    if (!best || conf < 0.45) {
      res.json({
        success: true,
        encontrado: false,
        message:
          "Não consegui identificar o profissional. Pode dar mais detalhes?",
      });
      return;
    }
    res.json({
      success: true,
      encontrado: true,
      profissao: best.name,
      confianca: Number(conf.toFixed(2)),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default app;
