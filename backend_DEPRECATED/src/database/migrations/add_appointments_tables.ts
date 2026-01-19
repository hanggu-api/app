
import pool from "../db";
import logger from "../../utils/logger";

export async function run() {
    try {
        console.log("Creating appointments tables...");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS provider_schedule_configs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                provider_id BIGINT NOT NULL,
                day_of_week TINYINT NOT NULL COMMENT '0=Sunday, 6=Saturday',
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_provider_day (provider_id, day_of_week),
                CONSTRAINT fk_sched_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS appointments (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                provider_id BIGINT NOT NULL,
                client_id BIGINT DEFAULT NULL,
                service_request_id VARCHAR(36) DEFAULT NULL,
                start_time DATETIME NOT NULL,
                end_time DATETIME NOT NULL,
                status ENUM('scheduled', 'completed', 'cancelled', 'busy') NOT NULL DEFAULT 'scheduled',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_provider_date (provider_id, start_time),
                CONSTRAINT fk_app_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_app_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE SET NULL,
                CONSTRAINT fk_app_service FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log("Appointments tables created successfully.");
    } catch (error) {
        console.error("Error creating appointments tables:", error);
    }
}

run();
