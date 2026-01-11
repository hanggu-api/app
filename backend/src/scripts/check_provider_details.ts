
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const providerId = 835n; // ID do Chaveiro Silva
  console.log(`🔍 Buscando detalhes do prestador ID: ${providerId}`);

  // @ts-ignore
  const provider = await prisma.users.findUnique({
    where: { id: providerId },
    include: {
      providers: true
    }
  });

  if (provider) {
    console.log(`👤 Nome: ${provider.full_name}`);
    console.log(`📧 Email: ${provider.email}`);
    // @ts-ignore
    if (provider.providers) {
      // @ts-ignore
      console.log(`📍 Loc: ${provider.providers.latitude}, ${provider.providers.longitude}`);
      // @ts-ignore
      console.log(`🟢 Online: ${provider.providers.is_online}`);
    }

    console.log('🛠️ Profissões vinculadas:');
    // Query manual em provider_professions
    // @ts-ignore
    const professions = await prisma.provider_professions.findMany({
      where: { provider_user_id: providerId }
    });

    if (professions.length > 0) {
      for (const pp of professions) {
        console.log(`   - Profession ID: ${pp.profession_id}`);
        // Buscar nome da profissão se possível (tabela professions ou ai_embeddings)
        try {
          // @ts-ignore
          const profInfo = await prisma.professions.findUnique({ where: { id: pp.profession_id } });
          if (profInfo) console.log(`     Nome: ${profInfo.name}`);
        } catch (e) { }
      }
    } else {
      console.log('   ⚠️ Nenhuma profissão vinculada!');
    }

  } else {
    console.log('❌ Prestador não encontrado.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
