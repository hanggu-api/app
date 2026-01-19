
import pool from "../src/database/db";

async function checkRefrigerationProviders() {
    try {
        const professionId = 3744; // Técnico de Refrigeração
        console.log(`Checking providers for profession ID: ${professionId}`);

        // 1. Find users with this profession
        // provider_professions uses 'provider_user_id', NOT 'user_id'
        // providers table has 'is_online', 'latitude', 'longitude'
        const [providers]: any = await pool.query(`
            SELECT 
                u.id, 
                u.full_name, 
                u.email, 
                p.is_online,
                p.latitude,
                p.longitude,
                pp.profession_id
            FROM users u
            JOIN provider_professions pp ON u.id = pp.provider_user_id
            JOIN providers p ON u.id = p.user_id
            WHERE pp.profession_id = ?
        `, [professionId]);

        console.log(`Found ${providers.length} providers with this profession.`);

        for (const p of providers) {
            console.log("---------------------------------------------------");
            console.log(`Provider: ${p.full_name} (ID: ${p.id})`);
            console.log(`Email: ${p.email}`);
            console.log(`Online: ${p.is_online ? 'YES' : 'NO'}`);
            console.log(`Location: ${p.latitude}, ${p.longitude}`);
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkRefrigerationProviders();
