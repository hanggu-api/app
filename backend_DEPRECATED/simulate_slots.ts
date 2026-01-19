import { format } from 'date-fns';
import db from './src/database/db';

// Mimic the logic in appointments.ts
async function simulateSlots() {
    const providerId = 832;
    const dateStr = '2026-01-18';
    const nowBr = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

    console.log('Now BR:', nowBr.toISOString());
    console.log('Date Str:', dateStr);

    const [y, m, d] = dateStr.split('-').map(Number);

    // Default fallback
    const dayConfig = {
        is_active: true,
        start_time: '08:00:00',
        end_time: '18:00:00',
        lunch_start: '12:00:00',
        lunch_end: '13:00:00',
        slot_duration: 30
    };

    const toMin = (t: string) => {
        const [h, min] = t.split(':').map(Number);
        return h * 60 + min;
    };

    const startMin = toMin(dayConfig.start_time);
    let endMinReal = toMin(dayConfig.end_time);
    if (endMinReal <= startMin) endMinReal += 1440;

    const lStartMin = toMin(dayConfig.lunch_start);
    const lEndMin = toMin(dayConfig.lunch_end);
    const duration = 30;

    const todayStr = format(nowBr, 'yyyy-MM-dd');
    const isToday = (dateStr === todayStr);
    const nowMinutesTotal = nowBr.getHours() * 60 + nowBr.getMinutes();

    console.log('isToday:', isToday);
    console.log('nowMinutesTotal:', nowMinutesTotal);

    const slots = [];
    let curMin = startMin;

    while (curMin < endMinReal) {
        const nextMin = curMin + duration;

        if (isToday && nextMin <= nowMinutesTotal) {
            curMin = nextMin;
            continue;
        }

        const isLunch = curMin >= lStartMin && curMin < lEndMin;
        if (!isLunch) {
            slots.push({ curMin, status: 'free' });
        }
        curMin = nextMin;
    }

    console.log('Slots count:', slots.length);
    console.log('First slot min:', slots[0]?.curMin);
}

simulateSlots();
