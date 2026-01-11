import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";
import pool from "../database/db";
import { RowDataPacket } from "mysql2";

const router = Router();

// Schema for Schedule
const scheduleSchema = z.object({
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  break_start: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  break_end: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  is_enabled: z.boolean().default(true),
});

// Schema for Exception
const exceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  reason: z.string().optional(),
});

// Schema for Custom Service
const serviceSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  duration: z.number().min(5), // minutes
  price: z.number().min(0),
  category: z.string().optional(),
});

// GET /provider/setup - Get all setup info
router.get("/setup", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) {
        res.status(401).json({ success: false });
        return;
    }

    // Get Schedules
    const [schedules] = await pool.query(
      "SELECT * FROM provider_schedules WHERE provider_id = ?",
      [user.id]
    ) as [RowDataPacket[], any];

    // Get Custom Services
    const [services] = await pool.query(
      "SELECT * FROM provider_custom_services WHERE provider_id = ? AND active = 1",
      [user.id]
    ) as [RowDataPacket[], any];

    // Get Profession info from provider_professions (assuming single profession for simplicity or primary)
    // We might need to fetch from professions table via provider_professions
    const [professions] = await pool.query(
        `SELECT p.*, pp.fixed_price, pp.hourly_rate 
         FROM provider_professions pp
         JOIN professions p ON p.id = pp.profession_id
         WHERE pp.provider_user_id = ?`,
        [user.id]
    ) as [RowDataPacket[], any];

    res.json({
      success: true,
      schedules,
      services,
      profession: professions[0] || null
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /provider/schedule/exceptions - Update exceptions
router.post("/schedule/exceptions", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) {
        res.status(401).json({ success: false });
        return;
    }

    const items = z.array(exceptionSchema).parse(req.body.exceptions);
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Replace all exceptions
      await connection.query("DELETE FROM provider_schedule_exceptions WHERE provider_id = ?", [user.id]);
      
      for (const item of items) {
        await connection.query(
          `INSERT INTO provider_schedule_exceptions 
           (provider_id, date, start_time, end_time, reason, created_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [user.id, item.date, item.start_time || null, item.end_time || null, item.reason || null]
        );
      }
      
      await connection.commit();
      res.json({ success: true });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /provider/schedule - Update schedule
router.post("/schedule", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) {
        res.status(401).json({ success: false });
        return;
    }

    const items = z.array(scheduleSchema).parse(req.body.schedules);
    
    // Transactional replace
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Delete existing for these days or all? Let's say we replace all if sent
      // For simplicity, let's delete all for this provider and re-insert
      await connection.query("DELETE FROM provider_schedules WHERE provider_id = ?", [user.id]);
      
      for (const item of items) {
        await connection.query(
          `INSERT INTO provider_schedules 
           (provider_id, day_of_week, start_time, end_time, break_start, break_end, is_enabled, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [user.id, item.day_of_week, item.start_time, item.end_time, item.break_start || null, item.break_end || null, item.is_enabled]
        );
      }
      
      await connection.commit();
      res.json({ success: true });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /provider/services - Add/Update Service
router.post("/services", authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as AuthRequest).user;
      if (!user) {
        res.status(401).json({ success: false });
        return;
      }
  
      const body = serviceSchema.parse(req.body);
      
      await pool.query(
        `INSERT INTO provider_custom_services 
         (provider_id, name, description, duration, price, category, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [user.id, body.name, body.description || null, body.duration, body.price, body.category || null]
      );
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

// PUT /provider/services/:id - Update Service
router.put("/services/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
        const user = (req as AuthRequest).user;
        const id = req.params.id;
        
        // Allow partial updates
        const updateSchema = serviceSchema.partial();
        const body = updateSchema.parse(req.body);

        // Check if service belongs to provider
        const [rows] = await pool.query(
            "SELECT id FROM provider_custom_services WHERE id = ? AND provider_id = ?",
            [id, user?.id]
        ) as [RowDataPacket[], any];

        if (rows.length === 0) {
            res.status(404).json({ success: false, message: "Service not found" });
            return;
        }

        const updates: string[] = [];
        const values: any[] = [];

        if (body.name) { updates.push("name = ?"); values.push(body.name); }
        if (body.description !== undefined) { updates.push("description = ?"); values.push(body.description); }
        if (body.duration) { updates.push("duration = ?"); values.push(body.duration); }
        if (body.price !== undefined) { updates.push("price = ?"); values.push(body.price); }
        if (body.category) { updates.push("category = ?"); values.push(body.category); }

        if (updates.length > 0) {
            values.push(id);
            await pool.query(
                `UPDATE provider_custom_services SET ${updates.join(", ")} WHERE id = ?`,
                values
            );
        }
        
        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// DELETE /provider/services/:id
router.delete("/services/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
        const user = (req as AuthRequest).user;
        const id = req.params.id;
        
        await pool.query(
            "UPDATE provider_custom_services SET active = 0 WHERE id = ? AND provider_id = ?",
            [id, user?.id]
        );
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
