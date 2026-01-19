import fs from 'fs';
import path from 'path';
import prisma from './src/database/prisma';

async function importProfessions() {
    const csvPath = path.join(__dirname, 'import_professions.csv');
    const data = fs.readFileSync(csvPath, 'utf8');
    const lines = data.split('\n').filter(line => line.trim() !== '');

    console.log(`🚀 Starting import of ${lines.length - 1} records...`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const [userIdStr, profIdStr] = lines[i].split(',').map(s => s.trim());

        try {
            const userId = BigInt(userIdStr);
            const profId = parseInt(profIdStr);

            // Check if user exists and is a provider
            const user = await prisma.users.findUnique({
                where: { id: userId },
                select: { id: true, role: true }
            });

            if (!user) {
                console.log(`⚠️ Skip: User ${userId} not found.`);
                skipCount++;
                continue;
            }

            // Check if profession exists
            const prof = await prisma.professions.findUnique({
                where: { id: profId },
                select: { id: true }
            });

            if (!prof) {
                console.log(`⚠️ Skip: Profession ${profId} not found.`);
                skipCount++;
                continue;
            }

            // Upsert
            await prisma.provider_professions.upsert({
                where: {
                    provider_user_id_profession_id: {
                        provider_user_id: userId,
                        profession_id: profId
                    }
                },
                update: {},
                create: {
                    provider_user_id: userId,
                    profession_id: profId
                }
            });

            successCount++;
            if (successCount % 20 === 0) console.log(`✅ Progress: ${successCount} imported...`);

        } catch (error: any) {
            console.error(`❌ Error on line ${i + 1}:`, error.message);
            errorCount++;
        }
    }

    console.log('\n--- Import Results ---');
    console.log(`✅ Success: ${successCount}`);
    console.log(`⚠️ Skipped: ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    process.exit(0);
}

importProfessions().catch(e => {
    console.error('Fatal error during import:', e);
    process.exit(1);
});
