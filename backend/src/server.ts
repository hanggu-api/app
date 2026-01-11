import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import http from "http";
// Socket.IO removed in favor of Firebase
import { io } from "./platform"; 
import { closePool } from "./database/db";
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
mainApp.use(API_PREFIX, app);
// Also mount at root for backward compatibility and local convenience
mainApp.use("/", app);

// Keep /health at root for convenience/monitoring tools that expect it there (redundant if app has it, but safe)
mainApp.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

import { startLocationSync } from "./services/locationSyncService";
import { providerDispatcher } from "./services/providerDispatcher";
import pool from "./database/db";
import admin from "./config/firebase";

const printStatus = async () => {
  console.log("\n📊 STATUS DOS SERVIÇOS:");
  
  // 1. Check Database
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log("🟢 Banco de Dados (MySQL): ONLINE");
  } catch (err: any) {
    console.log(`🔴 Banco de Dados (MySQL): OFFLINE (${err.message})`);
  }

  // 2. Check Firebase
  try {
    // Basic check if app is initialized
    if (admin.apps.length > 0) {
       // Optional: Try a lightweight operation if needed, but existence is usually enough for "connected" state in Admin SDK
      console.log(`🟢 Firebase Admin: ONLINE (Project: ${process.env.FIREBASE_PROJECT_ID || 'Unknown'})`);
    } else {
      console.log("🔴 Firebase Admin: NOT INITIALIZED");
    }
  } catch (err: any) {
    console.log(`🔴 Firebase Admin: ERROR (${err.message})`);
  }

  // 3. Server Info
  console.log(`🟢 API Server: ONLINE (Port: ${process.env.PORT || 4011})`);
  console.log("--------------------------------------------------\n");
};

httpServer.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);

  // Recover any stuck dispatches from before restart
  providerDispatcher.recover();

  // Initialize Background Services
  startLocationSync();

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

// Graceful Shutdown
const shutdown = async () => {
  console.log("🛑 Encerrando servidor...");
  await closePool();
  httpServer.close(() => {
    console.log("👋 Servidor encerrado.");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
