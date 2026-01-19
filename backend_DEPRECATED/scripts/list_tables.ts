
import pool from '../src/database/db';

(async () => {
    try {
        const [tables]: any = await pool.query("SHOW TABLES");
        console.table(tables);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
})();
