import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";
import prisma from "../database/prisma";
import { Prisma } from "@prisma/client";

const router = Router();

const scheduleSchema = z.object({
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  break_start: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  break_end: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  slot_duration: z.number().min(5).optional(),
  is_enabled: z.boolean().default(true),
});

const exceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  is_closed: z.boolean().optional().default(false),
  reason: z.string().optional(),
});

const serviceSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  duration: z.number().min(5),
  price: z.number().min(0),
  category: z.string().optional(),
});

router.get("/setup", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) return res.status(401).json({ success: false });

    const [schedules, services, profession] = await Promise.all([
      prisma.provider_schedules.findMany({ where: { provider_id: BigInt(user.id) } }),
      prisma.provider_custom_services.findMany({ where: { provider_id: BigInt(user.id), active: true } }),
      prisma.provider_professions.findFirst({
        where: { provider_user_id: BigInt(user.id) },
        include: { professions: true }
      })
    ]);

    res.json({
      success: true,
      schedules,
      services,
      profession: profession ? { ...profession.professions, fixed_price: profession.fixed_price, hourly_rate: profession.hourly_rate } : null
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/schedule/exceptions", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) return res.status(401).json({ success: false });

    const exceptions = await prisma.provider_schedule_exceptions.findMany({
      where: { provider_id: BigInt(user.id) },
      orderBy: { date: 'asc' }
    });

    res.json({ success: true, exceptions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/schedule/exceptions", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) return res.status(401).json({ success: false });

    const items = z.array(exceptionSchema).parse(req.body.exceptions);

    await prisma.$transaction([
      prisma.provider_schedule_exceptions.deleteMany({ where: { provider_id: BigInt(user.id) } }),
      prisma.provider_schedule_exceptions.createMany({
        data: items.map(item => ({
          provider_id: BigInt(user.id),
          date: new Date(item.date),
          start_time: item.start_time || null,
          end_time: item.end_time || null,
          is_closed: item.is_closed,
          reason: item.reason || null
        }))
      })
    ]);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/schedule", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) return res.status(401).json({ success: false });

    const items = z.array(scheduleSchema).parse(req.body.schedules);

    await prisma.$transaction([
      prisma.provider_schedules.deleteMany({ where: { provider_id: BigInt(user.id) } }),
      prisma.provider_schedules.createMany({
        data: items.map(item => ({
          provider_id: BigInt(user.id),
          day_of_week: item.day_of_week,
          start_time: item.start_time.substring(0, 5),
          end_time: item.end_time.substring(0, 5),
          break_start: item.break_start?.substring(0, 5) || null,
          break_end: item.break_end?.substring(0, 5) || null,
          is_enabled: item.is_enabled
        }))
      })
    ]);

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/services", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user) return res.status(401).json({ success: false });

    const body = serviceSchema.parse(req.body);

    await prisma.provider_custom_services.create({
      data: {
        provider_id: BigInt(user.id),
        name: body.name,
        description: body.description || null,
        duration: body.duration,
        price: new Prisma.Decimal(body.price),
        category: body.category || null
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put("/services/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    const { id } = req.params;
    const body = serviceSchema.partial().parse(req.body);

    await prisma.provider_custom_services.update({
      where: { id: Number(id), provider_id: BigInt(user!.id) },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.duration && { duration: body.duration }),
        ...(body.price !== undefined && { price: new Prisma.Decimal(body.price) }),
        ...(body.category && { category: body.category })
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete("/services/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthRequest).user;
    const { id } = req.params;

    await prisma.provider_custom_services.update({
      where: { id: Number(id), provider_id: BigInt(user!.id) },
      data: { active: false }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
