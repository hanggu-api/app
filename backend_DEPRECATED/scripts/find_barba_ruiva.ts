import pool from "../src/database/db";

async function findBarbaRuiva() {
    try {
        console.log("🔍 Procurando prestador 'barba ruiva' no MySQL...\n");

        // Search in providers table
        const [providers] = await pool.query<any[]>(
            `SELECT p.user_id, p.commercial_name, p.bio, p.rating_avg, p.rating_count,
              u.full_name, u.email, u.phone
       FROM providers p 
       LEFT JOIN users u ON p.user_id = u.id 
       WHERE LOWER(p.commercial_name) LIKE '%ruiva%' 
          OR LOWER(u.full_name) LIKE '%ruiva%'
          OR LOWER(p.commercial_name) LIKE '%barba%'
          OR LOWER(u.full_name) LIKE '%barba%'`
        );

        if (providers.length === 0) {
            console.log("❌ Nenhum prestador encontrado com 'barba' ou 'ruiva' no nome.\n");
            console.log("📋 Listando TODOS os prestadores cadastrados:\n");

            const [allProviders] = await pool.query<any[]>(
                `SELECT p.user_id, p.commercial_name, u.full_name, u.email, u.role
         FROM providers p 
         LEFT JOIN users u ON p.user_id = u.id 
         ORDER BY p.user_id DESC
         LIMIT 20`
            );

            if (allProviders.length === 0) {
                console.log("⚠️ Nenhum prestador cadastrado no sistema.");
            } else {
                allProviders.forEach((p: any) => {
                    console.log(`  User ID: ${p.user_id}`);
                    console.log(`  Nome: ${p.full_name || "N/A"}`);
                    console.log(`  Nome Comercial: ${p.commercial_name || "N/A"}`);
                    console.log(`  Email: ${p.email || "N/A"}`);
                    console.log(`  ---`);
                });
            }
        } else {
            console.log(`✅ Encontrados ${providers.length} prestador(es):\n`);

            providers.forEach((p: any, index: number) => {
                console.log(`${index + 1}. User ID: ${p.user_id}`);
                console.log(`   Nome: ${p.full_name || "N/A"}`);
                console.log(`   Nome Comercial: ${p.commercial_name || "N/A"}`);
                console.log(`   Email: ${p.email || "N/A"}`);
                console.log(`   Phone: ${p.phone || "N/A"}`);
                console.log(`   Rating: ${p.rating_avg} (${p.rating_count} avaliações)`);
                console.log(`   Bio: ${p.bio || "N/A"}`);
                console.log(`   ---`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error("❌ Erro:", error);
        process.exit(1);
    }
}

findBarbaRuiva();
