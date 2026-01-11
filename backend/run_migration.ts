
import { run } from "./src/database/migrations/add_service_type_to_professions";
import pool from "./src/database/db";

async function main() {
    await run();
    await pool.closePool();
}

main();
