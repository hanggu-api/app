import { AppointmentRepository } from './src/repositories/appointmentRepository';
import { format } from 'date-fns';

async function simulate() {
    const repo = new AppointmentRepository();
    const providerId = 832;
    const dateStr = '2026-01-27'; // Today

    // Manual Day of Week (Tuesday = 2)
    const dayOfWeek = 2;

    console.log(`[SIM] Checking slots for ${providerId} on ${dateStr} (Day ${dayOfWeek})`);

    const dayConfig = await repo.getDayScheduleConfig(providerId, dayOfWeek);
    console.log('[SIM] dayConfig:', JSON.stringify(dayConfig));

    if (!dayConfig || !dayConfig.is_active) {
        console.log('[SIM] Day is inactive or no config.');
        return;
    }

    // toMin helper imitation
    function toMin(s: any): number {
        if (!s) return 0;
        if (typeof s === 'string') {
            const parts = s.split(':').map(Number);
            return parts[0] * 60 + (parts[1] || 0);
        }
        return 0;
    }

    const startMin = toMin(dayConfig.start_time);
    let endMinReal = toMin(dayConfig.end_time);
    if (endMinReal <= startMin) endMinReal += 1440;

    const duration = dayConfig.slot_duration || 30;

    console.log(`[SIM] Hours: ${dayConfig.start_time} - ${dayConfig.end_time} (${startMin}m - ${endMinReal}m)`);
    console.log(`[SIM] Duration: ${duration}m`);

    // Conflict check simulation
    const appointments = await repo.getAppointments(providerId, new Date(`${dateStr}T00:00:00Z`), new Date(`${dateStr}T23:59:59Z`));
    console.log(`[SIM] Found ${appointments.length} appointments.`);

    let curMin = startMin;
    const slots = [];

    // Simulate "now" as 14:44
    const nowMin = 14 * 60 + 44; // 884

    while (curMin + duration <= endMinReal) {
        const slotStart = curMin;
        const slotEnd = curMin + duration;

        if (curMin < nowMin + 30) {
            console.log(`[SIM] Skipping past/near slot at ${Math.floor(curMin / 60)}:${(curMin % 60).toString().padStart(2, '0')}`);
            curMin += duration;
            continue;
        }

        const isBusy = appointments.some(a => {
            const aStart = a.start_time.getUTCHours() * 60 + a.start_time.getUTCMinutes();
            const aEnd = a.end_time.getUTCHours() * 60 + a.end_time.getUTCMinutes();
            return (slotStart < aEnd && slotEnd > aStart);
        });

        if (!isBusy) {
            slots.push(`${Math.floor(curMin / 60)}:${(curMin % 60).toString().padStart(2, '0')}`);
        }
        curMin += duration;
    }

    console.log('[SIM] Available Slots:', slots);
    process.exit(0);
}

simulate();
