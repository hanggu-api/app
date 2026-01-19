
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const providerId = 835n; // BigInt
  const providerIdStr = '835';

  // Coordinates near the test service (-23.55052, -46.633308)
  const lat = -23.55052;
  const lng = -46.633308;

  console.log(`🔌 Definindo prestador ID ${providerId} como ONLINE e atualizando localização...`);

  // 1. Update Providers Table (Status)
  // @ts-ignore
  const updated = await prisma.providers.update({
    where: { user_id: providerId },
    data: {
      is_online: true,
      latitude: lat,
      longitude: lng
    }
  });
  console.log(`✅ Prestador ${providerId} agora está Online na tabela providers.`);

  // 2. Update Provider Locations Table (Real-time Tracking)
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  try {
    await pool.query('DELETE FROM provider_locations WHERE provider_id = ?', [providerIdStr]);
    console.log('🗑️  Localização antiga removida.');

    await pool.query(
      `INSERT INTO provider_locations (provider_id, latitude, longitude, updated_at) 
          VALUES (?, ?, ?, NOW())`,
      [providerIdStr, lat, lng]
    );
    console.log(`✅ Localização atualizada em provider_locations para ${providerIdStr} em ${lat}, ${lng}`);
  } catch (e) {
    console.error('❌ Falha ao atualizar provider_locations:', e);
  }

  await pool.end();
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
