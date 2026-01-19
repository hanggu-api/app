
import { PrismaClient } from '../backend-worker/generated/client/wasm';
import { PrismaD1 } from '@prisma/adapter-d1';

/**
 * Factory to get the Worker-specific Prisma instance (SQLite/D1).
 */
export const getWorkerPrisma = (env: any) => {
    if (!env || !env.DB) {
        throw new Error('D1 binding "DB" is missing in the environment');
    }

    const adapter = new PrismaD1(env.DB);
    return new PrismaClient({ adapter });
};
