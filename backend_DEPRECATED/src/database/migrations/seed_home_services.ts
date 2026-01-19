import pool from "../db";

export async function run() {
    try {
        console.log("Seeding Home Services (Carpinteiro, Refrigeração, Chaveiro)...");

        const definitions = [
            {
                profession: "Carpinteiro",
                service_type: "construction",
                keywords: "madeira,moveis,portas,reforma,carpinteiro",
                services: [
                    {
                        name: "Instalação de Portas",
                        price: 90.00,
                        keywords: "Duração: 1h-2h | Instalação de porta interna ou externa"
                    },
                    {
                        name: "Montagem de Móveis",
                        price: 72.00,
                        keywords: "Duração: 1h | Montagem de guarda-roupa, armário, etc."
                    },
                    {
                        name: "Reparo de Telhado",
                        price: 135.00,
                        keywords: "Duração: 2h | Troca de telhas, eliminação de goteiras"
                    },
                    {
                        name: "Construção de Deck (m²)",
                        price: 180.00,
                        keywords: "Duração: 4h | Preço por m² estimado"
                    },
                    {
                        name: "Instalação de Rodapé",
                        price: 45.00,
                        keywords: "Duração: 1h | Instalação de rodapé de madeira ou poliestireno"
                    }
                ]
            },
            {
                profession: "Técnico de Refrigeração",
                service_type: "construction",
                keywords: "ar condicionado,refrigeração,climatização,split,manutenção",
                services: [
                    {
                        name: "Limpeza de Ar Condicionado (Split)",
                        price: 108.00,
                        keywords: "Duração: 1h | Higienização completa unidade interna e externa"
                    },
                    {
                        name: "Instalação de Ar Condicionado",
                        price: 315.00,
                        keywords: "Duração: 2h-3h | Instalação completa com suporte"
                    },
                    {
                        name: "Carga de Gás",
                        price: 135.00,
                        keywords: "Duração: 40min | Reposição de gás refrigerante"
                    },
                    {
                        name: "Manutenção Preventiva",
                        price: 90.00,
                        keywords: "Duração: 45min | Verificação geral e limpeza de filtros"
                    },
                    {
                        name: "Conserto de Geladeira",
                        price: 135.00,
                        keywords: "Duração: 1h | Diagnóstico e reparo (peças à parte)"
                    }
                ]
            },
            {
                profession: "Chaveiro",
                service_type: "construction",
                keywords: "chaves,fechadura,abertura,codificação,segurança",
                services: [
                    {
                        name: "Abertura de Porta Residencial",
                        price: 54.00,
                        keywords: "Duração: 20min | Sem troca de fechadura"
                    },
                    {
                        name: "Troca de Fechadura",
                        price: 63.00,
                        keywords: "Duração: 30min | Mão de obra (fechadura à parte ou inclusa se simples)"
                    },
                    {
                        name: "Cópia de Chave Simples",
                        price: 13.50,
                        keywords: "Duração: 10min | Preço por unidade"
                    },
                    {
                        name: "Abertura de Carro",
                        price: 108.00,
                        keywords: "Duração: 30min | Abertura técnica sem danos"
                    },
                    {
                        name: "Confecção de Chave Codificada",
                        price: 225.00,
                        keywords: "Duração: 1h | Chave automotiva com chip"
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
                     await pool.query(
                        `UPDATE task_catalog
                         SET unit_price = ?, keywords = ?, active = 1
                         WHERE id = ?`,
                        [service.price, service.keywords, existing[0].id]
                    );
                } else {
                    await pool.query(
                        `INSERT INTO task_catalog (profession_id, name, unit_price, keywords, pricing_type, active)
                         VALUES (?, ?, ?, ?, 'fixed', 1)`,
                        [professionId, service.name, service.price, service.keywords]
                    );
                }
            }
        }

        console.log("Seeding completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding home services:", error);
        process.exit(1);
    }
}

run();
