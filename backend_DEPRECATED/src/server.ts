import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

// Forçar fuso horário de Brasília (UTC-3)
process.env.TZ = "America/Sao_Paulo";
import http from "http";
// Socket.IO removed in favor of Firebase
import { io } from "./platform";
import prisma from "./database/prisma";
import app from "./app";
import { notificationManager } from "./notifications/manager";
import logger from "./utils/logger";
import { updateProviderLocation } from "./services/locationService";

if (process.env.NODE_ENV !== "test") {
  dotenv.config();
}

const mainApp = express();
const PORT = process.env.PORT || 4011;
const httpServer = http.createServer(mainApp);

// Trust proxy for mainApp as well (essential for correct IP resolution behind proxies)
mainApp.set("trust proxy", 1);

// Socket.IO Server initialization removed.
// We now use Firebase Realtime Database / Firestore for real-time features.
// The 'io' imported from './platform' acts as an adapter to Firebase.

// Middleware
mainApp.use(helmet());
mainApp.use(cors()); // Allow all for dev
mainApp.use(express.json());

// 📝 GLOBAL REQUEST LOGGER
mainApp.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ➡️  ${req.method} ${req.path}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ⬅️  ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
  });

  next();
});

const API_PREFIX = (process.env.API_PREFIX || "/api").replace(/\/+$/, "") || "";

mainApp.post(`${API_PREFIX}/test-notification`, async (req, res) => {
  try {
    const { userId, title, body, type } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    await notificationManager.send(
      Number(userId),
      type || "test_notification",
      "0",
      title || "Teste de Notificação",
      body || "Esta é uma notificação de teste enviada pelo backend.",
      { timestamp: new Date().toISOString() },
    );

    res.json({ success: true, message: `Notification sent to user ${userId}` });
  } catch (error) {
    console.error("Test notification error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

mainApp.post(`${API_PREFIX}/test-socket-event`, async (req, res) => {
  try {
    const { userId, serviceId } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const sId = serviceId || "test-service-id";
    const payload = {
      service_id: sId,
      service: {
        id: sId,
        description: "TESTE: Pedido de Serviço Simulado",
        latitude: -23.5505,
        longitude: -46.6333,
        address: "Rua de Teste, 123",
        profession: "Pedreiro",
        category_id: 1,
        status: "pending",
        user_id: 1, // Dummy client
        created_at: new Date().toISOString()
      },
      timeout_ms: 30000,
      cycle: 1
    };

    console.log(`🔌 Emitting 'service.offered' to user:${userId}`);
    io.to(`user:${userId}`).emit("service.offered", payload);

    // Also send Push Notification (FCM)
    await notificationManager.send(
      Number(userId),
      "service_offered",
      sId,
      "Novo Serviço (Teste)",
      "Toque para aceitar este pedido de teste!",
      { service_id: sId, type: "offer" }
    );

    res.json({ success: true, message: `Socket event & Push sent to user:${userId}` });
  } catch (error) {
    console.error("Test socket error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

// Mount the imported app
// Mount the imported app
// mainApp.use(API_PREFIX, app); // CAUTION: app.ts defines routes with /api prefix, so mounting at /api would strip it and break routing.
// Keep /health and / at root for monitoring
mainApp.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "101 Backend API is Running! 🚀",
    timestamp: new Date().toISOString()
  });
});

mainApp.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, version: 2 });
});

// Mount the imported app
mainApp.use("/", app);

import { startLocationSync } from "./services/locationSyncService";
import { chatListener } from "./services/chatListener";
import { providerDispatcher } from "./services/providerDispatcher";
import admin from "./config/firebase";

const printStatus = async () => {
  console.log("\n📊 STATUS DOS SERVIÇOS:");

  // 1. Cloudflare D1 (Main Architecture)
  console.log("🟢 Arquitetura Principal: Cloudflare D1 (Workers)");

  // 2. Legacy / Support Database (Prisma / Supabase / Postgres)
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("🟢 Banco de Dados Legado (Prisma/Postgres): ONLINE");
  } catch (err: any) {
    console.log(`🟡 Banco de Dados Legado (Prisma/Postgres): OFFLINE (${err.message})`);
  }

  // 3. Check Firebase
  try {
    if (admin.apps.length > 0) {
      console.log(`🟢 Firebase Admin: ONLINE (Project: ${process.env.FIREBASE_PROJECT_ID || 'Unknown'})`);
    } else {
      console.log("🔴 Firebase Admin: NOT INITIALIZED");
    }
  } catch (err: any) {
    console.log(`🔴 Firebase Admin: ERROR (${err.message})`);
  }

  console.log(`🟢 API Server Gateway: ONLINE (Port: ${process.env.PORT || 4011})`);
  console.log("--------------------------------------------------\n");
};

// Export for Vercel
export default mainApp;

if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  httpServer.listen(PORT, async () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);

    // Recover any stuck dispatches from before restart
    providerDispatcher.recover();

    // Initialize Background Services
    startLocationSync();
    chatListener.start();

    // Print visual status
    await printStatus();

    // Signal PM2 that the application is ready
    if (process.send) {
      process.send("ready");
    }

    // Background jobs
    const ONE_HOUR = 3600000;
    setInterval(() => {
      // Optional background tasks
    }, ONE_HOUR * 6);
    console.log("📅 Background training scheduled (every 6 hours).");
  });
}

// Graceful Shutdown
const shutdown = async () => {
  console.log("🛑 Encerrando servidor...");
  await prisma.$disconnect();
  httpServer.close(() => {
    console.log("👋 Servidor encerrado.");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
