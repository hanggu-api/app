#!/bin/bash

# DOCUMENTAÇÃO:
# Este script automatiza a instalação, build e execução da API via PM2.
# Redis foi removido conforme solicitação.

echo "🚀 Iniciando setup do ambiente..."

# 1. Instalar dependências
echo "📦 Instalando dependências (npm install)..."
npm install

# 2. Build do TypeScript
echo "🔨 Compilando o código TypeScript (npm run build)..."
npm run build

# 3. Limpar processos antigos do PM2
echo "🧹 Reiniciando processos do PM2..."
pm2 delete all 2>/dev/null || true

# 4. Iniciar a API
echo "🟢 Iniciando a API..."
pm2 start ecosystem.config.js

# 5. Salvar estado do PM2 para reiniciar no boot
pm2 save

echo "✨ Deploy finalizado com sucesso!"
echo "📋 Status atual:"
pm2 status
