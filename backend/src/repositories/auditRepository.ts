import pool from "../database/db";
import logger from "../utils/logger";

export interface AuditEntry {
    user_id?: number;
    action: string;
    entity_type?: string;
    entity_id?: string | number;
    details?: any;
    ip_address?: string;
    user_agent?: string;
}

export class AuditRepository {
    async log(entry: AuditEntry): Promise<void> {
        try {
            await pool.query(
                `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    entry.user_id || null,
                    entry.action,
                    entry.entity_type || null,
                    entry.entity_id || null,
                    JSON.stringify(entry.details || {}),
                    entry.ip_address || null,
                    entry.user_agent || null
                ]
            );
        } catch (err) {
            logger.error("AuditRepository.log_failed", err);
            // Don't throw to avoid breaking the main flow
        }
    }
}

export const auditRepo = new AuditRepository();
