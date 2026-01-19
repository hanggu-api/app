
import pool from '../database/db';

async function checkProvider() {
    try {
        const providerId = 835;
        console.log(`Checking provider ${providerId}...`);

        // Check user
        const [users]: any = await pool.query('SELECT id, full_name, role FROM users WHERE id = ?', [providerId]);
        console.log('User:', users[0]);

        // Check provider table
        const [providers]: any = await pool.query('SELECT * FROM providers WHERE user_id = ?', [providerId]);
        console.log('Provider Table:', providers[0]);

        // Check professions
        const [profs]: any = await pool.query(`
            SELECT pp.*, p.name as profession_name, c.name as category_name, c.id as category_id
            FROM provider_professions pp
            JOIN professions p ON pp.profession_id = p.id
            JOIN service_categories c ON p.category_id = c.id
            WHERE pp.provider_user_id = ?
        `, [providerId]);
        
        console.log('Provider Professions:', profs);

        // Check all professions
        const [allProfs]: any = await pool.query('SELECT * FROM professions WHERE name LIKE "%Chaveiro%"');
        console.log('All "Chaveiro" professions:', allProfs);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkProvider();
