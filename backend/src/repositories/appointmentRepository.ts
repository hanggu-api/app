
import pool from "../database/db";
import { RowDataPacket, ResultSetHeader, FieldPacket } from "mysql2";

export interface ScheduleConfig {
  day_of_week: number;
  start_time: string;
  end_time: string;
  lunch_start?: string;
  lunch_end?: string;
  slot_duration: number;
  is_active: boolean;
}

export interface Appointment {
  id?: number;
  provider_id: number;
  client_id?: number;
  service_request_id?: string;
  start_time: Date;
  end_time: Date;
  status: 'scheduled' | 'completed' | 'cancelled' | 'busy';
  notes?: string;
}

export class AppointmentRepository {
  async getScheduleConfig(providerId: number): Promise<ScheduleConfig[]> {
    const [rows] = (await pool.query(
      `SELECT day_of_week, start_time, end_time, lunch_start, lunch_end, slot_duration, is_active 
       FROM provider_schedule_configs 
       WHERE provider_id = ?`,
      [providerId]
    )) as [RowDataPacket[], FieldPacket[]];
    return rows as ScheduleConfig[];
  }

  async upsertScheduleConfig(providerId: number, config: ScheduleConfig): Promise<void> {
    await pool.query(
      `INSERT INTO provider_schedule_configs 
       (provider_id, day_of_week, start_time, end_time, lunch_start, lunch_end, slot_duration, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       start_time = VALUES(start_time),
       end_time = VALUES(end_time),
       lunch_start = VALUES(lunch_start),
       lunch_end = VALUES(lunch_end),
       slot_duration = VALUES(slot_duration),
       is_active = VALUES(is_active)`,
      [
        providerId, 
        config.day_of_week, 
        config.start_time, 
        config.end_time, 
        config.lunch_start || null, 
        config.lunch_end || null, 
        config.slot_duration || 30,
        config.is_active ? 1 : 0
      ]
    );
  }

  async getAppointments(providerId: number, start: Date, end: Date): Promise<Appointment[]> {
    const [rows] = (await pool.query(
      `SELECT * FROM appointments 
       WHERE provider_id = ? 
       AND start_time >= ? 
       AND end_time <= ?
       AND status IN ('scheduled', 'busy', 'completed')`,
      [providerId, start, end]
    )) as [RowDataPacket[], FieldPacket[]];
    return rows as Appointment[];
  }

  async createAppointment(appt: Appointment): Promise<number> {
    const [res] = (await pool.query(
      `INSERT INTO appointments (provider_id, client_id, service_request_id, start_time, end_time, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [appt.provider_id, appt.client_id, appt.service_request_id, appt.start_time, appt.end_time, appt.status, appt.notes]
    )) as [ResultSetHeader, FieldPacket[]];
    return res.insertId;
  }

  async checkAvailability(providerId: number, start: Date, end: Date): Promise<boolean> {
    const [rows] = (await pool.query(
      `SELECT id FROM appointments 
       WHERE provider_id = ? 
       AND status IN ('scheduled', 'busy', 'completed')
       AND (
         (start_time < ? AND end_time > ?) OR
         (start_time >= ? AND start_time < ?)
       )`,
      [providerId, end, start, start, end]
    )) as [RowDataPacket[], FieldPacket[]];
    return rows.length === 0;
  }

  async deleteAppointment(id: number, providerId: number): Promise<boolean> {
    const [res] = (await pool.query(
      `DELETE FROM appointments WHERE id = ? AND provider_id = ?`,
      [id, providerId]
    )) as [ResultSetHeader, FieldPacket[]];
    return res.affectedRows > 0;
  }
}

export const appointmentRepository = new AppointmentRepository();
