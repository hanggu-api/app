
import pool from '../src/database/db';

(async () => {
  try {
    const [cols]: any = await pool.query("DESCRIBE provider_locations");
    console.table(cols);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
})();
