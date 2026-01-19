
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Verification Report ---');
    console.log('Users:', await prisma.users.count());
    console.log('Providers:', await prisma.providers.count());
    console.log('Professions:', await prisma.professions.count());
    console.log('Categories:', await prisma.service_categories.count());
    console.log('Task Catalog:', await prisma.task_catalog.count());
    console.log('Payments:', await prisma.payments.count());
    console.log('AI Embeddings:', await prisma.ai_embeddings.count());
    console.log('---------------------------');
}

main().catch(console.error).finally(() => prisma.$disconnect());
