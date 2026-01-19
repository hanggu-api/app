import axios from 'axios';

const BACKEND_URL = 'http://localhost:4011';
const AUTH_TOKEN = 'SUPER_TEST_TOKEN';

async function simulateDeepFlow() {
    console.log('🧪 =================================================');
    console.log('🧪 SIMULAÇÃO DE FLUXO PROFUNDO (FRONEND > BACKEND > IA)');
    console.log('🧪 =================================================\n');

    try {
        // 1. Verificar Saúde do Sistema
        console.log('🔍 [FRONTEND] Verificando conexão com o backend...');
        const health = await axios.get(`${BACKEND_URL}/health`);
        console.log(`✅ [BACKEND] Status: ${JSON.stringify(health.data)}\n`);

        // 2. Simular entrada do usuário no Flutter
        const userText = 'quero fazer a barba';
        console.log(`💬 [FRONTEND] Usuário digita: "${userText}"`);

        // 3. Chamar classificação de IA via Backend
        console.log('🧠 [BACKEND] Enviando para classificação do serviço de IA...');
        const classifyStart = Date.now();
        const aiResponse = await axios.post(`${BACKEND_URL}/api/services/ai/classify`,
            { text: userText },
            { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
        );
        const classifyDuration = Date.now() - classifyStart;

        console.log(`✅ [IA SERVICE] Resultado: ${aiResponse.data.name} (Confiança: ${(aiResponse.data.score * 100).toFixed(1)}%)`);
        console.log(`⏱️  [IA SERVICE] Tempo de resposta: ${classifyDuration}ms\n`);

        // 4. Se a IA encontrou o serviço, prosseguir para criação do pedido
        if (aiResponse.data.id > 0) {
            console.log('📝 [FRONTEND] IA sugeriu o serviço correto. Criando solicitação...');

            const servicePayload = {
                category_id: aiResponse.data.category_id,
                profession: aiResponse.data.name,
                description: userText,
                latitude: -23.550520,
                longitude: -46.633308,
                address: 'Catedral da Sé, São Paulo - SP',
                price_estimated: 50.00,
                price_upfront: 15.00,
                status: 'waiting_payment',
                location_type: 'provider'
            };

            const serviceRes = await axios.post(`${BACKEND_URL}/api/services/`,
                servicePayload,
                { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
            );

            console.log(`✅ [BACKEND] Serviço criado com sucesso! ID: ${serviceRes.data.serviceId}`);
            console.log(`   Status do Pedido: ${serviceRes.data.service.status}\n`);

            // 5. Simular busca de prestadores próximos (Despacho)
            console.log('📡 [BACKEND] Iniciando ciclo de despacho para prestadores próximos...');
            // No mundo real, isso iniciaria um job de background
            console.log('✅ [DISPATCHER] Prestadores na região foram notificados via Socket/FCM.\n');

        } else {
            console.log('❌ [IA SERVICE] Não foi possível identificar o serviço contextualmente.');
        }

        console.log('🏁 =================================================');
        console.log('🏁 SIMULAÇÃO CONCLUÍDA COM SUCESSO');
        console.log('🏁 =================================================');

    } catch (error: any) {
        console.error('❌ ERRO NA SIMULAÇÃO:', error.response?.data || error.message);
    }
}

simulateDeepFlow();
