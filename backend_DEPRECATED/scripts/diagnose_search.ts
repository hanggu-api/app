
import pool from "../src/database/db";
import { getNearbyProviders } from "../src/services/locationService";

async function diagnoseProviderSearch() {
  const providerId = 528;
  const serviceLat = -23.550520;
  const serviceLng = -46.633309;
  const professionName = "Pedreiro";

  console.log("🔍 Iniciando diagnóstico de busca de prestador...");

  try {
    // 1. Verificar Profissão
    console.log(`\n1️⃣ Verificando se profissão '${professionName}' existe...`);
    const [profRows]: any = await pool.query("SELECT * FROM professions WHERE name = ?", [professionName]);
    if (profRows.length === 0) {
      console.error("❌ Profissão não encontrada!");
      process.exit(1);
    }
    const professionId = profRows[0].id;
    console.log(`✅ Profissão encontrada: ID ${professionId}`);

    // 2. Verificar se Prestador tem a Profissão
    console.log(`\n2️⃣ Verificando se Prestador ${providerId} tem a profissão...`);
    const [ppRows]: any = await pool.query(
      "SELECT * FROM provider_professions WHERE provider_user_id = ? AND profession_id = ?",
      [providerId, professionId]
    );
    if (ppRows.length === 0) {
      console.error(`❌ Prestador ${providerId} NÃO tem a profissão ID ${professionId}.`);
      
      // Listar profissões do prestador
      const [allProfs]: any = await pool.query(
        "SELECT pp.*, p.name FROM provider_professions pp JOIN professions p ON pp.profession_id = p.id WHERE pp.provider_user_id = ?",
        [providerId]
      );
      console.log("📋 Profissões atuais do prestador:", allProfs);

      // Correção Automática (Opcional para teste)
      console.log("🛠️ Adicionando profissão para teste...");
      await pool.query("INSERT INTO provider_professions (provider_user_id, profession_id) VALUES (?, ?)", [providerId, professionId]);
      console.log("✅ Profissão adicionada.");
    } else {
      console.log("✅ Prestador possui a profissão.");
    }

    // 3. Verificar Proximidade (Geo Search)
    console.log(`\n3️⃣ Testando busca geoespacial (Haversine)...`);
    const nearbyIds = await getNearbyProviders(serviceLat, serviceLng, 50); // 50km
    console.log(`📍 Prestadores próximos encontrados: ${JSON.stringify(nearbyIds)}`);

    if (!nearbyIds.includes(String(providerId))) {
      console.error(`❌ Prestador ${providerId} NÃO apareceu na busca geoespacial.`);
      
      // Verificar dados brutos na tabela provider_locations
      const [locRows]: any = await pool.query("SELECT * FROM provider_locations WHERE provider_id = ?", [providerId]);
      console.log("📍 Dados na tabela provider_locations:", locRows);
    } else {
      console.log("✅ Prestador encontrado na busca geoespacial.");
    }

    // 4. Simular Query Final
    console.log(`\n4️⃣ Simulando Query Final de Filtro...`);
    const query = `
      SELECT DISTINCT pp.provider_user_id
      FROM provider_professions pp
      JOIN professions p ON pp.profession_id = p.id
      WHERE pp.provider_user_id IN (?)
      AND pp.profession_id = ?
    `;
    // Force array with providerId just to test the query logic if nearby was empty
    const testIds = nearbyIds.length > 0 ? nearbyIds : [String(providerId)];
    
    const [finalRows]: any = await pool.query(query, [testIds, professionId]);
    console.log(`🏁 Resultado Final da Query:`, finalRows);

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro fatal:", error);
    process.exit(1);
  }
}

diagnoseProviderSearch();
