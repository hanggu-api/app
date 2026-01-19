import pool from "../db";

export async function run() {
    try {
        console.log("Seeding COMPLETE Pedreiro Services (Maranhão Market 2025/2026)...");

        // Define Professions and their Services
        const definitions = [
            {
                profession: "Pedreiro",
                service_type: "construction",
                keywords: "construção,reforma,obras,pedreiro,alvenaria",
                services: [
                    // 1. Categoria: Pequenos Reparos e Instalações
                    {
                        name: "Troca de Fechadura ou Maçaneta",
                        price: 49.50, // Median 55 * 0.9
                        keywords: "Duração: 30-45 min | Faixa: R$ 40-70 | Pequenos Reparos"
                    },
                    {
                        name: "Instalação de Trinco ou Olho Mágico",
                        price: 36.00, // Median 40 * 0.9
                        keywords: "Duração: 20-30 min | Faixa: R$ 30-50 | Pequenos Reparos"
                    },
                    {
                        name: "Troca de Porta (Apenas a folha)",
                        price: 126.00, // Median 140 * 0.9
                        keywords: "Duração: 1h 30min - 2h | Faixa: R$ 100-180 | Pequenos Reparos"
                    },
                    {
                        name: "Instalação de Porta Completa (Kit porta pronta)",
                        price: 315.00, // Median 350 * 0.9
                        keywords: "Duração: 3h - 5h | Faixa: R$ 250-450 | Pequenos Reparos"
                    },
                    {
                        name: "Ajuste de Porta (Raspando no piso/marcenaria)",
                        price: 58.50, // Median 65 * 0.9
                        keywords: "Duração: 40 min | Faixa: R$ 50-80 | Pequenos Reparos"
                    },
                    {
                        name: "Reparo de Buraco em Alvenaria (Gesso ou Massa)",
                        price: 81.00, // Median 90 * 0.9
                        keywords: "Duração: 1h 00min | Faixa: R$ 60-120 | Pequenos Reparos"
                    },
                    {
                        name: "Troca de Telhas Quebradas (Pequeno trecho)",
                        price: 202.50, // Median 225 * 0.9
                        keywords: "Duração: 1h - 2h | Faixa: R$ 150-300 | Pequenos Reparos"
                    },
                    {
                        name: "Instalação de Prateleiras, Quadros ou Suportes",
                        price: 27.00, // Median 30 * 0.9
                        keywords: "Duração: 20 min | Faixa: R$ 20-40 (por unidade) | Pequenos Reparos"
                    },
                    {
                        name: "Instalação de Painel de TV (Até 55\")",
                        price: 103.50, // Median 115 * 0.9
                        keywords: "Duração: 1h 00min | Faixa: R$ 80-150 | Pequenos Reparos"
                    },

                    // 2. Categoria: Revestimento e Alvenaria (Obra Fina)
                    {
                        name: "Assentamento de Piso Cerâmico (Comum)",
                        price: 40.50, // Median 45 * 0.9
                        keywords: "Preço por m² | Faixa: R$ 35-55 | Revestimento"
                    },
                    {
                        name: "Assentamento de Porcelanato",
                        price: 63.00, // Median 70 * 0.9
                        keywords: "Preço por m² | Faixa: R$ 50-90 | Revestimento"
                    },
                    {
                        name: "Reboco de Parede (Acabamento liso)",
                        price: 31.50, // Median 35 * 0.9
                        keywords: "Preço por m² | Faixa: R$ 25-45 | Revestimento"
                    },
                    {
                        name: "Assentamento de Tijolo/Bloco (Levantamento)",
                        price: 36.00, // Median 40 * 0.9
                        keywords: "Preço por m² | Faixa: R$ 30-50 | Revestimento"
                    },
                    {
                        name: "Troca ou Instalação de Rodapé (Linear)",
                        price: 18.00, // Median 20 * 0.9
                        keywords: "Preço por metro | Faixa: R$ 15-25 | Revestimento"
                    },
                    {
                        name: "Rejunte de Piso (Limpeza e aplicação)",
                        price: 20.25, // Median 22.5 * 0.9
                        keywords: "Preço por m² | Faixa: R$ 15-30 | Revestimento"
                    },
                    {
                        name: "Instalação de Soleira ou Pingadeira",
                        price: 72.00, // Median 80 * 0.9
                        keywords: "Duração: 1h 00min | Faixa: R$ 60-100 | Revestimento"
                    },

                    // 3. Categoria: Hidráulica Básica (Reparo Rápido)
                    {
                        name: "Troca de Sifão, Torneira ou Engate",
                        price: 49.50, // Median 55 * 0.9
                        keywords: "Duração: 30 min | Faixa: R$ 40-70 | Hidráulica"
                    },
                    {
                        name: "Reparo de Vazamento em Vaso Sanitário (Descarga)",
                        price: 90.00, // Median 100 * 0.9
                        keywords: "Duração: 1h 00min | Faixa: R$ 70-130 | Hidráulica"
                    },
                    {
                        name: "Instalação de Chuveiro Elétrico",
                        price: 63.00, // Median 70 * 0.9
                        keywords: "Duração: 40 min | Faixa: R$ 50-90 | Hidráulica"
                    },
                    {
                        name: "Limpeza de Calhas",
                        price: 27.00, // Median 30 * 0.9
                        keywords: "Preço por metro linear | Faixa: R$ 20-40 | Hidráulica"
                    },
                    {
                        name: "Desentupimento Simples (Pia ou Ralo)",
                        price: 103.50, // Median 115 * 0.9
                        keywords: "Duração: 1h 00min | Faixa: R$ 80-150 | Hidráulica"
                    },
                    {
                        name: "Limpeza de Caixa d'Água (Até 1000L)",
                        price: 193.50, // Median 215 * 0.9
                        keywords: "Duração: 2h 00min | Faixa: R$ 150-280 | Hidráulica"
                    },

                    // 4. Categoria: Acabamentos Estruturais
                    {
                        name: "Reparo de Rachadura em Parede (Tratamento)",
                        price: 103.50, // Median 115 * 0.9
                        keywords: "Preço por metro | Duração: 1h 30min | Faixa: R$ 80-150 | Acabamentos"
                    },
                    {
                        name: "Impermeabilização de Rodapé contra Umidade",
                        price: 60.75, // Median 67.5 * 0.9
                        keywords: "Preço por metro | Duração: 1h 30min | Faixa: R$ 45-90 | Acabamentos"
                    },
                    {
                        name: "Pintura de Teto de Banheiro (Contra mofo)",
                        price: 103.50, // Median 115 * 0.9
                        keywords: "Duração: 1h 30min | Faixa: R$ 80-150 | Acabamentos"
                    },
                    {
                        name: "Nivelamento de Piso (Cimentado)",
                        price: 38.25, // Median 42.5 * 0.9
                        keywords: "Preço por m² | Duração: 2h - 4h | Faixa: R$ 30-55 | Acabamentos"
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
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE service_type = ?, keywords = ?`,
                [def.profession, def.service_type, def.keywords, def.service_type, def.keywords]
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
