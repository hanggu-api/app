#!/bin/bash

# Script para inicializar as tabelas de tema no banco D1

echo "🎨 Inicializando sistema de tema dinâmico..."

# Nome do banco de dados (ajuste conforme seu wrangler.toml)
DB_NAME="projeto-central-db"

echo "📊 Criando tabelas..."

# Executar schema SQL
wrangler d1 execute $DB_NAME --file=./database/theme_schema.sql

echo "✅ Tabelas criadas com sucesso!"
echo ""
echo "📝 Próximos passos:"
echo "1. Faça deploy do worker: npm run deploy"
echo "2. Teste os endpoints:"
echo "   curl https://seu-worker.workers.dev/api/theme/active"
echo "   curl https://seu-worker.workers.dev/api/strings/pt-BR"
echo ""
echo "🎉 Sistema de tema dinâmico configurado!"
