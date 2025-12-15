import pool from '../database/db';

export interface User {
    id?: number;
    email: string;
    password_hash: string;
    full_name: string;
    role: 'client' | 'provider' | 'admin';
    phone?: string;
}

export class UserRepository {
    async findById(id: number): Promise<User | null> {
        const [rows]: any = await pool.query(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );
        const arr: any[] = Array.isArray(rows) ? rows : [];
        return arr.length > 0 ? (arr[0] as User) : null;
    }
    async findByEmail(email: string): Promise<User | null> {
        const [rows]: any = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        const arr: any[] = Array.isArray(rows) ? rows : [];
        return arr.length > 0 ? (arr[0] as User) : null;
    }

    async create(user: User): Promise<number> {
        const [result]: any = await pool.query(
            'INSERT INTO users (email, password_hash, full_name, role, phone) VALUES (?, ?, ?, ?, ?)',
            [user.email, user.password_hash, user.full_name, user.role, user.phone]
        );
        return (result && result.insertId) ? result.insertId : 0;
    }

    async createProvider(userId: number, bio: string = ''): Promise<void> {
        await pool.query(
            'INSERT INTO providers (user_id, bio, wallet_balance) VALUES (?, ?, 0.00)',
            [userId, bio]
        );
    }

    async updateAvatar(userId: number, key: string): Promise<void> {
        await pool.query(
            'UPDATE users SET avatar_url = ? WHERE id = ?',
            [key, userId]
        );
    }

    async updateAvatarBlob(userId: number, blob: Buffer): Promise<void> {
        await pool.query(
            'UPDATE users SET avatar_blob = ? WHERE id = ?',
            [blob, userId]
        );
    }

    async getAvatarBlob(userId: number): Promise<Buffer | null> {
        const [rows]: any = await pool.query(
            'SELECT avatar_blob FROM users WHERE id = ?',
            [userId]
        );
        const arr: any[] = Array.isArray(rows) ? rows : [];
        if (arr.length === 0) return null;
        const row = arr[0] as any;
        return row.avatar_blob ? Buffer.from(row.avatar_blob as Buffer) : null;
    }
}
