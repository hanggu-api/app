
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const professionId = 3736;
  console.log(`🔍 Verificando profissão ID: ${professionId}`);

  // @ts-ignore
  const prof = await prisma.professions.findUnique({
    where: { id: professionId }
  });

  if (prof) {
    console.log(`✅ Profissão encontrada: ${prof.name} (ID: ${prof.id})`);
    console.log(`   Categoria ID: ${prof.category_id}`);
  } else {
    console.log('❌ Profissão não encontrada na tabela professions.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
