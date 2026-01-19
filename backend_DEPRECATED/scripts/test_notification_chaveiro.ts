
import pool from '../src/database/db';
import { providerDispatcher } from '../src/services/providerDispatcher';

async function simulate() {
  try {
    console.log("🚀 Iniciando Simulação de Pedido de Chaveiro...");

    // 1. Buscar um cliente qualquer para ser o autor
    const [clients]: any = await pool.query(`SELECT id, email FROM users WHERE role = 'client' LIMIT 1`);
    if (clients.length === 0) {
      console.error("❌ Nenhum cliente encontrado no banco.");
      return;
    }
    const client = clients[0];
    console.log(`👤 Cliente simulado: ${client.email} (ID: ${client.id})`);

    // 2. Criar o Serviço (Simulando fluxo pós-pagamento)
    // Usando localização de Imperatriz, MA (baseado nos logs anteriores do usuário)
    const lat = -5.51574760;
    const lng = -47.46368900;

    // Inserir serviço já como 'pending' (pago)
    const serviceId = 'simulated_' + Date.now();
    const result: any = await pool.query(`
      INSERT INTO service_requests (
        id,
        client_id, category_id, profession, description, 
        latitude, longitude, address, 
        price_estimated, price_upfront, 
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      serviceId,
      client.id,
      1, // Categoria ID (ajustar se necessário)
      'Chaveiro', // Profissão exata
      'Cópia de chave urgente (Simulação)',
      lat, lng,
      'Rua de Teste, Imperatriz - MA',
      150.00, // Total
      45.00,  // Upfront (30%)
      'pending' // Status que dispara notificação
    ]);

    // const serviceId = result.insertId; // Não funciona para UUID
    console.log(`✅ Serviço criado no DB! ID: ${serviceId}`);

    // 3. Disparar Dispatcher
    console.log("📡 Buscando prestadores e enviando notificações...");

    // Pequeno delay para garantir que DB commitou se houver transação (mysql geralmente é autocommit mas bom garantir)
    await new Promise(r => setTimeout(r, 1000));

    await providerDispatcher.startDispatch(serviceId);

    console.log("🏁 Dispatch finalizado. Verifique o celular do prestador.");

  } catch (error) {
    console.error("❌ Erro na simulação:", error);
  } finally {
    setTimeout(() => {
      process.exit();
    }, 2000);
  }
}

simulate();
