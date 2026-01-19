import axios from "axios";
import dotenv from "dotenv";

// Load env vars
dotenv.config();

// Configuration
const API_URL = 'http://localhost:3001/api'; // Local API
const FIREBASE_API_KEY = "AIzaSyAOzSbKAwfmtQCQ4FLGVEb8vkK2ljDQpxs"; // Web API Key from firebase_options.dart
const NUM_REQUESTS = 100; // Requested by user
const CONCURRENT_REQUESTS = 10; // Process 10 at a time to be realistic

// Master Users (Randomized to avoid conflicts)
const TIMESTAMP = Date.now();
const MASTER_CLIENT = `stress_client_${TIMESTAMP}@cardapyia.test`;
const MASTER_PROVIDER = `stress_provider_${TIMESTAMP}@cardapyia.test`;

// Statistics
const stats = {
  registered: 0,
  servicesCreated: 0,
  servicesAccepted: 0,
  servicesRejected: 0,
  errors: 0,
  latencies: [] as number[]
};

// Utils
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getFirebaseIdToken(email: string, password: string): Promise<string | null> {
    try {
        const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
        const res = await axios.post(url, {
            email,
            password,
            returnSecureToken: true
        });
        return res.data.idToken;
    } catch (error: any) {
        // Try to sign up if sign in fails (for any reason, e.g., user doesn't exist)
        // console.log(`   ⚠️ SignIn failed for ${email}, trying SignUp...`);
        try {
            const signupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;
            const signupRes = await axios.post(signupUrl, {
                email,
                password,
                returnSecureToken: true
            });
            return signupRes.data.idToken;
        } catch (signupError: any) {
            console.error(`   ❌ SignUp failed for ${email}: ${signupError.response?.data?.error?.message || signupError.message}`);
            return null;
        }
    }
}

let clientToken: string | null = null;
let providerToken: string | null = null;

async function setupMasters() {
    console.log(`   🔑 Authenticating Masters (ID: ${TIMESTAMP})...`);
    
    // 1. Client
    clientToken = await getFirebaseIdToken(MASTER_CLIENT, "Password123!");
    if (clientToken) {
        try {
            await axios.post(`${API_URL}/auth/register`, {
                token: clientToken,
                email: MASTER_CLIENT,
                name: "Master Client",
                role: "client",
                phone: "11999999999"
            });
            stats.registered++;
            console.log("   ✅ Master Client Ready.");
        } catch (e: any) {
             if (e.response?.status === 201 || e.response?.status === 200) {
                 stats.registered++;
             } else {
                 console.error(`   ⚠️ Client Register Error: ${e.message} ${JSON.stringify(e.response?.data)}`);
             }
        }
    }

    // 2. Provider
    providerToken = await getFirebaseIdToken(MASTER_PROVIDER, "Password123!");
    if (providerToken) {
        try {
            await axios.post(`${API_URL}/auth/register`, {
                token: providerToken,
                email: MASTER_PROVIDER,
                name: "Master Provider",
                role: "provider",
                phone: "11888888888"
            });
            stats.registered++;
            console.log("   ✅ Master Provider Ready.");
        } catch (e: any) {
             if (e.response?.status === 201 || e.response?.status === 200) {
                 stats.registered++;
             } else {
                 console.error(`   ⚠️ Provider Register Error: ${e.message} ${JSON.stringify(e.response?.data)}`);
             }
        }
    }

    return clientToken && providerToken;
}

async function simulateLifecycle(requestIndex: number) {
  if (!clientToken || !providerToken) return;

  try {
    const start = Date.now();
    
    // 1. Create Service (Client)
    const servicePayload = {
      category_id: 1,
      description: `Stress Test Request #${requestIndex} - Preciso de serviço urgente.`,
      latitude: -23.5505 + (Math.random() * 0.05),
      longitude: -46.6333 + (Math.random() * 0.05),
      address: `Rua Stress ${requestIndex}, SP`,
      price_estimated: 100 + Math.random() * 50,
      price_upfront: 10
    };

    const serviceRes = await axios.post(`${API_URL}/services`, servicePayload, {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    
    if (serviceRes.status !== 201 && serviceRes.status !== 200) {
        throw new Error(`Create Failed: ${serviceRes.status}`);
    }
    
    stats.servicesCreated++;
    const serviceId = serviceRes.data.id;

    // 1.5 Pay for Service (To activate it)
    try {
        await axios.post(`${API_URL}/payment/process`, {
            transaction_amount: 1.00,
            description: "Stress Test Payment",
            payment_method_id: "pix",
            payer: { email: MASTER_CLIENT, first_name: "Master", last_name: "Client" },
            service_id: serviceId
        }, {
            headers: { Authorization: `Bearer ${clientToken}` }
        });
        
        // Wait for auto-approval (Controller delay is 5000ms + DB latency)
        await delay(6000); 

    } catch (payErr: any) {
        // console.error(`   ⚠️ Payment Failed for ${serviceId}: ${payErr.message}`);
        throw new Error(`Payment Failed: ${payErr.message}`);
    }

    // 2. Accept or Reject (Provider)
    // Randomly decide: 80% Accept, 20% Reject
    const shouldAccept = Math.random() > 0.2;
    
    if (shouldAccept) {
        const acceptRes = await axios.post(`${API_URL}/services/${serviceId}/accept`, {}, {
            headers: { Authorization: `Bearer ${providerToken}` }
        });
        if (acceptRes.status === 200) {
            stats.servicesAccepted++;
        }
    } else {
        const rejectRes = await axios.post(`${API_URL}/services/${serviceId}/reject`, {}, {
            headers: { Authorization: `Bearer ${providerToken}` }
        });
        if (rejectRes.status === 200) {
            stats.servicesRejected++;
        }
    }

    const lat = Date.now() - start;
    stats.latencies.push(lat);

  } catch (error: any) {
    stats.errors++;
    console.error(`   ❌ Req ${requestIndex} Failed: ${error.message} ${error.response?.data?.message || ''}`);
  }
}

async function runStressTest() {
  console.log(`🔥 Starting Full System Stress Test against ${API_URL}`);
  console.log(`   Target: ${NUM_REQUESTS} requests (Client -> Provider Lifecycle)`);
  
  const startTime = Date.now();
  
  if (!await setupMasters()) {
      console.error("❌ Failed to setup master users.");
      process.exit(1);
  }
  
  console.log("   🚀 Launching lifecycle simulations...");
  for (let i = 0; i < NUM_REQUESTS; i += CONCURRENT_REQUESTS) {
    const batch = [];
    for (let j = 0; j < CONCURRENT_REQUESTS && (i + j) < NUM_REQUESTS; j++) {
      batch.push(simulateLifecycle(i + j));
    }
    await Promise.all(batch);
    if (i % 10 === 0) process.stdout.write(".");
    await delay(100); 
  }

  const duration = (Date.now() - startTime) / 1000;

  console.log("\n📊 STRESS TEST RESULTS");
  console.log("--------------------------------------------------");
  console.log(`⏱️  Duration:        ${duration.toFixed(2)}s`);
  console.log(`📨 Requests Sent:   ${NUM_REQUESTS}`);
  console.log(`✅ Registered:      ${stats.registered}`);
  console.log(`🛠️  Services Created: ${stats.servicesCreated}`);
  console.log(`🤝 Services Accepted:${stats.servicesAccepted}`);
  console.log(`🚫 Services Rejected:${stats.servicesRejected}`);
  console.log(`❌ Errors:          ${stats.errors}`);
  
  if (stats.latencies.length > 0) {
    const avg = stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length;
    const max = Math.max(...stats.latencies);
    const min = Math.min(...stats.latencies);
    console.log(`📉 Latency (Lifecycle): Avg ${avg.toFixed(0)}ms | Min ${min}ms | Max ${max}ms`);
  }
  console.log("--------------------------------------------------");

  if (stats.errors > 0) process.exit(1);
  process.exit(0);
}

runStressTest();
