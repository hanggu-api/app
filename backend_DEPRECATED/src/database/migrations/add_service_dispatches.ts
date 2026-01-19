import pool from "../db";
import logger from "../../utils/logger";

export async function run() {
  try {
    await pool.query(`
            CREATE TABLE IF NOT EXISTS service_dispatches (
                id INT AUTO_INCREMENT PRIMARY KEY,
                service_id VARCHAR(36) NOT NULL,
                current_cycle INT DEFAULT 1,
                current_provider_index INT DEFAULT 0,
                provider_list JSON NOT NULL,
                status ENUM('active', 'paused', 'completed', 'failed') DEFAULT 'active',
                last_attempt_at TIMESTAMP NULL,
                next_retry_at TIMESTAMP NULL,
                history JSON NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                KEY idx_service (service_id),
                KEY idx_status (status),
                CONSTRAINT fk_dispatch_service FOREIGN KEY (service_id) REFERENCES service_requests(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
    logger.info("Migration: service_dispatches table created");
  } catch (error) {
    logger.error("Migration failed: service_dispatches", error);
  }
}
