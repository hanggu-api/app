import pool from "./db";
import logger from "../utils/logger";

export async function runFirebaseMigration() {
  try {
    const [rows] = (await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'firebase_uid'
        `)) as [any[], any];

    if (rows.length === 0) {
      logger.info(
        "Migração Firebase: Adicionando coluna firebase_uid na tabela users...",
      );
      await pool.query(`
                ALTER TABLE users 
                ADD COLUMN firebase_uid VARCHAR(128) UNIQUE NULL AFTER id,
                ADD INDEX idx_firebase_uid (firebase_uid)
            `);
      logger.info("Migração Firebase concluída com sucesso.");
    } else {
      logger.info("Migração Firebase: Coluna firebase_uid já existe.");
    }
  } catch (error) {
    logger.error("Erro na migração Firebase:", error);
  }
}
