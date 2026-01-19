
import pool from "../src/database/db";

async function seedMissingConstruction() {
    try {
        console.log("Seeding Missing Construction Services...");

        const definitions = [
            {
                profession: "Eletricista",
                service_type: "construction",
                keywords: "elétrica,fiação,tomada,disjuntor,chuveiro,luz,instalação elétrica",
                services: [
                    { name: "Troca de Chuveiro", price: 81.00, keywords: "Duração: 40min | Instalação elétrica de chuveiro" }, // Median 90 * 0.9
                    { name: "Instalação de Tomada/Interruptor", price: 31.50, keywords: "Duração: 20min | Preço por ponto" }, // Median 35 * 0.9
                    { name: "Troca de Disjuntor", price: 54.00, keywords: "Duração: 30min | Substituição no quadro" }, // Median 60 * 0.9
                    { name: "Instalação de Luminária/Lustre", price: 63.00, keywords: "Duração: 45min | Montagem e instalação" }, // Median 70 * 0.9
                    { name: "Visita Técnica (Curto-circuito)", price: 90.00, keywords: "Duração: 1h | Diagnóstico de falha elétrica" }, // Median 100 * 0.9
                    { name: "Instalação de Ventilador de Teto", price: 108.00, keywords: "Duração: 1h 30min | Montagem e fixação" } // Median 120 * 0.9
                ]
            },
            {
                profession: "Encanador",
                service_type: "construction",
                keywords: "hidráulica,cano,vazamento,torneira,caixa d'água,esgoto,bombeiro hidráulico",
                services: [
                    { name: "Troca de Torneira/Misturador", price: 45.00, keywords: "Duração: 30min | Troca simples" }, // Median 50 * 0.9
                    { name: "Conserto de Vazamento (Simples)", price: 90.00, keywords: "Duração: 1h | Cano exposto ou fácil acesso" }, // Median 100 * 0.9
                    { name: "Desentupimento de Pia/Ralo", price: 108.00, keywords: "Duração: 1h | Desobstrução mecânica" }, // Median 120 * 0.9
                    { name: "Instalação de Vaso Sanitário", price: 135.00, keywords: "Duração: 1h 30min | Com vedação" }, // Median 150 * 0.9
                    { name: "Limpeza de Caixa d'Água (até 1000L)", price: 162.00, keywords: "Duração: 2h | Higienização completa" } // Median 180 * 0.9
                ]
            },
            {
                profession: "Pintor",
                service_type: "construction",
                keywords: "pintura,parede,tinta,acabamento,textura,massa corrida",
                services: [
                    { name: "Pintura Parede Lisa (m²)", price: 18.00, keywords: "Preço por m² | Mão de obra (tinta à parte)" }, // Median 20 * 0.9
                    { name: "Pintura de Porta", price: 72.00, keywords: "Duração: 2h | Lixamento e pintura" }, // Median 80 * 0.9
                    { name: "Aplicação de Massa Corrida (m²)", price: 22.50, keywords: "Preço por m² | Preparação de parede" }, // Median 25 * 0.9
                    { name: "Pintura de Teto (m²)", price: 22.50, keywords: "Preço por m² | Tinta látex/acrílica" } // Median 25 * 0.9
                ]
            },
            {
                profession: "Jardinagem",
                service_type: "construction",
                keywords: "jardim,grama,poda,plantas,paisagismo,corte de grama",
                services: [
                    { name: "Corte de Grama (até 50m²)", price: 63.00, keywords: "Duração: 1h | Roçagem e limpeza" }, // Median 70 * 0.9
                    { name: "Poda de Árvore/Arbusto (Pequeno)", price: 45.00, keywords: "Duração: 45min | Por unidade" }, // Median 50 * 0.9
                    { name: "Limpeza de Jardim (Diária)", price: 180.00, keywords: "Duração: 6h | Manutenção geral" }, // Median 200 * 0.9
                    { name: "Plantio de Mudas", price: 27.00, keywords: "Duração: 20min | Por muda (mão de obra)" } // Median 30 * 0.9
                ]
            },
            {
                profession: "Vidraceiro",
                service_type: "construction",
                keywords: "vidro,janela,box,espelho,cortina de vidro,fechamento de varanda",
                services: [
                    { name: "Troca de Vidro Janela (Comum)", price: 72.00, keywords: "Duração: 1h | Mão de obra (vidro à parte)" }, // Median 80 * 0.9
                    { name: "Manutenção de Box", price: 90.00, keywords: "Duração: 1h | Regulagem e vedação" }, // Median 100 * 0.9
                    { name: "Instalação de Espelho (Pequeno)", price: 54.00, keywords: "Duração: 40min | Fixação na parede" } // Median 60 * 0.9
                ]
            },
            {
                profession: "Serralheiro",
                service_type: "construction",
                keywords: "ferro,portão,grade,solda,estrutura metálica,alumínio",
                services: [
                    { name: "Solda em Portão/Grade", price: 90.00, keywords: "Duração: 1h | Reparo com solda elétrica" }, // Median 100 * 0.9
                    { name: "Troca de Roldana de Portão", price: 63.00, keywords: "Duração: 1h | Mão de obra" }, // Median 70 * 0.9
                    { name: "Instalação de Fechadura de Portão", price: 72.00, keywords: "Duração: 1h | Solda e fixação" } // Median 80 * 0.9
                ]
            },
            {
                profession: "Gesseiro",
                service_type: "construction",
                keywords: "gesso,sanca,divisória,forro,drywall,moldura",
                services: [
                    { name: "Reparo em Forro de Gesso (Buraco)", price: 81.00, keywords: "Duração: 1h | Fechamento e acabamento" }, // Median 90 * 0.9
                    { name: "Parede Drywall (m²)", price: 45.00, keywords: "Preço por m² | Instalação completa (mão de obra)" }, // Median 50 * 0.9
                    { name: "Instalação de Moldura (metro)", price: 13.50, keywords: "Preço por metro linear" } // Median 15 * 0.9
                ]
            },
            {
                profession: "Diarista", // Adding Diarista here as Standard but with tasks if they want to use the flow? 
                // Wait, Diarista is "Standard" in my list, usually hourly. 
                // But for consistency let's give some task options or keep it open.
                // If service_type is 'standard', step 3 (select services) might be skipped or different in the app.
                // Let's check register_screen.dart again.
                // 'standard' or 'construction' triggers step 3 if I added it?
                // In register_screen.dart: if (type == 'salon' || type == 'standard' || type == 'construction') -> Add SelectServicesStep.
                // So YES, Standard also uses SelectServicesStep.
                service_type: "standard", 
                keywords: "limpeza,faxina,casa,organização,passar roupa,cozinhar",
                services: [
                    { name: "Faxina Completa (Diária)", price: 162.00, keywords: "Duração: 8h | Limpeza pesada" }, // Median 180 * 0.9
                    { name: "Faxina Meio Período", price: 99.00, keywords: "Duração: 4h | Limpeza de manutenção" }, // Median 110 * 0.9
                    { name: "Passar Roupa (Cesto)", price: 72.00, keywords: "Duração: 3h | Até 30 peças" } // Median 80 * 0.9
                ]
            }
        ];

        for (const def of definitions) {
            console.log(`Seeding ${def.profession}...`);
            
            // 1. Ensure Profession Exists (Should be there from simplify script, but good to ensure)
            await pool.query(
                `INSERT INTO professions (name, service_type, keywords)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                 service_type = VALUES(service_type),
                 keywords = VALUES(keywords)`,
                [def.profession, def.service_type, def.keywords]
            );

            // Get ID
            const [rows]: any = await pool.query("SELECT id FROM professions WHERE name = ?", [def.profession]);
            const professionId = rows[0].id;

            // 2. Insert Services
            for (const service of def.services) {
                await pool.query(
                    `INSERT INTO task_catalog (profession_id, name, unit_price, keywords, pricing_type, active)
                     VALUES (?, ?, ?, ?, 'fixed', 1)
                     ON DUPLICATE KEY UPDATE
                     unit_price = VALUES(unit_price),
                     keywords = VALUES(keywords),
                     active = 1`,
                    [professionId, service.name, service.price, service.keywords]
                );
            }
        }

        console.log("Seeding Complete!");
        process.exit(0);

    } catch (error) {
        console.error("Error seeding missing construction:", error);
        process.exit(1);
    }
}

seedMissingConstruction();
