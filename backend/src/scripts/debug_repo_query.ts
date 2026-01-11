
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  // Configuração do Pool MySQL2 (igual ao db.ts)
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const providerId = '835'; // String, como vem do getNearbyProviders
  const professionId = 3736;
  const nearbyIds = ['835', '832', '528', '833', '834']; // Strings

  console.log(`🔍 Simulando mysql2 query para Provider IDs ${nearbyIds} e Profession ${professionId}`);

  const query = `
    SELECT DISTINCT pp.provider_user_id
    FROM provider_professions pp
    JOIN professions p ON pp.profession_id = p.id
    WHERE pp.provider_user_id IN (?)
    AND pp.profession_id = ?
  `;

  try {
    // @ts-ignore
    const [rows] = await pool.query(query, [nearbyIds, professionId]);
    console.log('✅ MySQL2 Rows:', rows);

    // @ts-ignore
    const validIds = rows.map((r: any) => String(r.provider_user_id));
    console.log('✅ Valid IDs (mapped):', validIds);

  } catch (e) {
    console.error('❌ MySQL2 Query Failed:', e);
  }

  await pool.end();
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
