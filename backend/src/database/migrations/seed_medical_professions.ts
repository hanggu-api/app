import pool from "../db";
import logger from "../../utils/logger";

export async function run() {
    try {
        console.log("Seeding expanded medical professions...");
        
        const medicalProfessions = [
            // Especialidades Médicas (Existentes e Novas)
            "Alergista e Imunologista",
            "Anestesiologista",
            "Angiologista",
            "Cardiologista",
            "Cirurgião Cardiovascular",
            "Cirurgião Geral",
            "Cirurgião de Cabeça e Pescoço",
            "Cirurgião do Aparelho Digestivo",
            "Cirurgião Pediátrico",
            "Cirurgião Plástico",
            "Cirurgião Torácico",
            "Cirurgião Vascular",
            "Clínico Geral",
            "Coloproctologista",
            "Dermatologista",
            "Endocrinologista e Metabologista",
            "Endoscopista",
            "Gastroenterologista",
            "Geriatra",
            "Ginecologista e Obstetra",
            "Hematologista",
            "Hepatologista",
            "Homeopata",
            "Infectologista",
            "Mastologista",
            "Médico da Família",
            "Médico do Esporte",
            "Médico do Trabalho",
            "Nefrologista",
            "Neurocirurgião",
            "Neurologista",
            "Nutrólogo",
            "Oftalmologista",
            "Oncologista Clínico",
            "Ortopedista e Traumatologista",
            "Otorrinolaringologista",
            "Patologista",
            "Pediatra",
            "Pneumologista",
            "Psiquiatra",
            "Psiquiatra Infantil",
            "Radiologista",
            "Radioterapeuta",
            "Reumatologista",
            "Urologista",
            // Áreas de Reabilitação e Multidisciplinares (Comuns em Apps de Saúde)
            "Fisioterapeuta",
            "Fonoaudiólogo",
            "Nutricionista",
            "Psicólogo",
            "Terapeuta Ocupacional"
        ];

        for (const name of medicalProfessions) {
            await pool.query(
                `INSERT INTO professions (name, service_type, keywords) 
                 VALUES (?, 'medical', ?) 
                 ON DUPLICATE KEY UPDATE service_type = 'medical'`,
                [name, `médico,doutor,consulta,saúde,${name.toLowerCase().replace(/ /g, ",")}`]
            );
        }

        console.log(`Seeded ${medicalProfessions.length} medical professions.`);
    } catch (error) {
        console.error("Error seeding medical professions:", error);
    }
}