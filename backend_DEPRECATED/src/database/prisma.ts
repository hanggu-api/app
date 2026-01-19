import { PrismaClient } from "@prisma/client";

// @ts-ignore
if (typeof BigInt !== 'undefined' && !BigInt.prototype.toJSON) {
    // @ts-ignore
    BigInt.prototype.toJSON = function () {
        const num = Number(this.toString());
        return Number.isSafeInteger(num) ? num : this.toString();
    };
}
/**
 * Factory to get Prisma instance. 
 * On Cloudflare Workers, pass c.env (Hono context).
 */
export const getPrisma = (env?: any) => {
    // If we have a D1 binding (Cloudflare environment)
    if (env && env.DB) {
        const { PrismaD1 } = require("@prisma/adapter-d1");
        const adapter = new PrismaD1(env.DB);
        // @ts-ignore - 'adapter' is valid when driverAdapters is enabled in schema.prisma
        return new PrismaClient({ adapter });
    }

    // Local or standard Node.js environment
    return new PrismaClient();
};

const prisma = getPrisma();

export default prisma;
