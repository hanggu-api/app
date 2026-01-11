import pool from "../db";

export async function run() {
    try {
        console.log("Seeding hairdresser and beauty services (Maranhão Market)...");

        // Define Professions and their Services
        const definitions = [
            {
                profession: "Cabeleireiro",
                services: [
                    {
                        name: "Corte Masculino (Simples/Social)",
                        price: 40.00, // Avg of 30-50
                        keywords: "Duração: 40 min | Faixa: R$ 30-50 | Corte clássico tesoura ou máquina"
                    },
                    {
                        name: "Corte Degradê (Fade)",
                        price: 50.00, // Avg of 45-60
                        keywords: "Duração: 50 min | Faixa: R$ 45-60 | Estilo moderno com transição suave"
                    },
                    {
                        name: "Corte Feminino",
                        price: 70.00, // Avg of 50-90
                        keywords: "Duração: 60 min | Faixa: R$ 50-90 | Geralmente inclui lavagem"
                    },
                    {
                        name: "Escova (Brushing)",
                        price: 60.00, // Avg of 40-80
                        keywords: "Duração: 50 min | Faixa: R$ 40-80 | Valor varia pelo comprimento"
                    },
                    {
                        name: "Barba (Barboterapia/Toalha Quente)",
                        price: 40.00, // Avg of 30-50
                        keywords: "Duração: 30 min | Faixa: R$ 30-50 | Uso de toalha quente e massagem"
                    },
                    {
                        name: "Combo Corte + Barba",
                        price: 80.00, // Avg of 70-90
                        keywords: "Duração: 1h 15min | Faixa: R$ 70-90 | Serviço completo"
                    },
                    {
                        name: "Progressiva / Selagem",
                        price: 185.00, // Avg of 120-250
                        keywords: "Duração: 2h-3h | Faixa: R$ 120-250 | Alta demanda devido ao clima"
                    },
                    {
                        name: "Coloração (Só aplicação)",
                        price: 60.00, // Avg of 50-70
                        keywords: "Duração: 45 min | Faixa: R$ 50-70 | Cliente geralmente leva a tinta"
                    },
                    {
                        name: "Hidratação Profunda",
                        price: 80.00, // Avg of 60-100
                        keywords: "Duração: 45 min | Faixa: R$ 60-100 | Reposição hídrica e brilho"
                    },
                    {
                        name: "Luzes / Mechas",
                        price: 250.00, // Avg of 200-350
                        keywords: "Duração: 4h | Faixa: R$ 200-350 | Inclui matização e escova"
                    },
                    {
                        name: "Botox Capilar",
                        price: 120.00, // Avg of 100-150
                        keywords: "Duração: 1h 30min | Faixa: R$ 100-150 | Redução de volume e frizz"
                    },
                    {
                        name: "Matização",
                        price: 50.00, // Avg of 40-70
                        keywords: "Duração: 30 min | Faixa: R$ 40-70 | Neutralização de tons amarelados"
                    }
                ]
            },
            {
                profession: "Manicure",
                services: [
                    {
                        name: "Mão (Manicure simples)",
                        price: 25.00, // Avg of 20-30
                        keywords: "Duração: 35 min | Faixa: R$ 20-30 | Esmaltação simples"
                    },
                    {
                        name: "Pé (Pedicure simples)",
                        price: 30.00, // Avg of 25-35
                        keywords: "Duração: 35 min | Faixa: R$ 25-35 | Inclui cutilagem"
                    },
                    {
                        name: "Combo Pé e Mão",
                        price: 50.00, // Avg of 45-60
                        keywords: "Duração: 1h 10min | Faixa: R$ 45-60 | O serviço mais agendado"
                    },
                    {
                        name: "Alongamento (Gel ou Fibra)",
                        price: 155.00, // Avg of 120-190
                        keywords: "Duração: 2h 15min | Faixa: R$ 120-190 | Manutenção mensal obrigatória"
                    },
                    {
                        name: "Esmaltação em Gel",
                        price: 75.00, // Avg of 60-90
                        keywords: "Duração: 50 min | Faixa: R$ 60-90 | Maior durabilidade"
                    },
                    {
                        name: "Spa dos Pés",
                        price: 50.00, // Avg of 40-60
                        keywords: "Duração: 40 min | Faixa: R$ 40-60 | Esfoliação e retirada de calosidades"
                    }
                ]
            },
            {
                profession: "Esteticista Facial",
                services: [
                    {
                        name: "Design de Sobrancelha",
                        price: 40.00, // Avg of 30-50
                        keywords: "Duração: 25 min | Faixa: R$ 30-50"
                    },
                    {
                        name: "Sobrancelha com Henna",
                        price: 55.00, // Avg of 45-65
                        keywords: "Duração: 40 min | Faixa: R$ 45-65"
                    },
                    {
                        name: "Depilação de Buço (Cera/Linha)",
                        price: 20.00, // Avg of 15-25
                        keywords: "Duração: 15 min | Faixa: R$ 15-25"
                    },
                    {
                        name: "Limpeza de Pele Básica",
                        price: 105.00, // Avg of 80-130
                        keywords: "Duração: 60 min | Faixa: R$ 80-130"
                    },
                    {
                        name: "Maquiagem Social",
                        price: 150.00, // Avg of 100-200
                        keywords: "Duração: 60 min | Faixa: R$ 100-200"
                    }
                ]
            }
        ];

        // Ensure Professions Exist
        for (const def of definitions) {
            console.log(`Checking profession '${def.profession}'...`);
            
            // Insert Profession if not exists
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
