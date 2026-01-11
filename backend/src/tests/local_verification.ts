
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import axios from "axios";
import { Server } from "http";
import pool, { closePool } from "../database/db";
import app from "../app";

// Load env vars
dotenv.config();

const PORT = 4012; // Test port
const BASE_URL = `http://localhost:${PORT}`;

async function runVerification() {
  console.log("🔍 Starting Local Verification Suite...");
  let server: Server | null = null;
  let errors: string[] = [];

  try {
    // 1. Verify Environment Variables
    console.log("\n1️⃣  Verifying Environment Variables...");
    const requiredEnv = ["DB_HOST", "DB_USER", "DB_NAME", "FIREBASE_PROJECT_ID"];
    const missingEnv = requiredEnv.filter((key) => !process.env[key]);
    if (missingEnv.length > 0) {
      throw new Error(`Missing environment variables: ${missingEnv.join(", ")}`);
    }
    console.log("✅ Environment variables present.");

    // 2. Verify Service Account Key
    console.log("\n2️⃣  Verifying Service Account Key...");
    const keyPath = path.resolve(__dirname, "../../serviceAccountKey.json");
    if (!fs.existsSync(keyPath)) {
      throw new Error(`serviceAccountKey.json not found at ${keyPath}`);
    }
    console.log("✅ serviceAccountKey.json found.");

    // 3. Verify Database Connection
    console.log("\n3️⃣  Verifying Database Connection...");
    try {
      await pool.query("SELECT 1");
      console.log("✅ Database connection successful.");
    } catch (e: any) {
      throw new Error(`Database connection failed: ${e.message}`);
    }

    // 4. Start Server & Test Endpoints
    console.log("\n4️⃣  Starting Server & Testing Endpoints...");
    await new Promise<void>((resolve) => {
      server = app.listen(PORT, () => {
        console.log(`   Test server running on port ${PORT}`);
        resolve();
      });
    });

    // 4a. Test /health
    console.log("   Testing GET /health...");
    const healthRes = await axios.get(`${BASE_URL}/health`);
    if (healthRes.status === 200 && healthRes.data.ok) {
      console.log("✅ /health check passed.");
    } else {
      errors.push(`/health returned status ${healthRes.status}`);
    }

    // 4b. Test / (Root)
    console.log("   Testing GET /...");
    const rootRes = await axios.get(`${BASE_URL}/`);
    if (rootRes.status === 200) {
      console.log("✅ Root endpoint passed.");
    } else {
      errors.push(`Root endpoint returned status ${rootRes.status}`);
    }

  } catch (error: any) {
    console.error("\n❌ Verification Failed!");
    console.error(error.message);
    process.exit(1);
  } finally {
    // Cleanup
    console.log("\n🧹 Cleaning up...");
    if (server) {
      (server as any).close();
    }
    await closePool();
    
    if (errors.length > 0) {
      console.error("❌ Some tests failed:");
      errors.forEach((e) => console.error(`   - ${e}`));
      process.exit(1);
    } else {
      console.log("\n✨ ALL TESTS PASSED! Your backend is ready for deployment. ✨");
      process.exit(0);
    }
  }
}

runVerification();
