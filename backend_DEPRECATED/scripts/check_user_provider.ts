
import pool from "../src/database/db";

async function checkUserProvider(userId: number) {
  try {
    console.log(`🔍 Verificando usuário ${userId}...`);
    
    // Check users table
    const [users]: any = await pool.query("SELECT * FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
      console.log("❌ Usuário não encontrado na tabela 'users'.");
    } else {
      console.log("✅ Usuário encontrado:", users[0]);
    }

    // Check providers table
    const [providers]: any = await pool.query("SELECT * FROM providers WHERE user_id = ?", [userId]);
    if (providers.length === 0) {
      console.log("❌ Usuário NÃO encontrado na tabela 'providers'.");
      
      // Create provider record if missing (for testing)
      console.log("🛠️ Criando registro fake na tabela 'providers' para teste...");
      await pool.query("INSERT INTO providers (user_id, bio, is_online) VALUES (?, 'Fake Provider', true)", [userId]);
      console.log("✅ Registro de provedor criado com sucesso!");
    } else {
      console.log("✅ Usuário é um prestador:", providers[0]);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
}

const userId = 528;
checkUserProvider(userId);
