import pool from "../db";

export async function run() {
    try {
        console.log("Seeding COMPLETE Beauty Services (Maranhão Market 2025/2026)...");

        // Define Professions and their Services
        const definitions = [
            {
                // 1. Barbeiros
                profession: "Barbeiro", 
                services: [
                    {
                        name: "Corte Masculino (Social)",
                        price: 38.00, // Avg R$ 30,00 - R$ 45,00
                        keywords: "Duração: 30 min | Faixa: R$ 30-45 | Foco em agilidade"
                    },
                    {
                        name: "Corte Degradê (Fade)",
                        price: 53.00, // Avg R$ 45,00 - R$ 60,00
                        keywords: "Duração: 45 min | Faixa: R$ 45-60 | Técnica degradê"
                    },
                    {
                        name: "Barba Simples (Máquina/Navalha)",
                        price: 30.00, // Avg R$ 25,00 - R$ 35,00
                        keywords: "Duração: 20 min | Faixa: R$ 25-35"
                    },
                    {
                        name: "Barboterapia (Toalha Quente)",
                        price: 53.00, // Avg R$ 45,00 - R$ 60,00
                        keywords: "Duração: 40 min | Faixa: R$ 45-60 | Relaxamento com toalha quente"
                    },
                    {
                        name: "Pezinho (Acabamento)",
                        price: 18.00, // Avg R$ 15,00 - R$ 20,00
                        keywords: "Duração: 15 min | Faixa: R$ 15-20"
                    },
                    {
                        name: "Pigmentação de Barba/Cabelo",
                        price: 40.00, // Avg R$ 30,00 - R$ 50,00
                        keywords: "Duração: 30 min | Faixa: R$ 30-50"
                    },
                    {
                        name: "Combo: Corte + Barba",
                        price: 80.00, // Avg R$ 70,00 - R$ 90,00
                        keywords: "Duração: 1h 10min | Faixa: R$ 70-90"
                    }
                ]
            },
            {
                // 2. Cabeleireiros
                profession: "Cabeleireiro",
                services: [
                    {
                        name: "Corte Feminino (Lavado)",
                        price: 80.00, // Avg R$ 60,00 - R$ 100,00
                        keywords: "Duração: 1h 00min | Faixa: R$ 60-100 | Inclui lavagem"
                    },
                    {
                        name: "Escova + Chapinha",
                        price: 65.00, // Avg R$ 45,00 - R$ 85,00
                        keywords: "Duração: 50 min | Faixa: R$ 45-85 | Finalização"
                    },
                    {
                        name: "Hidratação Profunda",
                        price: 70.00, // Avg R$ 50,00 - R$ 90,00
                        keywords: "Duração: 40 min | Faixa: R$ 50-90 | Tratamento"
                    },
                    {
                        name: "Selagem / Progressiva",
                        price: 225.00, // Avg R$ 150,00 - R$ 300,00
                        keywords: "Duração: 2h 30min | Faixa: R$ 150-300 | Alisamento/Redução de volume"
                    },
                    {
                        name: "Luzes / Mechas",
                        price: 425.00, // Avg R$ 250,00 - R$ 600,00
                        keywords: "Duração: 4h 00min | Faixa: R$ 250-600 | Descoloração"
                    },
                    {
                        name: "Coloração (Aplicação)",
                        price: 70.00, // Avg R$ 60,00 - R$ 80,00
                        keywords: "Duração: 1h 00min | Faixa: R$ 60-80"
                    },
                    {
                        name: "Cauterização Capilar",
                        price: 150.00, // Avg R$ 120,00 - R$ 180,00
                        keywords: "Duração: 1h 20min | Faixa: R$ 120-180 | Reconstrução"
                    }
                ]
            },
            {
                // 3. Manicures
                profession: "Manicure",
                services: [
                    {
                        name: "Manicure (Mão)",
                        price: 30.00, // Avg R$ 25,00 - R$ 35,00
                        keywords: "Duração: 40 min | Faixa: R$ 25-35"
                    },
                    {
                        name: "Pedicure (Pé)",
                        price: 35.00, // Avg R$ 30,00 - R$ 40,00
                        keywords: "Duração: 45 min | Faixa: R$ 30-40"
                    },
                    {
                        name: "Combo Pé e Mão",
                        price: 58.00, // Avg R$ 50,00 - R$ 65,00
                        keywords: "Duração: 1h 20min | Faixa: R$ 50-65"
                    },
                    {
                        name: "Esmaltação em Gel",
                        price: 70.00, // Avg R$ 60,00 - R$ 80,00
                        keywords: "Duração: 50 min | Faixa: R$ 60-80"
                    },
                    {
                        name: "Alongamento em Fibra de Vidro",
                        price: 165.00, // Avg R$ 130,00 - R$ 200,00
                        keywords: "Duração: 2h 30min | Faixa: R$ 130-200"
                    },
                    {
                        name: "Manutenção de Alongamento",
                        price: 95.00, // Avg R$ 80,00 - R$ 110,00
                        keywords: "Duração: 1h 30min | Faixa: R$ 80-110"
                    },
                    {
                        name: "Banho de Gel",
                        price: 110.00, // Avg R$ 90,00 - R$ 130,00
                        keywords: "Duração: 1h 00min | Faixa: R$ 90-130"
                    }
                ]
            },
            {
                // 4. Esteticistas
                profession: "Esteticista", // Renaming/Unifying to Esteticista (covers Facial + Body)
                services: [
                    {
                        name: "Design de Sobrancelha",
                        price: 43.00, // Avg R$ 35,00 - R$ 50,00
                        keywords: "Duração: 30 min | Faixa: R$ 35-50"
                    },
                    {
                        name: "Sobrancelha com Henna",
                        price: 60.00, // Avg R$ 50,00 - R$ 70,00
                        keywords: "Duração: 45 min | Faixa: R$ 50-70"
                    },
                    {
                        name: "Limpeza de Pele Express",
                        price: 85.00, // Avg R$ 70,00 - R$ 100,00
                        keywords: "Duração: 40 min | Faixa: R$ 70-100"
                    },
                    {
                        name: "Limpeza de Pele Profunda",
                        price: 165.00, // Avg R$ 130,00 - R$ 200,00
                        keywords: "Duração: 1h 30min | Faixa: R$ 130-200"
                    },
                    {
                        name: "Depilação de Buço (Cera)",
                        price: 20.00, // Avg R$ 15,00 - R$ 25,00
                        keywords: "Duração: 15 min | Faixa: R$ 15-25"
                    },
                    {
                        name: "Extensão de Cílios (Fio a Fio)",
                        price: 150.00, // Avg R$ 120,00 - R$ 180,00
                        keywords: "Duração: 2h 00min | Faixa: R$ 120-180"
                    },
                    {
                        name: "Drenagem Linfática (Sessão)",
                        price: 115.00, // Avg R$ 80,00 - R$ 150,00
                        keywords: "Duração: 1h 00min | Faixa: R$ 80-150"
                    }
                ]
            },
            {
                // 5. Bronzeamento
                profession: "Bronzeamento",
                services: [
                    {
                        name: "Bronzeamento Natural (Fita)",
                        price: 94.50, // Median 105 * 0.9 (10% commission)
                        keywords: "Duração: 3h-4h | Faixa: R$ 80-130 | Montagem biquíni fita + sol"
                    },
                    {
                        name: "Bronzeamento a Jato (DHA)",
                        price: 135.00, // Median 150 * 0.9
                        keywords: "Duração: 40 min | Faixa: R$ 120-180 | Spray autobronzeador"
                    },
                    {
                        name: "Bronze Gel (Na máquina)",
                        price: 112.50, // Median 125 * 0.9
                        keywords: "Duração: 30-50 min | Faixa: R$ 100-150 | Câmara de bronzeamento"
                    },
                    {
                        name: "Banho de Lua (Descoloração)",
                        price: 49.50, // Median 55 * 0.9
                        keywords: "Duração: 40 min | Faixa: R$ 40-70 | Pelos dourados + esfoliação"
                    },
                    {
                        name: "Bronze Neon (Festa)",
                        price: 166.50, // Median 185 * 0.9
                        keywords: "Duração: 1h 00min | Faixa: R$ 150-220 | Brilha na luz negra"
                    },
                    {
                        name: "Hidratação Pós-Bronze",
                        price: 40.50, // Median 45 * 0.9
                        keywords: "Duração: 30 min | Faixa: R$ 30-60 | Manutenção da cor"
                    },
                    {
                        name: "Combo: Bronze + Banho de Lua",
                        price: 139.50, // Median 155 * 0.9
                        keywords: "Duração: 4h 30min | Faixa: R$ 130-180 | Pacote completo"
                    }
                ]
            }
        ];

        // Ensure Professions Exist
        for (const def of definitions) {
            console.log(`Checking profession '${def.profession}'...`);
            
            // Insert Profession if not exists
            // For "Esteticista", we might want to consolidate "Esteticista Facial" if it exists.
            // But for simplicity, we'll just upsert the profession.
            await pool.query(
                `INSERT INTO professions (name, service_type, keywords) 
                 VALUES (?, 'beauty', ?) 
                 ON DUPLICATE KEY UPDATE service_type = 'beauty'`,
                [def.profession, `beleza,estética,${def.profession.toLowerCase()}`]
            );

            // Get ID
            const [rows]: any = await pool.query("SELECT id FROM professions WHERE name = ?", [def.profession]);
            const profId = rows[0].id;

            console.log(`Seeding services for '${def.profession}' (ID: ${profId})...`);

            for (const service of def.services) {
                // Check if exists by name and profession_id
                const [existing]: any = await pool.query(
                    "SELECT id FROM task_catalog WHERE profession_id = ? AND name = ?",
                    [profId, service.name]
                );

                if (existing.length > 0) {
                    // Update
                    await pool.query(
                        `UPDATE task_catalog 
                         SET unit_price = ?, keywords = ?, active = 1
                         WHERE id = ?`,
                        [service.price, service.keywords, existing[0].id]
                    );
                } else {
                    // Insert
                    await pool.query(
                        `INSERT INTO task_catalog (profession_id, name, unit_price, keywords, pricing_type, active)
                         VALUES (?, ?, ?, ?, 'fixed', 1)`,
                        [profId, service.name, service.price, service.keywords]
                    );
                }
            }
        }

        console.log("Seeding completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding services:", error);
        process.exit(1);
    }
}

run();
