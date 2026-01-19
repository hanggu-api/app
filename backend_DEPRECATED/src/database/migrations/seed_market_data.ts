import pool from "../db";

export async function run() {
    try {
        console.log("🚀 Seeding Market Expansion Data (Mecânico, TI, Personal, etc.)...");

        const definitions = [
            {
                profession: "Mecânico",
                service_type: "on_site",
                keywords: "carro,motor,freio,suspensão,óleo,bateria,alinhamento,mecânica",
                services: [
                    { name: "Troca de Óleo e Filtro", price: 180.00, keywords: "Duração: 40min | Incluindo filtro simples" },
                    { name: "Revisão de Freios (Mão de obra)", price: 150.00, keywords: "Duração: 1h 30min | Verificação de pastilhas e discos" },
                    { name: "Troca de Bateria", price: 45.00, keywords: "Duração: 20min | Apenas instalação" },
                    { name: "Diagnóstico Computadorizado", price: 120.00, keywords: "Duração: 30min | Scanner de erros" },
                    { name: "Reparo de Suspensão (Lado)", price: 200.00, keywords: "Duração: 2h | Troca de amortecedor ou buchas" }
                ]
            },
            {
                profession: "Borracheiro",
                service_type: "on_site",
                keywords: "pneu,roda,estepe,furado,remendo,vulcanização,balanceamento",
                services: [
                    { name: "Remendo de Pneu (Simples)", price: 30.00, keywords: "Duração: 15min | Macarrão ou frio" },
                    { name: "Balanceamento (Roda)", price: 25.00, keywords: "Duração: 10min | Preço por roda" },
                    { name: "Vulcanização", price: 80.00, keywords: "Duração: 2h | Reparo em corte lateral" },
                    { name: "Troca de Estepe", price: 40.00, keywords: "Duração: 15min | Atendimento local" }
                ]
            },
            {
                profession: "Técnico de Informática",
                service_type: "on_site",
                keywords: "notebook,computador,windows,formatação,wi-fi,impressora,software,ti",
                services: [
                    { name: "Formatação com Backup", price: 150.00, keywords: "Duração: 3h | Windows + Drivers + Programas" },
                    { name: "Limpeza Interna e Pasta Térmica", price: 120.00, keywords: "Duração: 1h 30min | Notebook ou Desktop" },
                    { name: "Configuração de Roteador Wi-Fi", price: 80.00, keywords: "Duração: 30min | Configuração de rede e senha" },
                    { name: "Remoção de Vírus/Malware", price: 100.00, keywords: "Duração: 1h | Otimização de sistema" },
                    { name: "Troca de Tela de Notebook", price: 180.00, keywords: "Duração: 1h | Mão de obra (peça à parte)" }
                ]
            },
            {
                profession: "Personal Trainer",
                service_type: "on_site",
                keywords: "academia,treino,fitness,saúde,emagrecimento,musculação,dieta,personal",
                services: [
                    { name: "Consultoria Mensal (Online)", price: 250.00, keywords: "Treino + Suporte via app" },
                    { name: "Aula Particular (Sessão)", price: 90.00, keywords: "Duração: 1h | Presencial ou outdoor" },
                    { name: "Avaliação Física Completa", price: 120.00, keywords: "Duração: 45min | Bioimpedância + Medas" }
                ]
            },
            {
                profession: "Maquiadora",
                service_type: "at_provider",
                keywords: "maquiagem,makeup,festa,noiva,social,beleza,makeup artist",
                services: [
                    { name: "Maquiagem Social", price: 180.00, keywords: "Duração: 1h | Com cílios inclusos" },
                    { name: "Maquiagem de Noiva", price: 500.00, keywords: "Duração: 2h 30min | Inclui teste prévio" },
                    { name: "Design de Sobrancelha (Pinça)", price: 45.00, keywords: "Duração: 30min | Limpeza e desenho" },
                    { name: "Curso de Automaquiagem", price: 300.00, keywords: "Duração: 4h | Individual" }
                ]
            },
            {
                profession: "Pet Shop",
                service_type: "at_provider",
                keywords: "cachorro,gato,banho,tosa,pet,animal,adestramento,veterinário",
                services: [
                    { name: "Banho e Tosa (Porte P)", price: 90.00, keywords: "Duração: 1h 30min | Inclui corte de unha" },
                    { name: "Tosa Higiênica", price: 50.00, keywords: "Duração: 40min | Apenas áreas críticas" },
                    { name: "Adestramento (Aula)", price: 120.00, keywords: "Duração: 1h | Com comportamento básico" },
                    { name: "Hospedagem Pet (Diária)", price: 80.00, keywords: "Preço por dia/animal" }
                ]
            },
            {
                profession: "Fretes e Mudanças",
                service_type: "on_site",
                keywords: "mudança,carreto,transporte,caminhão,frete,entrega",
                services: [
                    { name: "Carreto Simples (Até 5km)", price: 150.00, keywords: "Duração: 1h | Apenas motorista (sem ajudante)" },
                    { name: "Mudança Residencial Completa", price: 800.00, keywords: "Estimativa inicial | Caminhão + 2 ajudantes" },
                    { name: "Transporte de Eletrodoméstico", price: 120.00, keywords: "Geladeira, fogão ou máquina de lavar" }
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

            // 2. Insert Services into task_catalog
            for (const service of def.services) {
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

        console.log("✅ Market Expansion Seeding completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding market data:", error);
        process.exit(1);
    }
}

run();
