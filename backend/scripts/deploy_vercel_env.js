
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ENV_FILE = path.resolve(__dirname, '../.env');
const SERVICE_ACCOUNT_FILE = path.resolve(__dirname, '../serviceAccountKey.json');

async function main() {
  console.log('🚀 Iniciando configuração de variáveis de ambiente no Vercel...');

  // 1. Ler .env
  if (!fs.existsSync(ENV_FILE)) {
    console.error('❌ Arquivo .env não encontrado!');
    process.exit(1);
  }
  const envContent = fs.readFileSync(ENV_FILE, 'utf-8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const parts = line.split('=');
    const key = parts[0].trim();
    let value = parts.slice(1).join('=').trim();
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    envVars[key] = value;
  });

  // 2. Tratar SERVICE ACCOUNT (Especial)
  // No Vercel, não enviamos o arquivo, mas sim o conteúdo dele em uma variável.
  // O código firebase.ts já espera FIREBASE_SERVICE_ACCOUNT.
  if (fs.existsSync(SERVICE_ACCOUNT_FILE)) {
    console.log('📦 Processando serviceAccountKey.json...');
    const serviceAccountContent = fs.readFileSync(SERVICE_ACCOUNT_FILE, 'utf-8');
    // Minificar JSON para economizar espaço e evitar problemas com quebras de linha
    envVars['FIREBASE_SERVICE_ACCOUNT'] = JSON.stringify(JSON.parse(serviceAccountContent));
    console.log('✅ FIREBASE_SERVICE_ACCOUNT preparado.');
  } else {
    console.warn('⚠️ serviceAccountKey.json não encontrado. A autenticação Firebase pode falhar se não houver outra forma configurada.');
  }

  // 3. Iterar e adicionar ao Vercel
  // Filtros:
  const IGNORE_KEYS = ['PORT', 'GOOGLE_APPLICATION_CREDENTIALS', 'GOOGLE_CREDENTIALS_PATH']; 
  // Ignoramos credenciais de arquivo pois usamos a variável de conteúdo agora.
  
  // URL de notificação para Vercel deve ser a do próprio projeto ou a definida
  // Vamos manter a do .env se existir, mas alertar
  if (envVars['NOTIFICATION_URL'] && envVars['NOTIFICATION_URL'].includes('cardapyia.com')) {
     console.warn('⚠️ NOTIFICATION_URL aponta para cardapyia.com. Certifique-se de que é intencional. No Vercel, deveria ser a URL do projeto Vercel para testes isolados.');
     // Opcional: Atualizar automaticamente para a URL do Vercel se soubéssemos.
     // Por enquanto mantemos como está no .env local.
  }

  const keys = Object.keys(envVars).filter(k => !IGNORE_KEYS.includes(k));
  
  console.log(`📋 Encontradas ${keys.length} variáveis para sincronizar.`);

  for (const key of keys) {
    const value = envVars[key];
    try {
      console.log(`📤 Enviando ${key}...`);
      // check if exists first to decide add or nothing (vercel env add falha se existe)
      // Simplesmente tentamos remover antes (ignorando erro) e adicionar.
      // "vercel env rm <key> production -y"
      
      try {
        execSync(`npx vercel env rm ${key} production -y`, { stdio: 'ignore' });
      } catch (e) {
        // Ignora erro se não existir
      }

      // Adicionar
      // echo -n "value" | vercel env add NAME production
      // Windows PowerShell pipe pode ser chato, mas execSync roda em shell.
      // Vamos usar input option do execSync se possível ou spawn.
      
      // Node execSync com input:
      execSync(`npx vercel env add ${key} production`, { input: value, stdio: ['pipe', 'inherit', 'inherit'] });
      
    } catch (error) {
      console.error(`❌ Falha ao enviar ${key}:`, error.message);
    }
  }

  console.log('🏁 Sincronização de variáveis concluída!');
}

main().catch(console.error);
