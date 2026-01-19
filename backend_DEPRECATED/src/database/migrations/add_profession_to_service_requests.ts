import pool from "../db";
import logger from "../../utils/logger";

export async function up() {
  try {
    await pool.query(
      `ALTER TABLE service_requests ADD COLUMN profession VARCHAR(128) DEFAULT NULL AFTER category_id`,
    );
    logger.info("Migration: added profession column to service_requests");
  } catch (error: any) {
    if (error.code === "ER_DUP_FIELDNAME") {
      logger.info("Migration: profession column already exists");
    } else {
      throw error;
    }
  }
}

export async function down() {
  try {
    await pool.query(`ALTER TABLE service_requests DROP COLUMN profession`);
    logger.info("Migration: removed profession column from service_requests");
  } catch (error) {
    logger.error("Migration down error", error);
  }
}
