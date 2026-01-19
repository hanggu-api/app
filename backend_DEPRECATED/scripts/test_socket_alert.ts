
import axios from "axios";

const API_URL = "http://localhost:4011";
const TARGET_USER_ID = 572; // alam loma (lima@gmail.com)

async function run() {
    console.log(`📡 Starting Socket Alert Test for User ID: ${TARGET_USER_ID}`);
    console.log("⏳ Will send 10 alerts (one every 3 seconds)...");
    console.log("👉 Please ensure the Mobile App is OPEN and LOGGED IN as lima@gmail.com");

    for (let i = 1; i <= 10; i++) {
        try {
            console.log(`\n[${i}/10] Sending alert...`);
            const res = await axios.post(`${API_URL}/api/test-socket-event`, {
                userId: TARGET_USER_ID,
                serviceId: `test-service-${Date.now()}`
            });
            console.log(`✅ Success: ${res.data.message}`);
        } catch (error: any) {
            console.error(`❌ Error: ${error.message}`);
        }
        
        // Wait 3 seconds
        await new Promise(r => setTimeout(r, 3000));
    }
    
    console.log("\n🏁 Test Completed.");
}

run();
