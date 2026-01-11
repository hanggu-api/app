import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

async function verifyFirebaseCredentials() {
  console.log('🔍 Iniciando verificação das credenciais do Firebase...');

  const keyPath = path.resolve(__dirname, '../serviceAccountKey.json');
  console.log(`📂 Procurando arquivo de chave em: ${keyPath}`);

  if (!fs.existsSync(keyPath)) {
    console.error('❌ ERRO: Arquivo serviceAccountKey.json NÃO encontrado!');
    process.exit(1);
  }

  console.log('✅ Arquivo encontrado.');

  try {
    const serviceAccount = require(keyPath);
    console.log(`🔑 Project ID no arquivo: ${serviceAccount.project_id}`);
    console.log(`📧 Client Email: ${serviceAccount.client_email}`);

    // Initialize app
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    console.log('🔄 Tentando listar usuários para validar acesso...');
    
    // Try to list users (requires valid credential and permissions)
    const listUsersResult = await admin.auth().listUsers(1);
    
    console.log('✅ SUCESSO! Conexão com Firebase Auth estabelecida.');
    console.log(`👥 Usuários encontrados (amostra): ${listUsersResult.users.length}`);
    if (listUsersResult.users.length > 0) {
      console.log(`   - Primeiro usuário: ${listUsersResult.users[0].email}`);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ FALHA na autenticação com o Firebase:');
    console.error(error);
    process.exit(1);
  }
}

verifyFirebaseCredentials();
