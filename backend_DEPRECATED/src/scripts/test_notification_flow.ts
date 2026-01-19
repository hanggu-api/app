import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import { FirebaseService } from '../services/firebase_service';

dotenv.config();

// Initialize Firebase (if not already via other imports, but safe to do explicitly for script)
try {
    if (admin.apps.length === 0) {
        const serviceAccount = require('../../serviceAccountKey.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL // Ensure this env var is set or inferred
        });
    }
} catch (e) {
    console.error("Error init firebase for script:", e);
    process.exit(1);
}

const runTest = async () => {
    const userId = process.argv[2];
    
    if (!userId) {
        console.error("❌ Por favor, forneça o ID do usuário (Prestador) como argumento.");
        console.error("Exemplo: npx ts-node src/scripts/test_notification_flow.ts 123");
        process.exit(1);
    }

    console.log(`🚀 Iniciando teste de notificação para User ID: ${userId}`);

    const mockServiceData = {
        id: 99999, // Fake Service ID
        category_name: "Teste de Verificação",
        description: "Este é um serviço de teste para validar o fluxo de notificação via Firebase.",
        price: 150.00,
        latitude: -23.550520,
        longitude: -46.633308,
        address: "Rua de Teste, 123 - São Paulo, SP",
        client_name: "Cliente Teste",
        client_rating: 4.8,
        distance: "2.5 km"
    };

    try {
        // 1. Send RTDB Event (The "Socket" replacement)
        console.log("📡 Enviando evento 'service.offered' para o Realtime Database...");
        await FirebaseService.sendUserEvent(userId, "service.offered", {
            service_id: mockServiceData.id,
            service: mockServiceData,
            timeout_ms: 30000,
            cycle: 1,
            source: "manual_test_script"
        });
        console.log("✅ Evento RTDB enviado com sucesso!");
        console.log(`👉 Verifique no App se o modal 'Nova Oferta' apareceu.`);

        // 2. Send Push (Optional - uses NotificationManager logic simulation)
        // We skip the full manager here to keep script simple, but we can verify the token
        // logic if needed. For now, the RTDB event is the critical "Socket" part.

    } catch (error) {
        console.error("❌ Erro ao enviar notificação:", error);
    } finally {
        process.exit(0);
    }
};

runTest();
