import pool from "../db";

export async function run() {
    try {
        console.log("Seeding Gesseiro Services...");

        const definitions = [
            {
                profession: "Gesseiro",
                service_type: "construction",
                keywords: "gesso,drywall,sanca,forro,moldura,parede,reforma",
                services: [
                    // Existing (Updated prices/keywords if needed)
                    {
                        name: "Instalação de Moldura (metro)",
                        price: 13.50,
                        keywords: "Duração: 30min/m | Instalação de molduras de gesso no teto"
                    },
                    {
                        name: "Parede Drywall (m²)",
                        price: 45.00,
                        keywords: "Duração: 1h/m² | Construção de parede divisória em drywall"
                    },
                    {
                        name: "Reparo em Forro de Gesso (Buraco)",
                        price: 81.00,
                        keywords: "Duração: 1h | Fechamento de buracos e acabamento"
                    },
                    // New Services
                    {
                        name: "Instalação de Sanca Aberta (m)",
                        price: 45.00,
                        keywords: "Duração: 1h/m | Sanca com iluminação indireta"
                    },
                    {
                        name: "Instalação de Sanca Fechada (m)",
                        price: 36.00,
                        keywords: "Duração: 45min/m | Sanca rebaixada simples"
                    },
                    {
                        name: "Forro de Gesso Acartonado (m²)",
                        price: 54.00,
                        keywords: "Duração: 1h/m² | Forro liso estruturado"
                    },
                    {
                        name: "Forro de Gesso Plaquinha (m²)",
                        price: 36.00,
                        keywords: "Duração: 45min/m² | Forro tradicional de placas 60x60"
                    },
                    {
                        name: "Divisória de Drywall com Porta (m²)",
                        price: 90.00,
                        keywords: "Duração: 2h/m² | Parede com requadro para porta"
                    },
                    {
                        name: "Aplicação de Gesso 3D (m²)",
                        price: 45.00,
                        keywords: "Duração: 1h/m² | Instalação de placas decorativas 3D"
                    },
                    {
                        name: "Instalação de Cortineiro (m)",
                        price: 27.00,
                        keywords: "Duração: 30min/m | Acabamento em gesso para cortinas"
                    },
                    {
                        name: "Closet de Gesso (unidade)",
                        price: 450.00,
                        keywords: "Duração: 4h-8h | Estrutura básica para closet (prateleiras)"
                    },
                    {
                        name: "Estante ou Nicho de Gesso (unidade)",
                        price: 180.00,
                        keywords: "Duração: 2h-4h | Nichos decorativos ou funcionais"
                    }
                ]
            }
        ];

        for (const def of definitions) {
            console.log(`Processing profession '${def.profession}'...`);

            // 1. Create/Update Profession
            await pool.query(
                `INSERT INTO professions (name, service_type, keywords)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                   service_type = VALUES(service_type),
                   keywords = VALUES(keywords)`,
                [def.profession, def.service_type, def.keywords]
            );

            // Get ID
            const [rows]: any = await pool.query(
                "SELECT id FROM professions WHERE name = ?",
                [def.profession]
            );
            const professionId = rows[0].id;

            console.log(`Profession ID for ${def.profession}: ${professionId}`);

            // 2. Insert Services into task_catalog
            for (const service of def.services) {
                // Check if exists
                const [existing]: any = await pool.query(
                    "SELECT id FROM task_catalog WHERE profession_id = ? AND name = ?",
                    [professionId, service.name]
                );

                if (existing.length > 0) {
                    console.log(`Updating service: ${service.name}`);
                    await pool.query(
                        `UPDATE task_catalog
                         SET unit_price = ?, keywords = ?, active = 1
                         WHERE id = ?`,
                        [service.price, service.keywords, existing[0].id]
                    );
                } else {
                    console.log(`Creating service: ${service.name}`);
                    await pool.query(
                        `INSERT INTO task_catalog (profession_id, name, unit_price, keywords, pricing_type, active)
                         VALUES (?, ?, ?, ?, 'fixed', 1)`,
                        [professionId, service.name, service.price, service.keywords]
                    );
                }
            }
        }

        console.log("Seeding Gesseiro services completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding Gesseiro services:", error);
        process.exit(1);
    }
}

run();
