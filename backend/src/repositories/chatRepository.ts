import pool from '../database/db';

export interface ChatMessage {
    id?: number;
    service_id: string;
    sender_id: number;
    content: string;
    type?: 'text' | 'image' | 'audio' | 'location';
    sent_at?: Date;
    read_at?: Date | null;
}

export class ChatRepository {
    async sendMessage(msg: ChatMessage): Promise<number> {
        const [result]: any = await pool.query(
            'INSERT INTO chat_messages (service_id, sender_id, content, type) VALUES (?, ?, ?, ?)',
            [msg.service_id, msg.sender_id, msg.content, msg.type || 'text']
        );
        return (result && result.insertId) ? result.insertId : 0;
    }

    async getMessages(serviceId: string): Promise<any[]> {
        const [rows]: any = await pool.query(
            `SELECT m.*, u.full_name as sender_name, u.role as sender_role
       FROM chat_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.service_id = ?
       ORDER BY m.sent_at ASC`,
            [serviceId]
        );
        return Array.isArray(rows) ? rows : [];
    }
}
