
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🛠️ Verificando/Criando usuário de teste (client@test.com)...');
  
  // @ts-ignore
  let user = await prisma.users.findUnique({
    where: { email: 'client@test.com' }
  });

  if (!user) {
    console.log('👤 Usuário não encontrado. Criando...');
    // @ts-ignore
    user = await prisma.users.create({
      data: {
        email: 'client@test.com',
        full_name: 'Cliente de Teste',
        password_hash: 'mock_hash',
        role: 'client',
        firebase_uid: 'test_firebase_uid_123',
        phone: '11999999999'
      }
    });
    console.log(`✅ Usuário criado com ID: ${user.id}`);
  } else {
    console.log(`✅ Usuário já existe com ID: ${user.id}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
