
import { Router, Request, Response } from "express";
import { appointmentRepository } from "../repositories/appointmentRepository";
import { authMiddleware } from "../middleware/authMiddleware";
import { parseISO, format, addMinutes, startOfDay, endOfDay, setHours, setMinutes, setSeconds, isSameDay } from "date-fns";
import { notificationManager } from "../notifications/manager";
import { io } from "../platform";
import prisma from "../database/prisma";

const router = Router();

router.use((req, res, next) => {
  console.log(`[Appointments] ${req.method} ${req.path}`);
  next();
});

// Helper to set time from HH:MM:SS string in a robust way
function setTime(date: Date, timeStr: string): Date {
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  const d = new Date(date);
  // No Vercel, setHours usa o fuso local (que forcei para SP no api/index.ts)
  // Mas para ser 100% seguro contra shifts, vamos trabalhar com números brutos
  d.setHours(hours, minutes, seconds || 0, 0);
  return d;
}

// Get robust Day of Week (0-6) from YYYY-MM-DD
function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dow = date.getUTCDay();
  console.log(`[DEBUG] getDayOfWeek: input=${dateStr} date=${date.toISOString()} result=${dow}`);
  return dow;
}

// Helper to get minutes from HH:MM or HH:MM:SS or Date object
function toMin(s: any): number {
  if (!s) return 0;
  if (typeof s === 'string') {
    const parts = s.split(':').map(Number);
    return parts[0] * 60 + (parts[1] || 0);
  }
  if (s instanceof Date) {
    // For TIME columns, use UTC to avoid timezone shifts
    return s.getUTCHours() * 60 + s.getUTCMinutes();
  }
  return 0;
}

// Get schedule config
router.get("/config", authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const providerId = req.user.id;
    const config = await appointmentRepository.getScheduleConfig(providerId);
    res.json(config);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch config" });
  }
});

// Update schedule config
router.post("/config", authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const providerId = req.user.id;
    const configs = req.body; // Array of configs or single config

    if (Array.isArray(configs)) {
      for (const conf of configs) {
        await appointmentRepository.upsertScheduleConfig(providerId, conf);
      }
    } else {
      await appointmentRepository.upsertScheduleConfig(providerId, configs);
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update config" });
  }
});

// Get slots for a provider on a specific date
router.get("/:providerId/slots", async (req: Request, res: Response) => {
  try {
    const providerId = parseInt(req.params.providerId);

    // Obter data em fuso de Brasília de forma segura independente do fuso do servidor
    const nowBr = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

    // dateStr vem no formato YYYY-MM-DD
    const dateStr = req.query.date as string || format(nowBr, 'yyyy-MM-dd');

    // Parse manual para evitar que parseISO aplique offsets de local server fuso
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayOfWeek = getDayOfWeek(dateStr);

    // Check for exceptions first (special date or holiday)
    console.log(`[DEBUG] Slots: providerId=${providerId}, dateStr=${dateStr}, dayOfWeek=${dayOfWeek}`);
    const ex = await prisma.provider_schedule_exceptions.findFirst({
      where: {
        provider_id: BigInt(providerId),
        date: new Date(dateStr)
      }
    });

    let dayConfig: any = null;

    if (ex) {
      // If start/end time are null, treat as closed
      if (!ex.start_time || !ex.end_time) {
        res.json([]);
        return;
      }
      dayConfig = {
        is_active: true,
        start_time: ex.start_time,
        end_time: ex.end_time,
        // Exceptions table lacks lunch fields, so we assume no lunch or inherit default? 
        // For now, let's assuming no specific lunch override means "no lunch break defined in exception"
        lunch_start: undefined,
        lunch_end: undefined,
        slot_duration: 30
      };
    }

    if (!dayConfig) {
      dayConfig = await appointmentRepository.getDayScheduleConfig(providerId, dayOfWeek);
      console.log(`[DEBUG] dayConfig result for dayOfWeek=${dayOfWeek}:`, JSON.stringify(dayConfig));
    }

    // Defaults
    let startHour = 8;
    let endHour = 18;
    let slotDuration = 30;

    if (dayConfig) {
      if (!dayConfig.is_active) {
        res.json([]);
        return;
      }
    } else {
      // Default fallback if no config found
      dayConfig = {
        is_active: true,
        start_time: '08:00:00',
        end_time: '18:00:00',
        lunch_start: '12:00:00',
        lunch_end: '13:00:00',
        slot_duration: 30
      };
    }

    const slots: any[] = [];


    const startMin = toMin(dayConfig.start_time);
    let endMinReal = toMin(dayConfig.end_time);
    if (endMinReal <= startMin) {
      endMinReal += 1440; // Midnight crossing (e.g. 06:00 to 02:30 next day)
    }
    const lStartMin = dayConfig.lunch_start ? toMin(dayConfig.lunch_start) : -1;
    const lEndMin = dayConfig.lunch_end ? toMin(dayConfig.lunch_end) : -1;
    const duration = dayConfig.slot_duration || 30;

    // Fetch existing appointments (usando range dinâmico que cobre cruzamento de meia-noite)
    const rangeStart = new Date(`${dateStr}T00:00:00-03:00`);
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setMinutes(rangeEnd.getMinutes() + endMinReal);

    const appointments = await appointmentRepository.getAppointments(
      providerId,
      rangeStart,
      rangeEnd
    );

    console.log(`[DEBUG] Fetched ${appointments.length} appointments for conflict check.`);
    appointments.forEach(a => console.log(`  > Appt ${a.id}: ${a.start_time} - ${a.end_time} (${a.status})`));

    const getIsoStr = (totalMin: number) => {
      const daysToAdd = Math.floor(totalMin / 1440);
      const minInDay = totalMin % 1440;
      const hh = Math.floor(minInDay / 60).toString().padStart(2, '0');
      const mm = (minInDay % 60).toString().padStart(2, '0');

      const dObj = new Date(y, m - 1, d);
      dObj.setDate(dObj.getDate() + daysToAdd);

      const yF = dObj.getFullYear();
      const mF = (dObj.getMonth() + 1).toString().padStart(2, '0');
      const dF = dObj.getDate().toString().padStart(2, '0');

      return `${yF}-${mF}-${dF}T${hh}:${mm}:00-03:00`;
    };

    let curMin = startMin;
    const todayStr = format(nowBr, 'yyyy-MM-dd');
    const isToday = (dateStr === todayStr);

    // Pegamos Hora e Minuto de Brasilia
    const nowMinutesTotal = nowBr.getHours() * 60 + nowBr.getMinutes();

    console.log(`[DEBUG] Slots: isToday=${isToday}, nowMinutesTotal=${nowMinutesTotal}, dateStr=${dateStr}, todayStr=${todayStr}`);

    while (curMin < endMinReal) {
      const nextMin = curMin + duration;

      // Filtering past slots for today
      // Um slot de 10:00-10:30 (nextMin=630) é considerado passado se agora for 10:31 (nowMinutesTotal=631)
      if (isToday && nextMin <= nowMinutesTotal) {
        curMin = nextMin;
        continue;
      }

      const sStr = getIsoStr(curMin);
      const eStr = getIsoStr(nextMin);

      const isLunch = lStartMin !== -1 && (curMin >= lStartMin && curMin < lEndMin);

      if (isLunch) {
        slots.push({
          start_time: sStr,
          end_time: eStr,
          status: 'lunch',
          appointment_id: null,
          is_lunch: true
        });
        curMin = nextMin;
        continue;
      }

      // Check conflict with appointments
      const sDate = new Date(sStr);
      const eDate = new Date(eStr);

      const conflict = appointments.find(ap => {
        const apStart = new Date(ap.start_time);
        const apEnd = new Date(ap.end_time);
        return (sDate < apEnd && eDate > apStart);
      });

      let status = 'free';
      if (conflict) {
        status = (conflict as any).status === 'scheduled' ? 'booked' : 'busy';
      }

      const slot = {
        id: `${sStr}-${status}`,
        start_time: sStr,
        end_time: eStr,
        status: status,
        appointment_id: conflict?.id,
        // Pass through details if booked
        client_name: conflict?.client_name,
        client_avatar: conflict?.client_avatar,
        service_profession: conflict?.service_profession,
        service_description: conflict?.service_description,
        service_price: conflict?.service_price,
        service_id: conflict?.service_id,
        service_status: conflict?.service_status
      };

      console.log(`[DEBUG] Generated slot: ${sStr} - status=${status} - isLunch=${isLunch}`);
      slots.push(slot);

      curMin = nextMin;
    }

    res.json(slots);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch slots" });
  }
});

// Provider marks a slot as busy (Walk-in / "Occupied")
router.post("/busy", authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const providerId = req.user.id; // From auth middleware
    const { start_time } = req.body;

    let start = start_time ? parseISO(start_time) : new Date();

    // Round down to nearest 30 min if not precise? 
    // Actually, let's trust the client sends the slot start time
    // Or we logic: if "now", round to current slot
    if (!start_time) {
      const minutes = start.getMinutes();
      const roundedMinutes = minutes >= 30 ? 30 : 0;
      start = setSeconds(setMinutes(start, roundedMinutes), 0);
    }

    const end = addMinutes(start, 30);

    // Check availability
    const isFree = await appointmentRepository.checkAvailability(providerId, start, end);
    if (!isFree) {
      res.status(409).json({ error: "Slot already occupied" });
      return;
    }

    const id = await appointmentRepository.create({
      provider_id: providerId,
      start_time: start,
      end_time: end,
      status: 'busy',
      notes: 'Walk-in / Manual Busy'
    });

    res.json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to mark busy" });
  }
});

// Provider frees up a slot (deletes appointment)
router.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const providerId = req.user.id;
    const appointmentId = parseInt(req.params.id);

    // Get appointment details first to notify client
    const appointment = await appointmentRepository.getById(appointmentId);

    const success = await appointmentRepository.deleteAppointment(appointmentId, providerId);
    if (!success) {
      res.status(404).json({ error: "Appointment not found or not yours" });
      return;
    }

    if (appointment && appointment.client_id) {
      // Notify Client
      const dateStr = format(new Date(appointment.start_time), "dd/MM 'às' HH:mm");
      notificationManager.send(
        Number(appointment.client_id),
        "appointment.cancelled",
        appointmentId.toString(),
        "Agendamento Cancelado",
        `Seu agendamento para ${dateStr} foi cancelado pelo prestador.`,
        { id: appointmentId }
      );
    }

    // Notify Provider (self) to refresh UI via socket
    io.to(`user:${providerId}`).emit('appointment.cancelled', { id: appointmentId });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to free slot" });
  }
});

// Client books a slot
router.post("/book", authMiddleware, async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const clientId = req.user.id;
    const { provider_id, start_time } = req.body;

    if (!provider_id || !start_time) {
      res.status(400).json({ error: "Missing fields" });
      return;
    }

    const start = parseISO(start_time);
    const bookDateStr = format(start, 'yyyy-MM-dd');
    const bookDayOfWeek = getDayOfWeek(bookDateStr);
    const bookMin = start.getHours() * 60 + start.getMinutes();

    // Fetch config once
    const allConfigs = await appointmentRepository.getScheduleConfig(provider_id);
    const currentConfig = allConfigs.find(c => Number(c.day_of_week) === bookDayOfWeek);

    const slotDuration = currentConfig?.slot_duration || 30;
    const end = addMinutes(start, slotDuration);

    // Check two possibilities:
    // 1. Defined on the same day (e.g. 09:00-18:00 turn)
    // 2. Defined on the previous day and crossing midnight (e.g. 22:00-02:00 turn)

    // Check previous day config for midnight overflow
    const prevDay = (bookDayOfWeek + 6) % 7;
    const prevConfig = allConfigs.find(c => Number(c.day_of_week) === prevDay);

    let withinHours = false;

    // Check current day turn
    if (currentConfig && currentConfig.is_active) {
      const sMin = toMin(currentConfig.start_time);
      let eMin = toMin(currentConfig.end_time);
      if (eMin <= sMin) eMin += 1440; // Turn crosses midnight

      if (bookMin >= sMin && bookMin < eMin) withinHours = true;
    }

    // Check previous day overflow
    if (!withinHours && prevConfig && prevConfig.is_active) {
      const sMinPrev = toMin(prevConfig.start_time);
      const eMinPrev = toMin(prevConfig.end_time);
      if (eMinPrev <= sMinPrev) {
        // Midnight crossed, check overflow into today
        const overflowMin = bookMin + 1440; // BookMin is small (dawn), compare as minutes of Sunday turn
        if (overflowMin >= sMinPrev && overflowMin < eMinPrev + 1440) withinHours = true;
      }
    }

    if (!withinHours) {
      res.status(403).json({ error: "Provider does not work at this time" });
      return;
    }

    const isFree = await appointmentRepository.checkAvailability(provider_id, start, end);
    if (!isFree) {
      res.status(409).json({ error: "Slot not available" });
      return;
    }

    const id = await appointmentRepository.create({
      provider_id,
      client_id: clientId,
      start_time: start,
      end_time: end,
      status: 'scheduled'
    });

    // Notify Provider
    const dateStr = format(start, "dd/MM 'às' HH:mm");
    notificationManager.send(
      provider_id,
      "appointment.new", // Type
      id.toString(),
      "Novo Agendamento",
      `Novo agendamento para ${dateStr}`,
      { id: id }
    );

    // Emit socket event for realtime update
    io.to(`user:${provider_id}`).emit('appointment.new', { id });

    res.json({ success: true, appointmentId: id });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to book appointment" });
  }
});

export default router;
