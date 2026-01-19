
import pool from "../db";

export async function run() {
    try {
        console.log("Standardizing Agenda Schema...");

        // 1. Rename provider_schedule_configs to provider_schedules if it exists under the old name
        // Or just create provider_schedules if it doesn't exist and matches requirements.
        // The code uses provider_schedules.

        await pool.query(`
            CREATE TABLE IF NOT EXISTS provider_schedules (
                id INT AUTO_INCREMENT PRIMARY KEY,
                provider_id BIGINT NOT NULL,
                day_of_week TINYINT NOT NULL COMMENT '0=Sunday, 6=Saturday',
                start_time VARCHAR(8) NOT NULL,
                end_time VARCHAR(8) NOT NULL,
                break_start VARCHAR(8) DEFAULT NULL,
                break_end VARCHAR(8) DEFAULT NULL,
                slot_duration INT DEFAULT 30,
                is_enabled TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_provider_day (provider_id, day_of_week),
                CONSTRAINT fk_ps_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 2. Create provider_schedule_exceptions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS provider_schedule_exceptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                provider_id BIGINT NOT NULL,
                date DATE NOT NULL,
                start_time VARCHAR(8) DEFAULT NULL,
                end_time VARCHAR(8) DEFAULT NULL,
                is_closed TINYINT(1) DEFAULT 0,
                reason VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_provider_date (provider_id, date),
                CONSTRAINT fk_pse_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 3. Create provider_custom_services
        await pool.query(`
            CREATE TABLE IF NOT EXISTS provider_custom_services (
                id INT AUTO_INCREMENT PRIMARY KEY,
                provider_id BIGINT NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                duration INT NOT NULL COMMENT 'minutes',
                price DECIMAL(10,2) NOT NULL,
                category VARCHAR(64) DEFAULT NULL,
                active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_pcs_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log("Agenda Schema standardized successfully.");
    } catch (error) {
        console.error("Error standardizing Agenda Schema:", error);
        throw error;
    }
}

if (require.main === module) {
    run();
}
