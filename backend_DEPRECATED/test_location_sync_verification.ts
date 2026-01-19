
import admin from './src/config/firebase';
import pool from './src/database/db';

async function verifyLocationSync() {
    console.log('🚀 Starting Location Sync Verification...');

    const providerId = 'TEST_SYNC_PROVIDER_' + Date.now();
    const testLat = -23.550520;
    const testLng = -46.633308;

    try {
        // 1. Write to Realtime Database
        console.log(`1️⃣  Writing to RTDB: locations/${providerId}...`);
        await admin.database().ref(`locations/${providerId}`).set({
            latitude: testLat,
            longitude: testLng,
            timestamp: Date.now()
        });
        console.log('✅ Written to RTDB.');

        // 2. Poll Postgres for sync
        console.log('2️⃣  Polling Postgres for sync (timeout 10s)...');

        let synced = false;
        for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 1000)); // Wait 1s

            const [rows] = await pool.query(
                "SELECT * FROM provider_locations WHERE provider_id = ?",
                [providerId]
            );

            if ((rows as any[]).length > 0) {
                const loc = (rows as any[])[0];
                // Allow small float diffs or string comparison
                if (Math.abs(loc.latitude - testLat) < 0.0001 && Math.abs(loc.longitude - testLng) < 0.0001) {
                    console.log('✅ Found record in Postgres!', loc);
                    synced = true;
                    break;
                }
            }
            process.stdout.write('.');
        }

        if (synced) {
            console.log('\n✅ SUCCESS: Location synced from RTDB to Postgres.');
        } else {
            console.error('\n❌ FAILURE: Record not found in Postgres after 10s.');
            process.exit(1);
        }

    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    } finally {
        // Cleanup
        await admin.database().ref(`locations/${providerId}`).remove();
        // await pool.query("DELETE FROM provider_locations WHERE provider_id = ?", [providerId]);
        // pool.end(); // Don't close if we want to reuse in same process, but here we exit.
        process.exit(0);
    }
}

verifyLocationSync();
