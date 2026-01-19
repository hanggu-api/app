import * as admin from 'firebase-admin';
import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase
try {
    const serviceAccount = require('../../serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
} catch (e) {
    console.error("Error init firebase", e);
    process.exit(1);
}

const pool = createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 1,
});

async function test() {
    try {
        const userId = 528;
        const [rows]: any = await pool.query(
            "SELECT token FROM user_devices WHERE user_id = ?",
            [userId]
        );

        if (!rows || rows.length === 0) {
            console.log("No tokens found");
            return;
        }

        const tokens = rows.map((r: any) => r.token);
        const uniqueTokens = [...new Set(tokens)] as string[];
        console.log(`Found ${uniqueTokens.length} tokens`);

        const message: any = {
            tokens: uniqueTokens,
            notification: {
                title: "Debug Test Multicast",
                body: "Checking multicast error"
            },
            android: {
                priority: "high",
                ttl: 0,
                notification: {
                    sound: "iphone_notificacao",
                    priority: "high",
                    channelId: "high_importance_channel",
                    icon: "ic_notification",
                    color: "#FFD700",
                    visibility: "public",
                    defaultVibrateTimings: true,
                }
            }
        };

        try {
            console.log("Sending multicast...");
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log(`Success count: ${response.successCount}`);
            console.log(`Failure count: ${response.failureCount}`);
            
            if (response.failureCount > 0) {
                const failedTokens: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        console.log(`Token ${idx} failed:`, resp.error);
                        // Add to failed list
                        if (uniqueTokens[idx]) {
                            failedTokens.push(uniqueTokens[idx]);
                        }
                    } else {
                        console.log(`Token ${idx} success`);
                    }
                });

                // Delete failed tokens
                if (failedTokens.length > 0) {
                    console.log(`Deleting ${failedTokens.length} invalid tokens...`);
                    // Use a loop or IN clause. IN is better but need to handle placeholders
                    const placeholders = failedTokens.map(() => '?').join(',');
                    await pool.query(
                        `DELETE FROM user_devices WHERE token IN (${placeholders})`,
                        failedTokens
                    );
                    console.log("Deleted invalid tokens.");
                }
            }
        } catch (error) {
            console.log("Error sending message:", error);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

test();
