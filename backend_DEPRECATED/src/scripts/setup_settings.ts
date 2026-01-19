
import pool from "../database/db";

async function main() {
    console.log("🛠️ Setting up system_settings table...");

    try {
        // Create Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key_name VARCHAR(50) PRIMARY KEY,
                value JSON,
                description TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Table system_settings created/verified.");

        // Insert Default Config
        const defaultConfig = {
            max_declines: 2,
            cooldown_minutes: 10
        };

        await pool.query(`
                    INSERT INTO system_settings (key_name, value, description)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE value = VALUES(value)
                `, ['dispatch_config', JSON.stringify(defaultConfig), 'Configuration for dispatch logic (declines, cooldowns, etc.)']);

        console.log("✅ Default dispatch_config inserted/updated.");

        // Insert Theme Config
        const themeConfig = {
            client: {
                primary: "#FFE600", // Current Yellow
                secondary: "#EF6C00", // Current Orange
                background: "#FFE600",
                text_primary: "#2E5C99"
            },
            provider: {
                primary: "#4CAF50", // Green for providers (example)
                secondary: "#2E7D32",
                background: "#E8F5E9",
                text_primary: "#1B5E20"
            }
        };

        await pool.query(`
                    INSERT INTO system_settings (key_name, value, description)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE value = VALUES(value)
                `, ['theme_config', JSON.stringify(themeConfig), 'App theme colors for client and provider apps']);

        console.log("✅ Default theme_config inserted/updated.");

        // Verify
        const [rows]: any = await pool.query("SELECT * FROM system_settings WHERE key_name = 'dispatch_config'");
        console.log("Current Config:", rows[0].value);

    } catch (e) {
        console.error("❌ Error setting up settings:", e);
    }

    process.exit(0);
}

main();
