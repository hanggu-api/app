#!/bin/bash

# Script para deploy das Edge Functions usando npx (não precisa instalar nada global)
echo "🚀 Iniciando deploy das Edge Functions..."

# Navegar para a pasta do projeto (garantir que está no lugar certo)
cd "/home/servirce/Documentos/101/projeto-central-"

# Comandos de deploy
echo "📦 Deploying config..."
npx supabase functions deploy config --project-ref mroesvsmylnaxelrhqtl --no-verify-jwt

echo "📦 Deploying theme..."
npx supabase functions deploy theme --project-ref mroesvsmylnaxelrhqtl --no-verify-jwt

echo "📦 Deploying strings..."
npx supabase functions deploy strings --project-ref mroesvsmylnaxelrhqtl --no-verify-jwt

echo "📦 Deploying analytics..."
npx supabase functions deploy analytics --project-ref mroesvsmylnaxelrhqtl --no-verify-jwt

echo "✅ Concluído! Agora reinicie o app Flutter."
