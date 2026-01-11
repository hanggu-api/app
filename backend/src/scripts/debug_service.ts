
import pool from "../database/db";
import logger from "../utils/logger";

async function run() {
  try {
    console.log("--- Categories ---");
    const [cats]: any = await pool.query("SELECT id, name, icon_slug FROM service_categories");
    console.table(cats);

    console.log("\n--- Professions ---");
    const [profs]: any = await pool.query("SELECT id, name, category_id FROM professions");
    console.table(profs);

    console.log("\n--- Last 5 Service Requests ---");
    const [services]: any = await pool.query(`
      SELECT s.id, s.description, s.category_id, s.profession, s.status, s.client_id, s.provider_id
      FROM service_requests s
      ORDER BY s.created_at DESC
      LIMIT 5
    `);
    console.table(services);

    if (services.length > 0) {
      const lastService = services[0];
      console.log(`\nChecking dispatch for Service ${lastService.id}...`);
      const [dispatch]: any = await pool.query("SELECT * FROM service_dispatches WHERE service_id = ?", [lastService.id]);
      console.log(dispatch);
    }

    console.log("\n--- Provider 'Chaveiro Silva' (search by name) ---");
    const [providers]: any = await pool.query("SELECT id, full_name, email FROM users WHERE full_name LIKE '%Silva%' OR full_name LIKE '%Chaveiro%'");
    console.table(providers);

    if (providers.length > 0) {
      for (const p of providers) {
        console.log(`\nProfessions for Provider ${p.full_name} (${p.id}):`);
        const [pp]: any = await pool.query(`
          SELECT pp.profession_id, pr.name, pr.category_id
          FROM provider_professions pp
          JOIN professions pr ON pp.profession_id = pr.id
          WHERE pp.provider_user_id = ?
        `, [p.id]);
        console.table(pp);
      }
    }

  } catch (error) {
    console.error(error);
  } finally {
    process.exit();
  }
}

run();
