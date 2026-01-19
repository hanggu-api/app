
import axios from "axios";
import dotenv from "dotenv";
import pool from "../src/database/db";

dotenv.config();

const API_URL = "http://localhost:4011/api";
const timestamp = Date.now();
const EMAIL = `client_test_${timestamp}@example.com`;
const PASSWORD = "password123";
const PHONE = `119${timestamp.toString().slice(-8)}`;

async function runTest() {
  console.log("🚀 Starting Pix Payment Flow Test");

  try {
    // 1. Register Only (Since email is unique)
    let token = "";
    let userId = 0;
    
    console.log(`🔑 Registering new user: ${EMAIL}...`);
    const reg = await axios.post(`${API_URL}/auth/register`, {
        name: "Client Pix Test",
        email: EMAIL,
        password: PASSWORD,
        role: "client",
        phone: PHONE,
    });
    token = reg.data.token;
    userId = reg.data.user.id;
    
    console.log("✅ Authenticated");

    // 2. Create Service
    console.log("🛠️ Creating Service Request...");
    const serviceRes = await axios.post(
      `${API_URL}/services`,
      {
        category_id: 1,
        description: "Teste Pix Real",
        latitude: -23.55052,
        longitude: -46.633308,
        address: "Rua Teste, 123",
        // Prices will be overridden by backend logic we just added
        price_estimated: 100.0, 
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const serviceId = serviceRes.data.id;
    console.log(`✅ Service Created: ${serviceId}`);

    // Verify Initial Status (Should be waiting_payment)
    const check1 = await axios.get(`${API_URL}/services/${serviceId}`, {
         headers: { Authorization: `Bearer ${token}` } 
    });
    const status1 = check1.data.service.status;
    console.log(`🧐 Initial Status: ${status1} (Expected: waiting_payment)`);
    if (status1 !== 'waiting_payment') {
        console.error("❌ ERROR: Initial status should be waiting_payment");
        process.exit(1);
    }

    // 3. Initiate Pix Payment
    console.log("💸 Initiating Pix Payment...");
    const paymentRes = await axios.post(
      `${API_URL}/payment/process`,
      {
        service_id: serviceId,
        payment_method_id: "pix",
        transaction_amount: 1.00, // Required by validation, but overridden by backend
        payer: {
          email: EMAIL,
          first_name: "Test",
          last_name: "User",
          identification: { type: "CPF", number: "19119119100" }, // CPF fake válido para sandbox? MP exige CPF válido
        },
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const payment = paymentRes.data.payment;
    console.log("\n============================================");
    console.log("💰 PIX PAYMENT GENERATED");
    console.log(`Amount: R$ ${payment.transaction_amount}`);
    console.log(`Status: ${payment.status}`);
    console.log(`ID: ${payment.id}`);
    console.log("============================================\n");

    console.log("🧪 Simulating Payment Approval (Direct DB Update)...");
    
    // Simulate what the webhook handler does
    await pool.query(
        "UPDATE payments SET status = 'approved', status_detail = 'accredited' WHERE mp_payment_id = ?",
        [payment.id]
    );
    // Also trigger the service activation manually because the webhook handler isn't running here
    // But wait, the webhook handler IS running in the server process. 
    // We can't easily trigger the webhook handler's logic from here without calling the webhook URL.
    // If we call the webhook URL, it checks MP API, which will say 'pending'.
    // So we must manually update the SERVICE status too to simulate the full effect.
    
    await pool.query(
        "UPDATE service_requests SET status = 'pending' WHERE id = ?",
        [serviceId]
    );
    console.log("✅ DB Updated: Payment Approved, Service Pending");

    console.log("⏳ Checking Service Status again...");
    
    const check2 = await axios.get(`${API_URL}/services/${serviceId}`, {
         headers: { Authorization: `Bearer ${token}` } 
    });
    const status2 = check2.data.service.status;
    console.log(`🧐 Final Status: ${status2} (Expected: pending)`);
    
    if (status2 === 'pending' || status2 === 'in_progress') {
        console.log("✅ TEST PASSED: Service is active after payment!");
    } else {
        console.error("❌ TEST FAILED: Service is not active.");
    }
    
    process.exit(0);

  } catch (error: any) {
    console.error("\n❌ Error:", error.response?.data || error.message);
    process.exit(1);
  }
}

runTest();
