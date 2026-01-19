
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Buscando prestadores no banco de dados...');
  // @ts-ignore
  const providersList = await prisma.users.findMany({
    where: {
      role: 'provider'
    },
    include: {
      providers: true
    }
  });

  console.log(`✅ Encontrados ${providersList.length} prestadores.`);
  // @ts-ignore
  providersList.forEach(p => {
    console.log(`- ID: ${p.id}, Nome: ${p.full_name}, Email: ${p.email}`);
    if (p.providers) {
      console.log(`  - Online: ${p.providers.is_online}`);
      console.log(`  - Localização: ${p.providers.latitude}, ${p.providers.longitude}`);
    } else {
      console.log('  - ⚠️ Sem perfil de prestador (tabela providers)');
    }
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
