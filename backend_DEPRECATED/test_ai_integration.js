const axios = require('axios');
require('dotenv').config();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "https://ai-service.carrobomebarato.workers.dev";
const text = "quero cortar a barba";

async function test() {
    console.log(`Testing AI Service at: ${AI_SERVICE_URL}`);
    console.log(`Input text: "${text}"`);

    try {
        const response = await axios.post(`${AI_SERVICE_URL}/classify`, { text }, { timeout: 10000 });
        console.log("Response Success!");
        console.log(JSON.stringify(response.data, null, 2));

        if (response.data.name === "Barbeiro") {
            console.log("✅ VERIFIED: AI returned the correct name 'Barbeiro' (no typo).");
        } else {
            console.log("⚠️ WARNING: AI returned a different name:", response.data.name);
        }
    } catch (error) {
        console.error("❌ FAILED:", error.message);
        if (error.response) console.error("Error Response:", error.response.data);
    }
}

test();
