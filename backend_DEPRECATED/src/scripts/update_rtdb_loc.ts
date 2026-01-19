
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase (if not already initialized in another imported module, but here we run standalone)
try {
    const serviceAccount = require('../../serviceAccountKey.json');
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://cardapyia-service-2025-default-rtdb.firebaseio.com" // Adjust if needed
        });
    }
} catch (e) {
    console.error("Error init firebase", e);
}

async function updateLoc() {
    console.log("Updating RTDB location for provider 835...");
    const db = admin.database();
    
    // Simulate location at Praça da Sé (near the service)
    await db.ref('locations/835').set({
        latitude: -23.550520, 
        longitude: -46.633308,
        timestamp: admin.database.ServerValue.TIMESTAMP,
        heading: 0,
        speed: 0
    });
    
    console.log("✅ Update sent to RTDB. Check backend logs for sync.");
    process.exit(0);
}

updateLoc();
