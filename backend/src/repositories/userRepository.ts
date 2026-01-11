import pool from "../database/db";
import { RowDataPacket, ResultSetHeader, FieldPacket } from "mysql2";

export interface User {
  id?: number;
  firebase_uid?: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: "client" | "provider" | "admin";
  phone?: string;
  avatar_url?: string;
}

export class UserRepository {
  async findByFirebaseUid(uid: string): Promise<User | null> {
    const [rows] = (await pool.query(
      "SELECT * FROM users WHERE firebase_uid = ?",
      [uid],
    )) as [RowDataPacket[], FieldPacket[]];
    const arr = Array.isArray(rows) ? rows : [];
    return arr.length > 0 ? (arr[0] as User) : null;
  }

  async updateFirebaseUid(userId: number, uid: string): Promise<void> {
    await pool.query("UPDATE users SET firebase_uid = ? WHERE id = ?", [
      uid,
      userId,
    ]);
  }

  async updateName(userId: number, fullName: string): Promise<void> {
    await pool.query("UPDATE users SET full_name = ? WHERE id = ?", [
      fullName,
      userId,
    ]);
  }

  async findById(id: number): Promise<User | null> {
    const [rows] = (await pool.query("SELECT * FROM users WHERE id = ?", [
      id,
    ])) as [RowDataPacket[], FieldPacket[]];
    const arr = Array.isArray(rows) ? rows : [];
    return arr.length > 0 ? (arr[0] as User) : null;
  }
  async findByEmail(email: string): Promise<User | null> {
    const [rows] = (await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ])) as [RowDataPacket[], FieldPacket[]];
    const arr = Array.isArray(rows) ? rows : [];
    return arr.length > 0 ? (arr[0] as User) : null;
  }

  async create(user: User): Promise<number> {
    const [result] = (await pool.query(
      "INSERT INTO users (email, password_hash, full_name, role, phone, firebase_uid) VALUES (?, ?, ?, ?, ?, ?)",
      [
        user.email,
        user.password_hash,
        user.full_name,
        user.role,
        user.phone,
        user.firebase_uid || null,
      ],
    )) as [ResultSetHeader, FieldPacket[]];
    return result && result.insertId ? result.insertId : 0;
  }

  async createProvider(userId: number, bio: string = ""): Promise<void> {
    await pool.query(
      "INSERT INTO providers (user_id, bio, wallet_balance) VALUES (?, ?, 0.00)",
      [userId, bio],
    );
  }

  async updateAvatar(userId: number, key: string): Promise<void> {
    await pool.query("UPDATE users SET avatar_url = ? WHERE id = ?", [
      key,
      userId,
    ]);
  }

  async updateAvatarBlob(userId: number, blob: Buffer): Promise<void> {
    await pool.query("UPDATE users SET avatar_blob = ? WHERE id = ?", [
      blob,
      userId,
    ]);
  }

  async getAvatarBlob(userId: number): Promise<Buffer | null> {
    const [rows] = (await pool.query(
      "SELECT avatar_blob FROM users WHERE id = ?",
      [userId],
    )) as [RowDataPacket[], FieldPacket[]];
    const arr = Array.isArray(rows) ? rows : [];
    if (arr.length === 0) return null;
    const row = arr[0] as { avatar_blob: Buffer };
    return row.avatar_blob ? Buffer.from(row.avatar_blob) : null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const [rows] = (await pool.query(
      "SELECT * FROM users WHERE phone = ? LIMIT 1",
      [phone],
    )) as [RowDataPacket[], FieldPacket[]];
    const arr = Array.isArray(rows) ? rows : [];
    return arr.length > 0 ? (arr[0] as User) : null;
  }

  async getProviderDetails(
    userId: number,
  ): Promise<{ commercial_name?: string } | null> {
    const [rows] = (await pool.query(
      "SELECT commercial_name FROM providers WHERE user_id = ?",
      [userId],
    )) as [RowDataPacket[], FieldPacket[]];
    const arr = Array.isArray(rows) ? rows : [];
    return arr.length > 0 ? (arr[0] as { commercial_name?: string }) : null;
  }

  async findProviderByDocument(
    document: string,
  ): Promise<RowDataPacket | null> {
    const [rows] = (await pool.query(
      "SELECT * FROM providers WHERE document_value = ? LIMIT 1",
      [document],
    )) as [RowDataPacket[], FieldPacket[]];
    const arr = Array.isArray(rows) ? rows : [];
    return arr.length > 0 ? arr[0] : null;
  }

  async updateProviderExtra(
    userId: number,
    extras: {
      document_type?: "cpf" | "cnpj";
      document_value?: string;
      commercial_name?: string;
      address?: string;
    },
  ): Promise<void> {
    const fields: string[] = [];
    const values: (string | number)[] = [];
    if (extras.document_type) {
      fields.push("document_type = ?");
      values.push(extras.document_type);
    }
    if (extras.document_value) {
      fields.push("document_value = ?");
      values.push(extras.document_value);
    }
    if (extras.commercial_name) {
      fields.push("commercial_name = ?");
      values.push(extras.commercial_name);
    }
    if (extras.address) {
      fields.push("address = ?");
      values.push(extras.address);
    }
    if (fields.length === 0) return;
    values.push(userId);
    await pool.query(
      `UPDATE providers SET ${fields.join(", ")} WHERE user_id = ?`,
      values,
    );
  }

  async updateProviderLocation(
    userId: number,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO provider_locations (provider_id, latitude, longitude)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude)`,
      [userId, latitude, longitude],
    );
  }

  async delete(id: number): Promise<void> {
    await pool.query("DELETE FROM users WHERE id = ?", [id]);
  }

  async findProfessionByName(
    name: string,
  ): Promise<{ id: number; name: string } | null> {
    const [rows] = (await pool.query(
      "SELECT id, name FROM professions WHERE name = ? LIMIT 1",
      [name],
    )) as [RowDataPacket[], FieldPacket[]];
    const arr = Array.isArray(rows) ? rows : [];
    return arr.length > 0 ? (arr[0] as { id: number; name: string }) : null;
  }

  async upsertProfession(name: string): Promise<number> {
    await pool.query("INSERT IGNORE INTO professions (name) VALUES (?)", [
      name,
    ]);
    const [rows] = (await pool.query(
      "SELECT id FROM professions WHERE name = ? LIMIT 1",
      [name],
    )) as [RowDataPacket[], FieldPacket[]];
    const arr = Array.isArray(rows) ? rows : [];
    return arr.length > 0 ? Number(arr[0].id) : 0;
  }

  async setProviderProfessions(
    userId: number,
    professionIds: number[],
  ): Promise<void> {
    await pool.query(
      "DELETE FROM provider_professions WHERE provider_user_id = ?",
      [userId],
    );
    for (const pid of professionIds) {
      await pool.query(
        "INSERT IGNORE INTO provider_professions (provider_user_id, profession_id) VALUES (?, ?)",
        [userId, pid],
      );
    }
  }

  async addProviderProfession(
    userId: number,
    professionId: number,
  ): Promise<void> {
    await pool.query(
      "INSERT IGNORE INTO provider_professions (provider_user_id, profession_id) VALUES (?, ?)",
      [userId, professionId],
    );
  }

  async getProviderProfessions(
    userId: number,
  ): Promise<{ name: string; service_type: string }[]> {
    const [rows] = (await pool.query(
      `SELECT p.name, p.service_type
             FROM provider_professions pp
             JOIN professions p ON pp.profession_id = p.id
             WHERE pp.provider_user_id = ?
             ORDER BY p.name ASC`,
      [userId],
    )) as [RowDataPacket[], FieldPacket[]];
    const arr = Array.isArray(rows) ? rows : [];
    return arr.map((r) => ({
      name: r.name,
      service_type: r.service_type || "standard",
    }));
  }

  async removeProviderProfession(
    userId: number,
    professionName: string,
  ): Promise<void> {
    const [rows] = (await pool.query(
      "SELECT id FROM professions WHERE name = ?",
      [professionName],
    )) as [RowDataPacket[], FieldPacket[]];
    if (Array.isArray(rows) && rows.length > 0) {
      const pid = rows[0].id;
      await pool.query(
        "DELETE FROM provider_professions WHERE provider_user_id = ? AND profession_id = ?",
        [userId, pid],
      );
    }
  }

  async findProvidersByProfession(
    professionId: number,
  ): Promise<{ id: number; full_name: string }[]> {
    const [rows] = (await pool.query(
      `SELECT u.id, u.full_name 
             FROM users u 
             JOIN provider_professions pp ON u.id = pp.provider_user_id 
             WHERE pp.profession_id = ?`,
      [professionId],
    )) as [RowDataPacket[], FieldPacket[]];
    return rows as { id: number; full_name: string }[];
  }

  async searchProviders(
    term: string,
    lat?: number,
    lon?: number
  ): Promise<any[]> {
    let query = `
      SELECT 
        u.id, 
        u.full_name, 
        u.avatar_url, 
        p.commercial_name, 
        p.address,
        p.rating_avg,
        p.rating_count,
        pl.latitude,
        pl.longitude,
        GROUP_CONCAT(prof.name SEPARATOR ', ') as professions
      FROM users u
      JOIN providers p ON u.id = p.user_id
      JOIN provider_professions pp ON u.id = pp.provider_user_id
      JOIN professions prof ON pp.profession_id = prof.id
      LEFT JOIN provider_locations pl ON u.id = pl.provider_id
      WHERE u.role = 'provider'
    `;

    const params: any[] = [];

    if (term) {
      query += ` AND (prof.name LIKE ? OR u.full_name LIKE ? OR p.commercial_name LIKE ?)`;
      const likeTerm = `%${term}%`;
      params.push(likeTerm, likeTerm, likeTerm);
    }

    query += ` GROUP BY u.id`;

    // If lat/lon provided, we could order by distance here, but for now let's just return the list
    // and handle sorting in code or basic SQL if needed.
    // Ideally we use ST_Distance_Sphere if MySQL 5.7+ but simple approximation works for now.
    
    const [rows] = (await pool.query(query, params)) as [
      RowDataPacket[],
      FieldPacket[],
    ];
    return rows;
  }
}
