import axios from "axios";

const BACKEND_URL = "https://cardapyia.com/api";
const AI_URL = "http://69.62.88.115:8787";

async function testProd() {
  console.log("🔍 Testing Production Environment...");

  // 1. Test AI Service
  console.log(`\n1️⃣  Checking AI Service at ${AI_URL}...`);
  try {
    const aiHealth = await axios.get(`${AI_URL}/health`, { timeout: 5000 });
    console.log(`   ✅ AI Service is UP: ${aiHealth.status}`);
  } catch (e: any) {
    console.log(`   ❌ AI Service is DOWN: ${e.message}`);
  }

  // 2. Test Backend
  console.log(`\n2️⃣  Checking Backend at ${BACKEND_URL}...`);
  try {
    const backendHealth = await axios.get(`${BACKEND_URL}/health`, {
      timeout: 5000,
    });
    console.log(`   ✅ Backend is UP: ${backendHealth.status}`);
  } catch (e: any) {
    console.log(`   ❌ Backend is DOWN or Unreachable: ${e.message}`);
    if (e.response) {
      console.log(`      Status: ${e.response.status}`);
      console.log(`      Data: ${e.response.data}`);
    }
  }
}

testProd();
