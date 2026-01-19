import pool from "../db";

export async function run() {
    try {
        console.log("Seeding barber services...");

        // 1. Get Profession IDs
        const [rows] = await pool.query("SELECT id, name FROM professions WHERE name IN (?, ?)", ["Barbeiro Masculino", "Barbeiro"]);
        const professions = (rows as any[]);

        if (professions.length === 0) {
            console.error("No barber professions found. Run seed_barber.ts first.");
            process.exit(1);
        }

        const services = [
            {
                name: "Corte Social",
                price: 40.00,
                keywords: "Duração: 40 min | Faixa: R$ 35-50 | Corte clássico feito na tesoura ou máquina"
            },
            {
                name: "Corte Degradê (Fade)",
                price: 50.00,
                keywords: "Duração: 50 min | Faixa: R$ 45-60 | Estilo moderno com transição suave (máquina)"
            },
            {
                name: "Barba Completa",
                price: 40.00,
                keywords: "Duração: 30 min | Faixa: R$ 30-45 | Alinhamento com navalha e hidratação"
            },
            {
                name: "Barboterapia",
                price: 50.00,
                keywords: "Duração: 45 min | Faixa: R$ 45-65 | Barba com toalha quente, massagem e óleos"
            },
            {
                name: "Pezinho (Contorno)",
                price: 15.00,
                keywords: "Duração: 15 min | Faixa: R$ 10-20 | Limpeza rápida apenas nos contornos"
            },
            {
                name: "Combo: Cabelo + Barba",
                price: 80.00,
                keywords: "Duração: 75 min | Faixa: R$ 70-90 | O serviço completo para quem tem pouco tempo"
            },
            {
                name: "Camuflagem de Fios",
                price: 40.00,
                keywords: "Duração: 20 min | Faixa: R$ 35-50 | Cobertura rápida de cabelos brancos"
            },
            {
                name: "Sobrancelha (Navalha)",
                price: 20.00,
                keywords: "Duração: 15 min | Faixa: R$ 15-25 | Limpeza e desenho da sobrancelha masculina"
            }
        ];

        for (const prof of professions) {
            console.log(`Seeding services for '${prof.name}' (ID: ${prof.id})...`);
            for (const service of services) {
                // Check if exists by name and profession_id
                const [existing] = await pool.query(
                    "SELECT id FROM task_catalog WHERE profession_id = ? AND name = ?",
                    [prof.id, service.name]
                );

                if ((existing as any[]).length > 0) {
                    // Update
                    await pool.query(
                        `UPDATE task_catalog 
                         SET unit_price = ?, keywords = ?, active = 1
                         WHERE id = ?`,
                        [service.price, service.keywords, (existing as any[])[0].id]
                    );
                } else {
                    // Insert
                    await pool.query(
                        `INSERT INTO task_catalog (profession_id, name, unit_price, keywords, pricing_type, active)
                         VALUES (?, ?, ?, ?, 'fixed', 1)`,
                        [prof.id, service.name, service.price, service.keywords]
                    );
                }
            }
        }

        console.log(`Seeded services for ${professions.length} barber professions.`);
        process.exit(0);
    } catch (error) {
        console.error("Error seeding barber services:", error);
        process.exit(1);
    }
}

run();
