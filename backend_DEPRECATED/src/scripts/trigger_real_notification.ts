import prisma from "../database/prisma";
import { notificationManager } from "../notifications/manager";
import axios from "axios";

/**
 * Script para automatizar o teste de notificações reais via FCM.
 * O objetivo é que o usuário escolha o que quer simular e o backend dispare
 * para o Firebase, que por sua vez enviará para o dispositivo físico.
 */

async function main() {
    console.log("🚀 Iniciando Simulador de Automação de Notificações Reais...");

    // 1. Identificar o usuário que está logado no app (baseado no último token ativo)
    const latestDevice = await prisma.user_devices.findFirst({
        orderBy: { last_active: 'desc' },
        include: { users: true }
    });

    if (!latestDevice) {
        console.error("❌ Nenhum dispositivo encontrado no banco! Faça login no app primeiro.");
        process.exit(1);
    }

    const userId = Number(latestDevice.user_id);
    const userName = latestDevice.users.full_name;
    const userRole = latestDevice.users.role;

    console.log(`✅ Dispositivo alvo encontrado: ${userName} (ID: ${userId}) - Papel: ${userRole}`);

    const scenario = process.argv[2] || "offer";

    // 4. Buscar ou Criar dependências para o serviço (Categoria e Cliente)
    let category = await prisma.service_categories.findFirst();
    if (!category) {
        category = await prisma.service_categories.create({
            data: { name: 'Geral', icon_slug: 'box' }
        });
    }

    // Se o usuário logado for provider, precisamos de UM OUTRO usuário para ser o cliente
    let client = await prisma.users.findFirst({ where: { role: 'client' } });
    if (!client) {
        client = await prisma.users.findFirst({ where: { id: { not: BigInt(userId) } } });
    }

    if (!client) {
        console.error("❌ Necessário ter pelo menos outro usuário no banco para ser o 'cliente'.");
        process.exit(1);
    }

    let serviceId = "12345";

    switch (scenario) {
        case "offer":
            console.log("📢 Criando SERVIÇO REAL no banco e disparando FCM...");

            const newService = await prisma.service_requests.create({
                data: {
                    id: require('uuid').v4(),
                    client_id: client.id,
                    category_id: category.id,
                    profession: 'Chaveiro 24h',
                    description: 'Teste E2E: Perdi a chave do portão principal.',
                    latitude: -23.550520,
                    longitude: -46.633308,
                    address: 'Rua das Flores, 100 - Centro',
                    price_estimated: 250.00,
                    price_upfront: 75.00,
                    status: 'pending'
                }
            });

            serviceId = newService.id;

            await notificationManager.send(
                userId,
                "service.offered",
                serviceId,
                "Nova Oferta de Chaveiro!",
                "Um cliente solicitou um serviço de chaveiro urgente próximo a você.",
                {
                    service_id: serviceId,
                    category_name: "Chaveiro 24h",
                    address: "Rua das Flores, 100",
                    provider_amount: "212.50",
                    description: "Teste E2E: Perdi a chave do portão principal.",
                    type: "service.offered"
                }
            );
            break;

        case "chat":
            console.log("💬 Simulando MENSAGEM DE CHAT...");
            let chatService = await prisma.service_requests.findFirst({
                where: { OR: [{ client_id: BigInt(userId) }, { provider_id: BigInt(userId) }] },
                orderBy: { created_at: 'desc' }
            });

            if (!chatService) {
                console.log("ℹ️ Criando serviço temporário para o chat...");
                chatService = await prisma.service_requests.create({
                    data: {
                        id: require('uuid').v4(),
                        client_id: client.id,
                        category_id: category.id,
                        profession: 'Suporte Técnico',
                        description: 'Serviço de teste para Chat.',
                        latitude: -23.550520,
                        longitude: -46.633308,
                        address: 'Rua de Teste, 10',
                        price_estimated: 100.00,
                        price_upfront: 30.00,
                        status: 'accepted',
                        provider_id: BigInt(userId)
                    }
                });
            }

            await notificationManager.send(
                userId,
                "chat_message",
                chatService.id,
                "Nova Mensagem",
                "Olá! Você já está chegando ao local?",
                {
                    service_id: chatService.id,
                    type: "chat_message"
                }
            );
            break;

        case "arrived":
            console.log("🏃 Simulando PRESTADOR CHEGOU...");
            let arriveService = await prisma.service_requests.findFirst({
                where: { OR: [{ client_id: BigInt(userId) }, { provider_id: BigInt(userId) }] },
                orderBy: { created_at: 'desc' }
            });

            if (!arriveService) {
                console.log("ℹ️ Criando serviço temporário para simular chegada...");
                arriveService = await prisma.service_requests.create({
                    data: {
                        id: require('uuid').v4(),
                        client_id: client.id,
                        category_id: category.id,
                        profession: 'Entregador',
                        description: 'Serviço de teste para Chegada.',
                        latitude: -23.550520,
                        longitude: -46.633308,
                        address: 'Rua do Teste, 20',
                        price_estimated: 50.00,
                        status: 'accepted',
                        provider_id: BigInt(userId)
                    }
                });
            }

            await notificationManager.send(
                userId,
                "provider_arrived",
                arriveService.id,
                "O Prestador Chegou!",
                "João da Silva acabou de estacionar no seu endereço.",
                {
                    service_id: arriveService.id,
                    type: "provider_arrived"
                }
            );
            break;

        default:
            console.log("Opções disponíveis: offer, chat, arrived");
            break;
    }

    console.log("✅ Comando de notificação enviado ao Firebase!");
    process.exit(0);
}

main().catch(err => {
    console.error("❌ Erro no script:", err);
    process.exit(1);
});
