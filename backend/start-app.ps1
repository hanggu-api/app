# DOCUMENTAÇÃO:
# Este script automatiza a instalação, build e execução da API e Redis via PM2 no Windows.

Write-Host "🚀 Iniciando setup do ambiente (Windows)..." -ForegroundColor Cyan

# 1. Instalar dependências
Write-Host "📦 Instalando dependências (npm install)..." -ForegroundColor Yellow
npm install

# 2. Build do TypeScript
Write-Host "🔨 Compilando o código TypeScript (npm run build)..." -ForegroundColor Yellow
npm run build

# 3. Limpar processos antigos
Write-Host "🧹 Limpando processos antigos..." -ForegroundColor Cyan
pm2 delete all 2>$null

# 4. Iniciar Redis primeiro
Write-Host "🟢 Iniciando Redis via PM2..." -ForegroundColor Green
pm2 start ecosystem.config.js --only redis-server

# 5. Aguardar Redis (Simples delay no Windows ou tentativa de check)
Write-Host "⏳ Aguardando Redis iniciar..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

if (Get-Command "redis-cli" -ErrorAction SilentlyContinue) {
    # Tenta verificar se o redis-cli está disponível
    redis-cli ping
} else {
    Write-Host "⚠️ redis-cli não encontrado, assumindo que Redis iniciou após 5s." -ForegroundColor Gray
}

# 6. Iniciar API
Write-Host "🟢 Redis (provavelmente) pronto. Iniciando API..." -ForegroundColor Green
pm2 start ecosystem.config.js --only conserta-api

# Salva a lista de processos
pm2 save

Write-Host "✨ Tudo pronto!" -ForegroundColor Cyan
pm2 status
