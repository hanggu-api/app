import axios from "axios";
import { io } from "socket.io-client";

// URL da Cardapyia (Produção)
const BACKEND_URL = "https://cardapyia.com/api";
const SOCKET_URL = "https://cardapyia.com"; // Assumindo raiz para socket

// Utils
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runFullFlowTest() {
  console.log("🚀 Iniciando Teste de Fluxo Completo em Cardapyia.com...");
  console.log(`📡 URL: ${BACKEND_URL}`);

  try {
    // 1. Health Check
    console.log("\n🏥 1. Verificando Health Check...");
    try {
      const health = await axios.get(`${BACKEND_URL}`);
      console.log(`   ✅ Status: ${health.status} - ${health.data}`);
    } catch (e: any) {
       // O endpoint /health pode não existir, tentando raiz /api
       console.log(`   ⚠️ Health check falhou, mas tentando prosseguir: ${e.message}`);
    }

    // 2. Registro de Usuários (Cliente e Prestador)
    const suffix = Math.floor(Math.random() * 100000);
    const clientEmail = `client_${suffix}@test.com`;
    const providerEmail = `provider_${suffix}@test.com`;
    const password = "TestPassword123!";
    // Generate valid random phone numbers (11 digits)
    const clientPhone = `119${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
    const providerPhone = `119${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;

    console.log("\n👤 2. Registrando Usuários...");
    
    // Registrar Cliente
    console.log(`   📝 Registrando Cliente: ${clientEmail} (${clientPhone})`);
    const clientReg = await axios.post(`${BACKEND_URL}/auth/register`, {
      name: "Cliente Teste Prod",
      email: clientEmail,
      password,
      role: "client",
      phone: clientPhone
    });
    const clientToken = clientReg.data.token;
    console.log("   ✅ Cliente registrado e logado");

    // Registrar Prestador
    console.log(`   📝 Registrando Prestador: ${providerEmail} (${providerPhone})`);
    const providerReg = await axios.post(`${BACKEND_URL}/auth/register`, {
      name: "Prestador Teste Prod",
      email: providerEmail,
      password,
      role: "provider",
      phone: providerPhone,
      professions: ["Eletricista", "Encanador"] // Profissões simuladas
    });
    const providerToken = providerReg.data.token;
    const providerId = providerReg.data.user?.id || providerReg.data.id;
    console.log(`   ✅ Prestador registrado e logado (ID: ${providerId})`);

    // 3. Atualizar Localização do Prestador (para estar perto do serviço)
    console.log("\n📍 3. Atualizando Localização do Prestador...");
    await axios.post(
      `${BACKEND_URL}/location/update`,
      { latitude: -23.550520, longitude: -46.633308 }, // Centro de SP
      { headers: { Authorization: `Bearer ${providerToken}` } }
    );
    console.log("   ✅ Localização atualizada (Centro SP)");

    // 4. Conectar ao WebSocket (Simulando App Online)
    console.log("\n🔌 4. Conectando ao WebSocket...");
    const clientSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token: clientToken },
      path: "/socket.io" // Padrão
    });
    const providerSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token: providerToken },
      path: "/socket.io" // Padrão
    });

    let notificationReceived = false;

    providerSocket.on("connect", () => {
        console.log(`   ✅ Prestador conectado ao Socket (ID: ${providerSocket.id})`);
        // AUTENTICAÇÃO MANUAL NO SOCKET (Necessário para receber eventos privados)
        console.log(`   🔑 Autenticando socket para user ${providerId}...`);
        providerSocket.emit("auth", { userId: providerId });
        
        // Verificar status após um breve delay
        setTimeout(() => {
             providerSocket.emit("check:status", { userId: providerId }, (response: any) => {
                 console.log(`   🕵️ Check Status Resposta:`, response);
             });
        }, 1000);
    });

    providerSocket.on("disconnect", (reason) => console.log(`   ⚠️ Prestador desconectado do Socket: ${reason}`));
    providerSocket.on("connect_error", (err) => console.log(`   ⚠️ Erro conexão socket prestador: ${err.message}`));
    
    // CORREÇÃO: O evento correto é 'service.offered'
    providerSocket.on("service.offered", (data) => {
      console.log("   🔔 NOTIFICAÇÃO RECEBIDA PELO PRESTADOR:", data);
      notificationReceived = true;
    });

    // Aguardar conexão
    await delay(2000);

    // 5. Criar Solicitação de Serviço
    console.log("\n🛠️ 5. Criando Solicitação de Serviço...");
    const servicePayload = {
      description: "Preciso de um eletricista urgente para trocar disjuntor (Teste Prod)",
      latitude: -23.550520, 
      longitude: -46.633308,
      address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
      category_id: 2, // ID CORRETO para Elétrica
      images: [],
      price_estimated: 150.00
    };

    const serviceRes = await axios.post(
      `${BACKEND_URL}/services`,
      servicePayload,
      { headers: { Authorization: `Bearer ${clientToken}` } }
    );
    const serviceId = serviceRes.data.serviceId || serviceRes.data.id;
    console.log(`   ✅ Serviço criado! ID: ${serviceId}`);

    // 5.1 Disparar Dispatch Manualmente (Simulando Pagamento Confirmado)
    console.log(`\n🚀 5.1 Disparando Busca de Prestadores...`);
    try {
        await axios.post(
        `${BACKEND_URL}/services/${serviceId}/dispatch`,
        {},
        { headers: { Authorization: `Bearer ${clientToken}` } }
        );
        console.log("   ✅ Dispatch iniciado");
    } catch (e: any) {
        console.log(`   ⚠️ Erro ao disparar dispatch manual (talvez endpoint debug não exista em prod): ${e.message}`);
        console.log("       Tentando aguardar dispatch automático...");
    }

    // 6. Aguardar Notificação e Status
    console.log("\n⏳ 6. Aguardando processamento e notificação...");
    
    // Aguardar até 30 segundos
    const maxRetries = 30;

    for (let i = 0; i < maxRetries; i++) {
      if (notificationReceived) break;
      process.stdout.write(".");
      await delay(1000);

      const checkService = await axios.get(
        `${BACKEND_URL}/services/${serviceId}`,
        { headers: { Authorization: `Bearer ${clientToken}` } }
      );
      
      const serviceData = checkService.data.service || checkService.data;
      const status = serviceData.status;
      
      if (status !== 'pending' && status !== 'draft') {
         // Se mudou de status, algo aconteceu
      }
    }
    
    console.log("\n");

    if (!notificationReceived) {
      console.log("⚠️ ALERTA: Serviço criado, mas notificação não confirmada via Socket.");
      try {
        const finalCheck = await axios.get(
            `${BACKEND_URL}/services/${serviceId}`,
            { headers: { Authorization: `Bearer ${clientToken}` } }
        );
        const finalServiceData = finalCheck.data.service || finalCheck.data;
        console.log(`   Status atual do serviço: ${finalServiceData.status}`);
      } catch (e) {}
    } else {
      console.log("   🎉 SUCESSO: Notificação Recebida!");
    }

    // Encerrar conexões
    clientSocket.disconnect();
    providerSocket.disconnect();

  } catch (error: any) {
    console.error("\n❌ ERRO FATAL:", error.response?.data || error.message);
  }
}

runFullFlowTest();
