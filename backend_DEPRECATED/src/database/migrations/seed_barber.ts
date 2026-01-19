
import pool from "../db";

export async function run() {
    try {
        console.log("Seeding barber professions...");
        
        const professions = [
            {
                name: "Barbeiro Masculino",
                type: "salon",
                keywords: "barba, cabelo, corte, masculino, bigode, degradê, navalha"
            },
            {
                name: "Barbeiro",
                type: "salon",
                keywords: "barba, cabelo, corte, masculino, bigode, degradê, navalha, barbearia"
            }
        ];

        for (const prof of professions) {
            await pool.query(
                `INSERT INTO professions (name, service_type, keywords, popularity_score) 
                 VALUES (?, ?, ?, 80) 
                 ON DUPLICATE KEY UPDATE service_type = VALUES(service_type), keywords = VALUES(keywords)`,
                [prof.name, prof.type, prof.keywords]
            );
        }

        console.log(`Seeded ${professions.length} barber professions.`);
        process.exit(0);
    } catch (error) {
        console.error("Error seeding barber professions:", error);
        process.exit(1);
    }
}

run();
