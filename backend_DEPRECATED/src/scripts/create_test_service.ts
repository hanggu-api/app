
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:4011/api';

async function run() {
  try {
    console.log('🚀 Iniciando simulação de criação de serviço...');

    // 1. Usar Bypass Token (SUPER_TEST_TOKEN)
    // O backend com authMiddleware modificado aceita este token e usa o user client@test.com
    const token = 'SUPER_TEST_TOKEN';
    console.log(`🔑 Usando Bypass Token: ${token}`);

    // 2. Criar Serviço
    // Coordenadas: Perto do 'chaveiro silva' (ID 835) em SP
    // Lat: -23.55052, Lng: -46.633308
    const lat = -23.55052;
    const lng = -46.633308;

    console.log(`📍 Localização do Serviço: ${lat}, ${lng} (Perto do Chaveiro Silva)`);
    console.log('🛠️  Criando solicitação de serviço (Chaveiro)...');

    const serviceData = {
      description: "Preciso de cópia de chave simples (Teste Auth Bypass)",
      category_id: 5, // Chaveiro
      profession: "Chaveiro",
      price_estimated: 15.00,
      latitude: lat,
      longitude: lng,
      address: "Rua Teste, SP",
      location_type: "client"
    };

    const serviceRes = await axios.post(`${API_URL}/services`, serviceData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (serviceRes.data.success) {
      console.log('✅ Serviço criado com sucesso!');
      console.log(`🆔 ID do Serviço: ${serviceRes.data.id || 'N/A'}`);
      console.log('📡 O backend deve estar enviando notificações agora via RTDB...');

      if (serviceRes.data.id) {
        try {
          console.log('🔍 Buscando detalhes do serviço para verificar preços...');
          const details = await axios.get(`${API_URL}/services/${serviceRes.data.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const svc = details.data.service || details.data;
          console.log('💰 Detalhes Financeiros:');
          console.log(`   - Preço Estimado (Total): R$ ${svc.price_estimated}`);
          console.log(`   - Preço Entrada (30%):    R$ ${svc.price_upfront}`);

          const expectedUpfront = Math.round(svc.price_estimated * 0.3 * 100) / 100;
          if (Math.abs(svc.price_upfront - expectedUpfront) < 0.1) {
            console.log('✅ CÁLCULO DE ENTRADA CORRETO (30%)');
          } else {
            console.error(`❌ CÁLCULO DE ENTRADA INCORRETO. Esperado: ${expectedUpfront}, Recebido: ${svc.price_upfront}`);
          }
        } catch (detailErr) {
          console.error('⚠️ Falha ao buscar detalhes:', detailErr);
        }
      }

    } else {
      console.error('❌ Falha ao criar serviço:', serviceRes.data);
    }

  } catch (e: any) {
    console.error('❌ Erro no script:', e.response?.data || e.message);
  }
}

run();
