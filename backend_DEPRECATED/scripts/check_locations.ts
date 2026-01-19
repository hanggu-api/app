
import pool from "../src/database/db";

async function checkLocations() {
  try {
    console.log("🔍 Consultando tabela provider_locations...");
    const [rows]: any = await pool.query("SELECT * FROM provider_locations ORDER BY updated_at DESC LIMIT 10");
    
    if (rows.length === 0) {
      console.log("⚠️ Nenhuma localização encontrada na tabela provider_locations.");
    } else {
      console.table(rows);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao consultar banco de dados:", error);
    process.exit(1);
  }
}

checkLocations();
