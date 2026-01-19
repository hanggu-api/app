import axios from 'axios';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_URL = `http://localhost:${process.env.PORT || 3000}/api`;
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'conserta_db'
};

const CLIENT_EMAIL = `client_${Date.now()}@test.com`;
const PROVIDER_EMAIL = `provider_${Date.now()}@test.com`;
const PASSWORD = 'password123';

async function main() {
  let connection;
  try {
    console.log('🚀 Starting Full Flow Verification\n');

    // 0. Connect to DB
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to Database');

    // 1. Register Client
    console.log(`\n👤 Registering Client (${CLIENT_EMAIL})...`);
    const clientMockToken = `MOCK_TOKEN_SECRET_123_${CLIENT_EMAIL}`;
    const clientReg = await axios.post(`${API_URL}/auth/register`, {
      token: clientMockToken,
      email: CLIENT_EMAIL,
      password: PASSWORD,
      name: 'Client Test',
      role: 'client',
      phone: '11999999999'
    });
    const clientId = clientReg.data.user.id;
    console.log(`✅ Client registered. ID: ${clientId}`);

    // 2. Register Provider
    console.log(`\n👷 Registering Provider (${PROVIDER_EMAIL})...`);
    const providerMockToken = `MOCK_TOKEN_SECRET_123_${PROVIDER_EMAIL}`;
    const providerReg = await axios.post(`${API_URL}/auth/register`, {
      token: providerMockToken,
      email: PROVIDER_EMAIL,
      password: PASSWORD,
      name: 'Provider Test',
      role: 'provider',
      phone: '11988888888'
    });
    const providerId = providerReg.data.user.id;
    console.log(`✅ Provider registered. ID: ${providerId}`);

    // 3. Create Service
    console.log('\n📝 Creating Service...');
    const serviceRes = await axios.post(`${API_URL}/services`, {
      description: 'Test Service Flow',
      category_id: 1,
      profession: 'Médico',
      latitude: -23.5505,
      longitude: -46.6333,
      address: 'Test Address',
      price_estimated: 150,
      price_upfront: 45,
      scheduled_at: new Date().toISOString()
    }, {
      headers: { Authorization: `Bearer ${clientMockToken}` }
    });
    const serviceId = serviceRes.data.id;
    console.log(`✅ Service created. ID: ${serviceId}`);

    // Fetch validation code
    const [rows]: any = await connection.execute("SELECT * FROM service_requests WHERE id = ?", [serviceId]);
    console.log("Service Row:", rows[0]);
    const validationCode = rows[0]?.validation_code;
    console.log(`🔑 Validation Code: ${validationCode}`);

    if (!validationCode) throw new Error('Validation code missing!');
    if (serviceRes.data.status !== 'waiting_payment') {
      console.warn(`⚠️ Unexpected status: ${serviceRes.data.status} (expected waiting_payment)`);
    } else {
      console.log('✅ Status is waiting_payment');
    }

    // 4. Simulate Upfront Payment (Force Status Update)
    console.log('\n💳 Simulating Upfront Payment (DB Update)...');
    await connection.execute(
      'UPDATE service_requests SET status = ? WHERE id = ?',
      ['pending', serviceId]
    );
    console.log('✅ Service status updated to PENDING');

    // 5. Provider Accepts
    console.log('\n🤝 Provider Accepting Service...');
    await axios.post(`${API_URL}/services/${serviceId}/accept`, {}, {
      headers: { Authorization: `Bearer ${providerMockToken}` }
    });
    console.log('✅ Service Accepted');

    // Check status
    const [rowsAccepted]: any = await connection.execute('SELECT status FROM service_requests WHERE id = ?', [serviceId]);
    if (rowsAccepted[0].status !== 'accepted') throw new Error(`Status mismatch: ${rowsAccepted[0].status}`);

    // 6. Provider Starts
    console.log('\n▶️ Provider Starting Service...');
    await axios.post(`${API_URL}/services/${serviceId}/start`, {}, {
      headers: { Authorization: `Bearer ${providerMockToken}` }
    });
    console.log('✅ Service Started (In Progress)');

    // Check payment_remaining_status
    const [rowsProgress]: any = await connection.execute('SELECT status, payment_remaining_status FROM service_requests WHERE id = ?', [serviceId]);
    console.log(`ℹ️ Status: ${rowsProgress[0].status}, Remaining Payment: ${rowsProgress[0].payment_remaining_status}`);

    if (rowsProgress[0].status !== 'in_progress') throw new Error('Status not in_progress');

    // 7. Simulate Remaining Payment (Force DB Update for simplicity)
    console.log('\n💰 Simulating Remaining Payment (70%)...');
    // We could try the endpoint, but without valid MP credentials it fails.
    // So we force update the payment_remaining_status.
    await connection.execute(
      'UPDATE service_requests SET payment_remaining_status = ? WHERE id = ?',
      ['paid', serviceId]
    );
    console.log('✅ Remaining Payment Marked as PAID');

    // 8. Attempt Completion with WRONG Code
    console.log('\n🚫 Attempting Completion with WRONG Code...');
    try {
      await axios.post(`${API_URL}/services/${serviceId}/complete`, {
        proof_code: '0000',
        proof_photo: 'test_photo_key.jpg'
      }, {
        headers: { Authorization: `Bearer ${providerMockToken}` }
      });
      throw new Error('Should have failed with wrong code!');
    } catch (e: any) {
      if (e.response && e.response.status === 400) {
        console.log('✅ Correctly rejected wrong code');
      } else {
        throw e;
      }
    }

    // 9. Complete with CORRECT Code
    console.log('\n✅ Completing with CORRECT Code...');
    await axios.post(`${API_URL}/services/${serviceId}/complete`, {
      proof_code: validationCode,
      proof_photo: 'final_proof_photo.jpg'
    }, {
      headers: { Authorization: `Bearer ${providerMockToken}` }
    });
    console.log('✅ Service Completed Successfully');

    // 10. Submit Review
    console.log("\n⭐ Submitting Review...");
    try {
      const reviewRes = await axios.post(
        `${API_URL}/services/${serviceId}/review`,
        {
          rating: 5,
          comment: "Excellent service! Highly recommended."
        },
        {
          headers: { Authorization: `Bearer ${clientMockToken}` },
        }
      );
      console.log("✅ Review Submitted:", reviewRes.data);
    } catch (error: any) {
      console.error("❌ Review Failed:", error.response?.data || error.message);
      throw error;
    }

    // 11. Final State Check
    console.log("\n📊 Final Service State:");
    const [finalRows]: any = await connection.execute("SELECT status, proof_code, proof_photo FROM service_requests WHERE id = ?", [serviceId]);
    console.log(finalRows[0]);

    // Check Review in DB
    const [reviewRows]: any = await connection.execute("SELECT * FROM reviews WHERE service_id = ?", [serviceId]);
    if (reviewRows.length > 0) {
      console.log("✅ Review found in DB:", reviewRows[0]);
    } else {
      throw new Error("❌ Review not found in DB");
    }

    console.log("\n🎉 ALL VERIFICATION STEPS PASSED!");
    process.exit(0);

  } catch (error: any) {
    console.error("\n❌ VERIFICATION FAILED:", error);
    process.exit(1);
  }
}

main();
