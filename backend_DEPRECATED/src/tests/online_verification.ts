import axios from "axios";

// Default to the IP and port we saw in logs, or use env var
const API_URL = process.env.ONLINE_API_URL || "http://69.62.88.115:4011";

async function runOnlineVerification() {
  console.log(`🌍 Starting Online Verification against: ${API_URL}`);
  let errors: string[] = [];

  try {
    // 1. Test /health
    console.log("\n1️⃣  Testing GET /health...");
    try {
      const healthRes = await axios.get(`${API_URL}/health`, { timeout: 5000 });
      if (healthRes.status === 200 && healthRes.data.ok) {
        console.log("✅ /health check passed.");
      } else {
        errors.push(`/health returned status ${healthRes.status} or invalid body`);
        console.log(`   Response: ${JSON.stringify(healthRes.data)}`);
      }
    } catch (e: any) {
      errors.push(`/health failed: ${e.message}`);
      console.log(`❌ /health failed: ${e.message}`);
    }

    // 2. Test Root /
    console.log("\n2️⃣  Testing GET /...");
    try {
      const rootRes = await axios.get(`${API_URL}/`, { timeout: 5000 });
      if (rootRes.status === 200 && rootRes.data.includes("101 Service API")) {
        console.log("✅ Root endpoint passed.");
      } else {
        errors.push(`Root endpoint returned status ${rootRes.status} or unexpected content`);
        console.log(`   Response data: ${rootRes.data}`);
      }
    } catch (e: any) {
      errors.push(`Root endpoint failed: ${e.message}`);
      console.log(`❌ Root endpoint failed: ${e.message}`);
    }

    // 3. Test DB Connectivity via /debug/db
    console.log("\n3️⃣  Testing DB Connection (via /debug/db)...");
    try {
      const dbRes = await axios.get(`${API_URL}/debug/db`, { timeout: 5000 });
      if (dbRes.status === 200 && dbRes.data.status === "ok") {
        console.log("✅ Database connection (remote) passed.");
      } else {
        errors.push(`/debug/db returned status ${dbRes.status} or error`);
        console.log(`   Response: ${JSON.stringify(dbRes.data)}`);
      }
    } catch (e: any) {
      errors.push(`/debug/db failed: ${e.message}`);
      console.log(`❌ /debug/db failed: ${e.message}`);
    }

  } catch (error: any) {
    console.error("\n❌ Unexpected Error during verification suite:");
    console.error(error.message);
    process.exit(1);
  } finally {
    if (errors.length > 0) {
      console.error("\n❌ Some online tests failed:");
      errors.forEach((e) => console.error(`   - ${e}`));
      console.log("\n⚠️  Please ensure the server is running and the firewall allows port 4011.");
      process.exit(1);
    } else {
      console.log("\n✨ ALL ONLINE TESTS PASSED! The remote server is responding correctly. ✨");
      process.exit(0);
    }
  }
}

runOnlineVerification();
