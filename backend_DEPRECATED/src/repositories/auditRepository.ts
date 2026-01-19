import prisma from "../database/prisma";
import logger from "../utils/logger";

export interface AuditEntry {
    user_id?: number | bigint;
    action: string;
    entity_type?: string;
    entity_id?: string | number | bigint;
    details?: any;
    ip_address?: string;
    user_agent?: string;
}

export class AuditRepository {
    async log(entry: AuditEntry): Promise<void> {
        try {
            await prisma.audit_logs.create({
                data: {
                    user_id: entry.user_id ? BigInt(entry.user_id) : null,
                    action: entry.action,
                    entity_type: entry.entity_type || null,
                    entity_id: entry.entity_id ? String(entry.entity_id) : null,
                    details: entry.details ? (typeof entry.details === 'object' ? JSON.stringify(entry.details) : String(entry.details)) : null,
                    ip_address: entry.ip_address || null,
                    user_agent: entry.user_agent || null
                }
            });
        } catch (error) {
            logger.error("AuditRepository.log error", error);
        }
    }

    async getLogs(filters: any = {}): Promise<any[]> {
        return prisma.audit_logs.findMany({
            where: filters,
            orderBy: { created_at: 'desc' },
            take: 100
        });
    }
}

export const auditRepository = new AuditRepository();
