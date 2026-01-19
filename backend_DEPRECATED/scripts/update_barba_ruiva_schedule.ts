import admin from "firebase-admin";
import path from "path";
import fs from "fs";

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

async function updateBarbaRuivaSchedule() {
    try {
        console.log("🔍 Procurando prestador 'barba ruiva'...");

        // Search for the provider in Firestore
        const providersRef = db.collection("providers");
        const snapshot = await providersRef.get();

        let targetProvider: any = null;
        let targetProviderId: string | null = null;

        snapshot.forEach((doc) => {
            const data = doc.data();
            const commercialName = (data.commercial_name || "").toLowerCase();
            const fullName = (data.full_name || "").toLowerCase();

            if (
                commercialName.includes("barba") && commercialName.includes("ruiva") ||
                fullName.includes("barba") && fullName.includes("ruiva")
            ) {
                targetProvider = data;
                targetProviderId = doc.id;
            }
        });

        if (!targetProvider || !targetProviderId) {
            console.log("❌ Prestador 'barba ruiva' não encontrado no Firestore.");
            console.log("\n📋 Listando todos os prestadores:");

            snapshot.forEach((doc) => {
                const data = doc.data();
                console.log(`  - ID: ${doc.id}`);
                console.log(`    Nome: ${data.full_name || "N/A"}`);
                console.log(`    Nome Comercial: ${data.commercial_name || "N/A"}`);
                console.log("");
            });

            process.exit(1);
        }

        console.log(`✅ Prestador encontrado!`);
        console.log(`   ID: ${targetProviderId}`);
        console.log(`   Nome: ${targetProvider.full_name || "N/A"}`);
        console.log(`   Nome Comercial: ${targetProvider.commercial_name || "N/A"}`);

        // Create schedule configuration
        const scheduleConfig = {
            start_time: "07:00",
            end_time: "18:00",
            lunch_start: null,
            lunch_end: null,
            slot_duration: 30, // 30 minutes per slot
            days_of_week: {
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true,
                saturday: true,
                sunday: true,
            },
            is_active: true,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Update provider document with schedule config
        await providersRef.doc(targetProviderId).update({
            schedule_config: scheduleConfig,
        });

        console.log("\n✅ Agenda atualizada com sucesso!");
        console.log("\n📅 Configuração aplicada:");
        console.log("   Dias: Segunda a Domingo (todos os dias)");
        console.log("   Horário: 07:00 - 18:00");
        console.log("   Sem horário de almoço");
        console.log("   Duração do slot: 30 minutos");

        // Now generate slots for the next 30 days
        console.log("\n🔄 Gerando slots de disponibilidade para os próximos 30 dias...");

        const slotsRef = db.collection("provider_slots");
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let totalSlotsCreated = 0;

        for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() + dayOffset);

            const dateStr = currentDate.toISOString().split("T")[0]; // YYYY-MM-DD

            // Generate slots from 07:00 to 18:00 (every 30 minutes)
            const startHour = 7;
            const endHour = 18;

            for (let hour = startHour; hour < endHour; hour++) {
                for (let minute = 0; minute < 60; minute += 30) {
                    const startTime = new Date(currentDate);
                    startTime.setHours(hour, minute, 0, 0);

                    const endTime = new Date(startTime);
                    endTime.setMinutes(startTime.getMinutes() + 30);

                    // Check if slot already exists
                    const slotQuery = await slotsRef
                        .where("provider_id", "==", targetProviderId)
                        .where("date", "==", dateStr)
                        .where("start_time", "==", startTime)
                        .limit(1)
                        .get();

                    if (slotQuery.empty) {
                        // Create new slot
                        await slotsRef.add({
                            provider_id: targetProviderId,
                            date: dateStr,
                            start_time: startTime,
                            end_time: endTime,
                            status: "free",
                            created_at: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        totalSlotsCreated++;
                    }
                }
            }
        }

        console.log(`✅ ${totalSlotsCreated} slots criados com sucesso!`);
        console.log("\n🎉 Configuração completa!");

        process.exit(0);
    } catch (error) {
        console.error("❌ Erro ao atualizar agenda:", error);
        process.exit(1);
    }
}

updateBarbaRuivaSchedule();
