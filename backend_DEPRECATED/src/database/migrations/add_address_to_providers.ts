import pool from "../db";
import logger from "../../utils/logger";

export async function run() {
  try {
    // Add address column to providers
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'providers' 
      AND COLUMN_NAME = 'address';
    `) as [any[], any];

    if (columns.length === 0) {
      await pool.query(`
        ALTER TABLE providers 
        ADD COLUMN address VARCHAR(255) NULL AFTER bio;
      `);
      logger.info("Migration: Added address to providers");
    } else {
      logger.info("Migration: providers.address already exists");
    }

  } catch (error) {
    logger.error("Migration failed: add_address_to_providers", error);
  }
}

if (require.main === module) {
  run().then(() => process.exit(0));
}
