import express, { Request, Response } from "express";
import { UserRepository } from "../repositories/userRepository";
import { authMiddleware } from "../middleware/authMiddleware";
import pool from "../database/db";
import { RowDataPacket, ResultSetHeader, FieldPacket } from "mysql2";

const router = express.Router();
const userRepository = new UserRepository();

async function ensureSeedProviders(minCount = 3) {
  const [countRows] = (await pool.query(
    "SELECT COUNT(*) as cnt FROM users WHERE role = 'provider'"
  )) as [RowDataPacket[], FieldPacket[]];
  const current = Number((countRows[0] as any)?.cnt || 0);
  if (current >= minCount) return;

  const [profRows] = (await pool.query(
    "SELECT id, name FROM professions WHERE name IN ('Barbeiro','Cabeleireiro')"
  )) as [RowDataPacket[], FieldPacket[]];
  const profs = Array.isArray(profRows) ? profRows : [];
  if (profs.length < 2) {
    const [anyProfs] = (await pool.query(
      "SELECT id, name FROM professions ORDER BY id ASC LIMIT 3"
    )) as [RowDataPacket[], FieldPacket[]];
    profs.push(...(Array.isArray(anyProfs) ? anyProfs : []));
  }

  const baseLat = -23.550520;
  const baseLon = -46.633308;

  for (let i = current; i < minCount; i++) {
    const name = `Profissional Demo ${i + 1}`;
    const email = `demo.provider${i + 1}@example.com`;
    const phone = `000000000${i + 1}`;
    const passwordHash = "demo_seed_hash";

    const [userRes] = (await pool.query(
      "INSERT INTO users (email, password_hash, full_name, role, phone, is_verified) VALUES (?, ?, ?, 'provider', ?, 1)",
      [email, passwordHash, name, phone]
    )) as [ResultSetHeader, FieldPacket[]];
    const userId = userRes.insertId;

    await pool.query(
      "INSERT INTO providers (user_id, commercial_name, rating_avg, rating_count, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)",
      [
        userId,
        `Comercial ${name}`,
        4.5,
        25 + i * 5,
        baseLat + i * 0.002,
        baseLon + i * 0.002,
      ]
    );

    await pool.query(
      "INSERT INTO provider_locations (provider_id, latitude, longitude) VALUES (?, ?, ?)",
      [userId, baseLat + i * 0.002, baseLon + i * 0.002]
    );

    const profId = (profs[i % profs.length] as any)?.id;
    if (profId) {
      await pool.query(
        "INSERT INTO provider_professions (provider_user_id, profession_id) VALUES (?, ?)",
        [userId, profId]
      );
    }

    const days = [1, 2, 3, 4, 5, 6];
    for (const day of days) {
      await pool.query(
        `INSERT INTO provider_schedule_configs 
         (provider_id, day_of_week, start_time, end_time, lunch_start, lunch_end, slot_duration, is_active)
         VALUES (?, ?, '09:00:00', '18:00:00', '12:00:00', '13:00:00', 30, 1)
         ON DUPLICATE KEY UPDATE 
         start_time='09:00:00', end_time='18:00:00', lunch_start='12:00:00', lunch_end='13:00:00', slot_duration=30, is_active=1`,
        [userId, day]
      );
    }
  }
}

async function ensureManicureProvider() {
  // Check if Manicure profession exists
  let [rows] = (await pool.query(
    "SELECT id FROM professions WHERE name = 'Manicure'"
  )) as [RowDataPacket[], FieldPacket[]];

  let professionId: number;
  if (rows.length === 0) {
    // Create it if not exists (Category 6 = Beleza, usually)
    const [catRows] = (await pool.query(
      "SELECT id FROM categories WHERE name LIKE '%Beleza%' LIMIT 1"
    )) as [RowDataPacket[], FieldPacket[]];
    let catId = 1; // Default
    if (catRows.length > 0) {
      catId = (catRows[0] as any).id;
    }

    const [res] = (await pool.query(
      "INSERT INTO professions (name, icon, category_id) VALUES ('Manicure', 'hand', ?)",
      [catId]
    )) as [ResultSetHeader, FieldPacket[]];
    professionId = res.insertId;
  } else {
    professionId = (rows[0] as any).id;
  }

  // Check if any provider has this profession
  const [provRows] = (await pool.query(
    "SELECT pp.provider_user_id FROM provider_professions pp WHERE pp.profession_id = ?",
    [professionId]
  )) as [RowDataPacket[], FieldPacket[]];

  if (provRows.length > 0) return; // Already exists

  // Create Manicure Provider
  const name = "Ana Manicure";
  const email = "ana.manicure@example.com";
  const phone = "11999998888";
  const passwordHash = "demo_seed_hash";
  const baseLat = -23.550520;
  const baseLon = -46.633308;

  const [userRes] = (await pool.query(
    "INSERT INTO users (email, password_hash, full_name, role, phone, is_verified) VALUES (?, ?, ?, 'provider', ?, 1)",
    [email, passwordHash, name, phone]
  )) as [ResultSetHeader, FieldPacket[]];
  const userId = userRes.insertId;

  await pool.query(
    "INSERT INTO providers (user_id, commercial_name, rating_avg, rating_count, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)",
    [
      userId,
      "Ana Manicure & Nail Art",
      4.9,
      85,
      baseLat + 0.005,
      baseLon + 0.005,
    ]
  );

  await pool.query(
    "INSERT INTO provider_locations (provider_id, latitude, longitude) VALUES (?, ?, ?)",
    [userId, baseLat + 0.005, baseLon + 0.005]
  );

  await pool.query(
    "INSERT INTO provider_professions (provider_user_id, profession_id) VALUES (?, ?)",
    [userId, professionId]
  );

  const days = [1, 2, 3, 4, 5, 6];
  for (const day of days) {
    await pool.query(
      `INSERT INTO provider_schedule_configs 
       (provider_id, day_of_week, start_time, end_time, lunch_start, lunch_end, slot_duration, is_active)
       VALUES (?, ?, '09:00:00', '18:00:00', '12:00:00', '13:00:00', 45, 1)`,
      [userId, day]
    );
  }
}

// Search providers
router.get("/search", authMiddleware, async (req: Request, res: Response) => {
  try {
    const term = req.query.term as string;
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lon = req.query.lon ? parseFloat(req.query.lon as string) : undefined;

    await ensureSeedProviders(3);
    await ensureManicureProvider();
    const providers = await userRepository.searchProviders(term, lat, lon);

    // Calculate distance if lat/lon provided
    if (lat && lon) {
      providers.forEach((p: any) => {
        if (p.latitude && p.longitude) {
          const R = 6371; // Radius of the earth in km
          const dLat = deg2rad(p.latitude - lat);
          const dLon = deg2rad(p.longitude - lon);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat)) *
              Math.cos(deg2rad(p.latitude)) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          p.distance_km = R * c;
        } else {
          p.distance_km = null;
        }
      });

      // Sort by distance
      providers.sort((a: any, b: any) => {
        if (a.distance_km === null) return 1;
        if (b.distance_km === null) return -1;
        return a.distance_km - b.distance_km;
      });
    }

    res.json(providers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to search providers" });
  }
});

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export default router;
