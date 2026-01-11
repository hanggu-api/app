
import pool from '../database/db';

async function checkService() {
    try {
        const serviceId = 'be104676-bb31-46ab-859f-718788bc743c'; // ID from previous step
        
        console.log(`Checking service ${serviceId}...`);
        const [rows]: any = await pool.query('SELECT * FROM service_requests WHERE id = ?', [serviceId]);
        console.log('Service Status:', rows[0]?.status);
        console.log('Service Created:', rows[0]?.created_at);

        const [dispatches]: any = await pool.query('SELECT * FROM service_dispatches WHERE service_id = ?', [serviceId]);
        console.log('Dispatch Record:', dispatches[0]);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkService();
