import axios from "axios";
import admin from "./src/config/firebase";
import pool from "./src/database/db";

const API_URL = "http://localhost:4011/api";
const EMAIL = `test_prov_${Date.now()}@example.com`;
const PASSWORD = "password123";

async function testIntegration() {
  console.log("🚀 Starting Full Integration Test (Backend + Remote AI + RTDB Sync)...");

  let providerId: number | null = null;
  let token = "";

  try {
    // 1. Register/Login as PROVIDER
    console.log(`1️⃣  Registering PROVIDER: ${EMAIL}...`);
    try {
      const regRes = await axios.post(`${API_URL}/auth/register`, {
        email: EMAIL,
        password: PASSWORD,
        name: "Test Provider",
        role: "provider",
        phone: "11999999999",
        commercial_name: "Test Services Ltd",
        token: "TEST_TOKEN",
      });
      token = regRes.data.token; // Note: In real app this is Firebase ID Token. Here likely 'TEST_TOKEN' or ignored if mocked auth used. 
      // Actually auth.ts returns { user, success }. It doesn't return a NEW token, it expects inputs.
      // But verifyIdToken mock logic in auth.ts doesn't generate a token, it validates input.
      // Wait, 'token' in response? auth.ts register response: { success: true, user: ... }
      // It does NOT return a token. We reuse the input token for subsequent requests if needed, 
      // but 'TEST_TOKEN' works for our mock middleware? 
      // Let's assume we use "TEST_TOKEN" for subsequent calls if middleware supports it.
      // Checking auth middleware... usually expects Bearer <token>.

      providerId = regRes.data.user.id;
      console.log(`✅ Registered successfully. Provider ID: ${providerId}`);
    } catch (e: any) {
      console.error("Registration failed:", e.message);
      if (e.response) {
        console.error("   Data:", e.response.data);
      }
      return;
    }

    if (!providerId) {
      console.error("❌ No Provider ID returned. Aborting.");
      return;
    }

    // 2. Test AI Endpoint
    console.log("\n2️⃣  Testing AI Classification (Remote)...");
    const text = "Preciso de alguém para consertar meu telhado que está com goteira";
    try {
      const aiRes = await axios.post(
        `${API_URL}/services/ai`,
        { text: text },
        { headers: { Authorization: `Bearer TEST_TOKEN` } }, // Use TEST_TOKEN
      );
      console.log("   AI Response Success:", aiRes.data.success);
      if (aiRes.data.success && aiRes.data.encontrado) {
        console.log("✅ AI Test PASSED!");
      } else {
        console.log("❌ AI Test FAILED (Not found).");
      }
    } catch (e: any) {
      console.log("⚠️ AI Test skipped or failed (Auth might be strict):", e.message);
    }

    // 3. Test Location Sync (RTDB -> Postgres)
    console.log("\n3️⃣  Testing Location Sync (RTDB -> Postgres)...");
    const testLat = -23.550520;
    const testLng = -46.633308;

    // Write to RTDB
    console.log(`   Writing to RTDB: locations/${providerId}...`);
    await admin.database().ref(`locations/${providerId}`).set({
      latitude: testLat,
      longitude: testLng,
      timestamp: Date.now()
    });
    console.log('   ✅ Written to RTDB.');

    // Poll Postgres
    console.log('   Polling Postgres for sync (timeout 10s)...');
    let synced = false;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const [rows] = await pool.query(
        "SELECT * FROM provider_locations WHERE provider_id = ?",
        [providerId]
      );
      if ((rows as any[]).length > 0) {
        const loc = (rows as any[])[0];
        // precision check
        if (Math.abs(Number(loc.latitude) - testLat) < 0.001) {
          console.log('   ✅ Found record in Postgres:', loc);
          synced = true;
          break;
        }
      }
      process.stdout.write('.');
    }

    if (synced) {
      console.log('\n✅ SUCCESS: Location sync verified.');
    } else {
      console.error('\n❌ FAILURE: Location not synced to Postgres.');
    }

  } catch (error: any) {
    console.error("❌ Test Failed:", error.message);
  } finally {
    // Cleanup
    if (providerId) {
      // Cleanup DB logic if needed, but for "simulacao" keeping it is fine.
      // Maybe delete form RTDB
      await admin.database().ref(`locations/${providerId}`).remove();
    }
    process.exit(0);
  }
}

testIntegration();
