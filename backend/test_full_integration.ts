import axios from "axios";

const API_URL = "http://localhost:4011/api";
const EMAIL = `test_${Date.now()}@example.com`;
const PASSWORD = "password123";

async function testIntegration() {
  console.log("🚀 Starting Full Integration Test (Backend + Remote AI)...");

  try {
    // 1. Register/Login
    console.log(`1️⃣  Registering user: ${EMAIL}...`);
    let token = "";
    try {
      const regRes = await axios.post(`${API_URL}/auth/register`, {
        email: EMAIL,
        password: PASSWORD,
        name: "Test User",
        role: "client",
      });
      token = regRes.data.token;
      console.log("✅ Registered successfully.");
    } catch (e: any) {
      console.error("Registration failed:", e.message);
      if (e.response) {
        console.error("   Status:", e.response.status);
        console.error("   Data:", e.response.data);
      } else if (e.code) {
        console.error("   Code:", e.code); // e.g. ECONNREFUSED
      }
      return;
    }

    // 2. Test AI Endpoint
    console.log("\n2️⃣  Testing AI Classification (Remote)...");
    const text =
      "Preciso de alguém para consertar meu telhado que está com goteira";
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
      console.log("✅ AI Test PASSED!");
    } else {
      console.log("❌ AI Test FAILED (Not found or error).");
    }
  } catch (error: any) {
    console.error("❌ Test Failed:", error.message);
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", error.response.data);
    }
  }
}

testIntegration();
