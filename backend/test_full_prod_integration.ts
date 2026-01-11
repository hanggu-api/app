import axios from "axios";

const API_URL = "https://cardapyia.com/api";
const EMAIL = `prod_test_${Date.now()}@example.com`;
const PASSWORD = "password123";

async function testProdIntegration() {
  console.log("🚀 Starting Full PRODUCTION Integration Test...");
  console.log(`   Target: ${API_URL}`);

  try {
    // 1. Register/Login
    console.log(`\n1️⃣  Registering user: ${EMAIL}...`);
    let token = "";
    try {
      const regRes = await axios.post(`${API_URL}/auth/register`, {
        email: EMAIL,
        password: PASSWORD,
        name: "Prod Test User",
        role: "client",
      });
      token = regRes.data.token;
      console.log("✅ Registered successfully on Production.");
    } catch (e: any) {
      console.error("   ⚠️ Registration failed (might exist). Trying login...");
      try {
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
          email: EMAIL,
          password: PASSWORD,
        });
        token = loginRes.data.token;
        console.log("✅ Logged in successfully on Production.");
      } catch (loginErr: any) {
        console.error(
          "❌ Login failed:",
          loginErr.response?.data || loginErr.message,
        );
        return;
      }
    }

    // 2. Test AI Endpoint via Production Backend
    console.log("\n2️⃣  Testing AI Classification via Production Backend...");
    const text = "Preciso de um encanador urgente";
    console.log(`   Input: "${text}"`);

    const aiRes = await axios.post(
      `${API_URL}/services/ai`,
      {
        text: text,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    console.log("   Response:", JSON.stringify(aiRes.data, null, 2));

    if (aiRes.data.success && aiRes.data.encontrado) {
      console.log("✅ PROD AI Test PASSED!");
    } else {
      console.log("❌ PROD AI Test FAILED (Not found or error).");
    }
  } catch (error: any) {
    console.error("❌ Test Failed:", error.message);
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", error.response.data);
    }
  }
}

testProdIntegration();
