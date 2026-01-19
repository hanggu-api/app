import db from './src/database/db';

async function checkConfig() {
    const providerId = 832; // barba ruiva
    try {
        const [configs]: any = await db.query(
            'SELECT * FROM provider_schedule_configs WHERE provider_id = ?',
            [providerId]
        );
        console.log('Configs:', JSON.stringify(configs, null, 2));

        const [exceptions]: any = await db.query(
            'SELECT * FROM provider_schedule_exceptions WHERE provider_id = ?',
            [providerId]
        );
        console.log('Exceptions:', JSON.stringify(exceptions, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await db.closePool();
    }
}

checkConfig();
