
import pool from "../src/database/db";
import { format } from "date-fns";

async function debug() {
    const providerId = 832;
    const dateStr = "2026-01-23";

    console.log(`--- DEBUGGING SLOTS FOR ${dateStr} (Provider ${providerId}) ---`);

    // 1. Fetch Appointments first
    const dateObj = new Date(dateStr + "T00:00:00-03:00");
    const startOfDay = new Date(dateObj); // 00:00
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 59);

    const [rows] = (await pool.query(
        `SELECT * FROM appointments 
     WHERE provider_id = ? 
     AND start_time < ? 
     AND end_time > ?
     AND status IN ('scheduled', 'busy', 'completed', 'waiting_payment')`,
        [providerId, endOfDay, startOfDay]
    )) as any;

    console.log(`\nFound ${rows.length} RAW appointments in DB:`);

    // 2. Simulate Slot 12:00
    const time = '12:00';
    const sDate = new Date(`${dateStr}T${time}:00-03:00`);
    const eDate = new Date(sDate);
    eDate.setMinutes(eDate.getMinutes() + 30);

    console.log(`\nChecking Slot: ${time}`);
    console.log(`  Slot Start: ${sDate.toISOString()} (${sDate.getTime()})`);
    console.log(`  Slot End:   ${eDate.toISOString()} (${eDate.getTime()})`);

    const conflict = rows.find((ap: any) => {
        const apStart = new Date(ap.start_time);
        const apEnd = new Date(ap.end_time);

        const cond1 = sDate < apEnd;
        const cond2 = eDate > apStart;
        const overlaps = cond1 && cond2;

        console.log(`    Vs Appt ${ap.id} (${apStart.toISOString()} - ${apEnd.toISOString()}):`);
        console.log(`      Start: ${apStart.getTime()} | End: ${apEnd.getTime()}`);
        console.log(`      sDate < apEnd (${sDate.getTime()} < ${apEnd.getTime()}): ${cond1}`);
        console.log(`      eDate > apStart (${eDate.getTime()} > ${apStart.getTime()}): ${cond2}`);
        console.log(`      OVERLAP: ${overlaps}`);

        return overlaps;
    });

    console.log(`  Result: ${conflict ? 'BUSY' : 'FREE'}`);
    process.exit(0);
}

debug().catch(console.error);
