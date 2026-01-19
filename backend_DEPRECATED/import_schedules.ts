import fs from 'fs';
import path from 'path';
import prisma from './src/database/prisma';

async function fixSchedules() {
    const csvPath = path.join(__dirname, 'import_schedules.csv');
    const data = fs.readFileSync(csvPath, 'utf8');
    const lines = data.split('\n').filter(line => line.trim() !== '');

    console.log('🧹 Cleaning up wrong table...');
    await prisma.provider_schedule_configs.deleteMany({});

    console.log(`🚀 Starting import of ${lines.length - 1} schedule records into correct table...`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    const toHHMM = (timeStr: string | null) => {
        if (!timeStr || timeStr === 'NULL' || timeStr === '') return null;
        const clean = timeStr.replace(/"/g, '');
        if (clean === 'NULL') return null;
        // Assume format is HH:MM:SS, take HH:MM
        return clean.substring(0, 5);
    };

    const parseDateTime = (dtStr: string | null) => {
        if (!dtStr || dtStr === 'NULL' || dtStr === '') return null;
        const clean = dtStr.replace(/"/g, '');
        if (clean === 'NULL') return null;
        return new Date(clean.replace(' ', 'T') + 'Z');
    };

    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!parts || parts.length < 11) {
            skipCount++;
            continue;
        }

        const cleanParts = parts.map(p => p.replace(/"/g, ''));

        const [
            idStr, providerIdStr, dayOfWeekStr,
            startTimeStr, endTimeStr, breakStartStr,
            breakEndStr, slotDurationStr, isEnabledStr,
            createdAtStr, updatedAtStr
        ] = cleanParts;

        try {
            const providerId = BigInt(providerIdStr);
            const dayOfWeek = parseInt(dayOfWeekStr);
            const slotDuration = parseInt(slotDurationStr);
            const isEnabled = isEnabledStr === '1';

            const startHHMM = toHHMM(startTimeStr) || '09:00';
            const endHHMM = toHHMM(endTimeStr) || '18:00';
            const bStartHHMM = toHHMM(breakStartStr);
            const bEndHHMM = toHHMM(breakEndStr);

            // Manual upsert because table lacks unique constraint in schema.prisma metadata (even if it exists in DB)
            const existing = await prisma.provider_schedules.findFirst({
                where: { provider_id: providerId, day_of_week: dayOfWeek }
            });

            const data: any = {
                provider_id: providerId,
                day_of_week: dayOfWeek,
                start_time: startHHMM,
                end_time: endHHMM,
                break_start: bStartHHMM,
                break_end: bEndHHMM,
                is_enabled: isEnabled,
                created_at: parseDateTime(createdAtStr) || new Date(),
                updated_at: parseDateTime(updatedAtStr) || new Date()
            };

            if (existing) {
                await prisma.provider_schedules.update({
                    where: { id: existing.id },
                    data
                });
            } else {
                await prisma.provider_schedules.create({ data });
            }

            successCount++;
            if (successCount % 10 === 0) console.log(`✅ Progress: ${successCount} schedules synced...`);

        } catch (error: any) {
            console.error(`❌ Error on line ${i + 1}:`, error.message);
            errorCount++;
        }
    }

    console.log('\n--- Final Sync Results ---');
    console.log(`✅ Success: ${successCount}`);
    console.log(`⚠️ Skipped: ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    process.exit(0);
}

fixSchedules().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
