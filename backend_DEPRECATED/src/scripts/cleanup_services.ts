import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- Iniciando Limpeza de Serviços ---');

    // Deletar regeições primeiro devido a FK
    const rejections = await prisma.service_rejections.deleteMany({});
    console.log(`- Deletadas ${rejections.count} rejeições`);

    // Deletar mensagens de chat
    const messages = await prisma.chat_messages.deleteMany({});
    console.log(`- Deletadas ${messages.count} mensagens de chat`);

    // Deletar avaliações
    const reviews = await prisma.service_reviews.deleteMany({});
    console.log(`- Deletadas ${reviews.count} avaliações`);

    // Finalmente deletar solicitações de serviço
    const requests = await prisma.service_requests.deleteMany({});
    console.log(`- Deletadas ${requests.count} solicitações de serviço`);

    console.log('--- Limpeza Concluída ---');
}

main()
    .catch((e) => {
        console.error('Erro na limpeza:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
