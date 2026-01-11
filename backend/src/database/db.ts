import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

let pool: mysql.Pool | null = null;
const ensurePool = () => {
  if (!pool) {
    console.log(`🔌 Initializing DB Pool to host: ${process.env.DB_HOST}`);
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 5, // Reduced for serverless environment
      queueLimit: 0,
      charset: "utf8mb4",
      connectTimeout: 10000, // 10s timeout
    });
  }
  return pool!;
};

export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

export default {
  query: async <T = any>(...args: any[]): Promise<[T, mysql.FieldPacket[]]> => {
    try {
      return (await ensurePool().query(...(args as [any]))) as [T, mysql.FieldPacket[]];
    } catch (error: any) {
      console.error("❌ DB Query Error:", error.message);
      throw error;
    }
  },
  getConnection: () => ensurePool().getConnection(),
  closePool,
};
