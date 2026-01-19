import axios from "axios";

const AI_URL = "http://69.62.88.115:8787/classify";
const text = "Preciso de um eletricista";

async function runTests() {
  console.log("🔍 Debugging Remote AI Service...");

  // Test 1: Standard Axios JSON
  console.log("\n1. Testing Standard Axios JSON...");
  try {
    const res = await axios.post(
      AI_URL,
      { text },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 5000,
      },
    );
    console.log("✅ Success:", res.data);
  } catch (e: any) {
    console.log("❌ Failed:", e.message);
    if (e.response) console.log("   Data:", e.response.data);
  }

  // Test 2: JSON.stringify body manually
  console.log("\n2. Testing Manual JSON Stringify...");
  try {
    const res = await axios.post(AI_URL, JSON.stringify({ text }), {
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    });
    console.log("✅ Success:", res.data);
  } catch (e: any) {
    console.log("❌ Failed:", e.message);
  }

  // Test 3: Raw Fetch (native Node)
  console.log("\n3. Testing Native Fetch...");
  try {
    const res = await fetch(AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const txt = await res.text();
    console.log(`Status: ${res.status}`);
    console.log("Body:", txt);
  } catch (e: any) {
    console.log("❌ Failed:", e.message);
  }
}

runTests();
