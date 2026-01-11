import pool from "../db";
import logger from "../../utils/logger";

export async function run() {
  try {
    await pool.query(`
            CREATE TABLE IF NOT EXISTS provider_locations (
                provider_id BIGINT PRIMARY KEY,
                latitude DECIMAL(10, 8) NOT NULL,
                longitude DECIMAL(11, 8) NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_pl_provider FOREIGN KEY (provider_id) REFERENCES providers(user_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
    logger.info("Migration: provider_locations table created");
  } catch (error) {
    logger.error("Migration failed: provider_locations", error);
  }
}
