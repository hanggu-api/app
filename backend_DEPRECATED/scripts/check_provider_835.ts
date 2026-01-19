
import pool from "../src/database/db";

async function check() {
  try {
    const [rows]: any = await pool.query(`
      SELECT pp.profession_id, p.name 
      FROM provider_professions pp 
      JOIN professions p ON pp.profession_id = p.id 
      WHERE pp.provider_user_id = 835
    `);
    console.log("Profissões do usuário 835:", rows);
    
    const [user]: any = await pool.query(`SELECT * FROM users WHERE id = 835`);
    console.log("Usuário 835:", user[0]);

    const [provider]: any = await pool.query(`SELECT * FROM providers WHERE user_id = 835`);
    console.log("Dados Provider 835:", provider[0]);

  } catch (error) {
    console.error(error);
  } finally {
    process.exit();
  }
}

check();
