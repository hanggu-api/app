
import pool from "../src/database/db";

const KEEP_PROFESSIONS = [
    // Construction / Home Services (The 3-step flow group)
    { name: "Pedreiro", type: "construction", keywords: "construção,reforma,obras,pedreiro,alvenaria,telhadista,azulejista,mestre de obras" },
    { name: "Eletricista", type: "construction", keywords: "elétrica,fiação,tomada,disjuntor,chuveiro,luz,instalação elétrica" },
    { name: "Encanador", type: "construction", keywords: "hidráulica,cano,vazamento,torneira,caixa d'água,esgoto,bombeiro hidráulico" },
    { name: "Pintor", type: "construction", keywords: "pintura,parede,tinta,acabamento,textura,massa corrida" },
    { name: "Carpinteiro", type: "construction", keywords: "madeira,móveis,portas,reforma,carpinteiro,montador de móveis,marceneiro,deck" },
    { name: "Chaveiro", type: "construction", keywords: "chaves,fechadura,abertura,codificação,segurança,cadeado,chaveiro 24h" },
    { name: "Técnico de Refrigeração", type: "construction", keywords: "ar condicionado,refrigeração,climatização,split,manutenção,instalação de ar,geladeira,freezer" },
    { name: "Vidraceiro", type: "construction", keywords: "vidro,janela,box,espelho,cortina de vidro,fechamento de varanda" },
    { name: "Serralheiro", type: "construction", keywords: "ferro,portão,grade,solda,estrutura metálica,alumínio" },
    { name: "Gesseiro", type: "construction", keywords: "gesso,sanca,divisória,forro,drywall,moldura" },
    { name: "Jardinagem", type: "construction", keywords: "jardim,grama,poda,plantas,paisagismo,corte de grama" },
    
    // Cleaning
    { name: "Diarista", type: "standard", keywords: "limpeza,faxina,casa,organização,passar roupa,cozinhar" },

    // Beauty
    { name: "Barbeiro", type: "salon", keywords: "cabelo,barba,bigode,corte masculino,degradê" },
    { name: "Cabeleireiro", type: "salon", keywords: "cabelo,corte,pintura,mechas,escova,progressiva,cabelereira" },
    { name: "Manicure", type: "salon", keywords: "unha,pé,mão,esmalte,alongamento,gel,fibras" },
    { name: "Esteticista", type: "salon", keywords: "pele,limpeza de pele,massagem,drenagem,depilação,sobrancelha" },
    { name: "Maquiadora", type: "salon", keywords: "maquiagem,make,noiva,festa,produção" },

    // Medical
    { name: "Médico", type: "medical", keywords: "saúde,consulta,doença,exame,clínico geral,pediatra,cardiologista" },
    { name: "Psicólogo", type: "medical", keywords: "terapia,saúde mental,ansiedade,depressão,acompanhamento" },
    { name: "Fisioterapeuta", type: "medical", keywords: "fisioterapia,reabilitação,massagem,dor,coluna,pilates" },
    { name: "Nutricionista", type: "medical", keywords: "dieta,alimentação,saúde,emagrecimento,nutrição" },
    { name: "Dentista", type: "medical", keywords: "dente,odontologia,boca,clareamento,aparelho,canal,extração" },
    { name: "Enfermeiro", type: "medical", keywords: "enfermagem,cuidados,curativo,injeção,home care,idosos" }
];

async function simplifyProfessions() {
    console.log("Starting Profession Simplification...");
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Get IDs of professions to KEEP
        // We will insert/update them first to ensure they exist and get their IDs.
        const keepIds: number[] = [];

        for (const p of KEEP_PROFESSIONS) {
            console.log(`Processing: ${p.name}`);
            
            // Upsert (Insert or Update)
            await connection.query(
                `INSERT INTO professions (name, service_type, keywords) 
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE 
                 service_type = VALUES(service_type), 
                 keywords = VALUES(keywords)`,
                [p.name, p.type, p.keywords]
            );

            const [rows]: any = await connection.query("SELECT id FROM professions WHERE name = ?", [p.name]);
            if (rows.length > 0) {
                keepIds.push(rows[0].id);
            }
        }

        console.log(`Kept IDs: ${keepIds.length}`);

        if (keepIds.length > 0) {
            // 2. Delete professions NOT in the keep list
            // Note: We need to handle foreign key constraints if any. 
            // Assuming cascading or we might need to update references.
            // For now, let's try deleting.
            
            // First, delete services (task_catalog) for professions we are removing
            await connection.query(
                `DELETE FROM task_catalog WHERE profession_id NOT IN (${keepIds.join(',')})`
            );

            // Delete provider_professions for removed professions
            await connection.query(
                `DELETE FROM provider_professions WHERE profession_id NOT IN (${keepIds.join(',')})`
            );
            
             // Delete ai_training_examples for removed professions
             await connection.query(
                `DELETE FROM ai_training_examples WHERE profession_id NOT IN (${keepIds.join(',')})`
            );

            // Finally, delete the professions
            const [delRes]: any = await connection.query(
                `DELETE FROM professions WHERE id NOT IN (${keepIds.join(',')})`
            );

            console.log(`Deleted ${delRes.affectedRows} redundant professions.`);
        }

        await connection.commit();
        console.log("Simplification Complete!");
        process.exit(0);

    } catch (error) {
        await connection.rollback();
        console.error("Error simplifying professions:", error);
        process.exit(1);
    } finally {
        connection.release();
    }
}

simplifyProfessions();
