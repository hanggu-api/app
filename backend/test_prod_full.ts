import axios from "axios";

const BACKEND_URL = "https://backend-iota-lyart-77.vercel.app/api";

async function testProdFull() {
  console.log("🔄 Testing Production Backend + AI Integration...");

  try {
    // 1. Health Check
    console.log("\n1. Checking Backend Health...");
    try {
      const health = await axios.get(`${BACKEND_URL}/health`);
      console.log(`   ✅ Backend UP: ${health.status}`);
    } catch (e: any) {
      console.log(
        `   ⚠️ Health check failed (might be 404 if not implemented): ${e.message}`,
      );
    }

    // 2. Login (or Register if needed)
    console.log("\n2. Authenticating...");
    let token = "";
    const email = `ai_tester_${Math.floor(Math.random() * 1000)}@test.com`;
    const password = "password123";

    try {
      // Try registering first to ensure user exists
      console.log(`   Attempting to register: ${email}`);
      await axios.post(`${BACKEND_URL}/auth/register`, {
        name: "AI Tester",
        email,
        password,
        role: "client",
      });
      console.log("   ✅ Registered new test user");
    } catch (e: any) {
      // If already exists (400/409), that's fine, we'll login
      console.log(`   ⚠️ Registration failed: ${e.message}`);
      if (e.response) console.log(`      Data:`, e.response.data);
    }

    // Login
    const loginRes = await axios.post(`${BACKEND_URL}/auth/login`, {
      email,
      password,
    });

    if (loginRes.data.token) {
      token = loginRes.data.token;
      console.log("   ✅ Login successful, got token");
    } else {
      throw new Error("No token in login response");
    }

    // 3. Test AI Classification
    console.log("\n3. Testing AI Classification (via Backend)...");
    const text = "encanador";
    const aiRes = await axios.post(
      `${BACKEND_URL}/services/ai`,
      {
        text,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    console.log("   ✅ AI Response:", JSON.stringify(aiRes.data, null, 2));

    if (aiRes.data.success || aiRes.data.score || aiRes.data.name) {
      console.log("   🎉 SUCCESS: Backend is talking to AI correctly!");
    } else {
      console.log("   ⚠️ Response format unexpected, check output.");
    }
  } catch (error: any) {
    console.error("\n❌ ERROR during test:");
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    } else {
      console.error(`   Message: ${error.message}`);
    }
  }
}

testProdFull();
