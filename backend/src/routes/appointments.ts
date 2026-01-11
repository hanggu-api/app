
import { Router, Request, Response } from "express";
import { appointmentRepository } from "../repositories/appointmentRepository";
import { authMiddleware } from "../middleware/authMiddleware";
import { parseISO, format, addMinutes, startOfDay, endOfDay, setHours, setMinutes, setSeconds, isSameDay } from "date-fns";

const router = Router();

router.use((req, res, next) => {
  console.log(`[Appointments] ${req.method} ${req.path}`);
  next();
});

// Helper to set time from HH:MM:SS string
function setTime(date: Date, timeStr: string): Date {
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return setSeconds(setMinutes(setHours(date, hours), minutes), seconds || 0);
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
    const dateStr = req.query.date as string || format(new Date(), 'yyyy-MM-dd');
    const targetDate = parseISO(dateStr);
    
    // Get schedule config
    const dayOfWeek = targetDate.getDay();
    const allConfigs = await appointmentRepository.getScheduleConfig(providerId);
    const dayConfig = allConfigs.find(c => c.day_of_week === dayOfWeek);

    // Defaults
    let startHour = 8;
    let endHour = 18;
    let slotDuration = 30;
    let lunchStart: Date | null = null;
    let lunchEnd: Date | null = null;

    let current: Date;
    let end: Date;

    if (dayConfig) {
      if (!dayConfig.is_active) {
         res.json([]);
         return;
      }
      current = setTime(targetDate, dayConfig.start_time);
      end = setTime(targetDate, dayConfig.end_time);
      slotDuration = dayConfig.slot_duration || 30;
      if (dayConfig.lunch_start && dayConfig.lunch_end) {
        lunchStart = setTime(targetDate, dayConfig.lunch_start);
        lunchEnd = setTime(targetDate, dayConfig.lunch_end);
      }
    } else {
      // Default fallback if no config found
      current = setSeconds(setMinutes(setHours(targetDate, startHour), 0), 0);
      end = setSeconds(setMinutes(setHours(targetDate, endHour), 0), 0);

      // Default lunch 12:00 - 13:00
      lunchStart = setSeconds(setMinutes(setHours(targetDate, 12), 0), 0);
      lunchEnd = setSeconds(setMinutes(setHours(targetDate, 13), 0), 0);
    }
    
    const slots = [];

    // Fetch existing appointments
    const appointments = await appointmentRepository.getAppointments(
      providerId, 
      startOfDay(targetDate), 
      endOfDay(targetDate)
    );

    while (current < end) {
      const slotEnd = addMinutes(current, slotDuration);
      
      // Check lunch
      let isLunch = false;
      if (lunchStart && lunchEnd) {
        // If slot overlaps with lunch
        // Simple check: if slot start is inside lunch window
        if (current >= lunchStart && current < lunchEnd) {
          isLunch = true;
        }
      }

      if (isLunch) {
         // Skip or mark as lunch? 
         // "incluindo tempo horario de almoço" -> maybe show it?
         // Let's add it as 'busy' (Lunch)
         slots.push({
            start_time: format(current, "yyyy-MM-dd'T'HH:mm:ss"),
            end_time: format(slotEnd, "yyyy-MM-dd'T'HH:mm:ss"),
            status: 'lunch',
            appointment_id: null,
            is_lunch: true
         });
         current = slotEnd;
         continue;
      }
      
      // Check if this slot overlaps with any appointment
      const conflict = appointments.find(appt => {
        const apptStart = new Date(appt.start_time);
        const apptEnd = new Date(appt.end_time);
        // Simple overlap check
        return (current < apptEnd && slotEnd > apptStart);
      });

      let status = 'free';
      if (conflict) {
        status = conflict.status === 'busy' ? 'busy' : 'booked';
      }

      slots.push({
        start_time: format(current, "yyyy-MM-dd'T'HH:mm:ss"),
        end_time: format(slotEnd, "yyyy-MM-dd'T'HH:mm:ss"),
        status: status,
        appointment_id: conflict?.id
      });

      current = slotEnd;
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

    const id = await appointmentRepository.createAppointment({
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

    const success = await appointmentRepository.deleteAppointment(appointmentId, providerId);
    if (!success) {
      res.status(404).json({ error: "Appointment not found or not yours" });
      return;
    }

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
    const end = addMinutes(start, 30);

    const isFree = await appointmentRepository.checkAvailability(provider_id, start, end);
    if (!isFree) {
        res.status(409).json({ error: "Slot not available" });
        return;
    }

    const id = await appointmentRepository.createAppointment({
        provider_id,
        client_id: clientId,
        start_time: start,
        end_time: end,
        status: 'scheduled'
    });

    res.json({ success: true, appointmentId: id });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to book appointment" });
  }
});

export default router;
