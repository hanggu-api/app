# GUIA COMPLETO: Configurar Flutter + Supabase Remoto

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   CONFIGURE FLUTTER PARA ESCUTAR SUPABASE REMOTO          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Passo 1: Validar Configuração
Write-Host "📋 PASSO 1: Validando configuração..." -ForegroundColor Yellow
$envFile = "mobile_app\.env"
if (-not (Test-Path $envFile)) {
    Write-Error "❌ .env nao encontrado em mobile_app\.env"
    exit 1
}
Write-Host "✅ .env encontrado" -ForegroundColor Green

# Passo 2: Verificar Supabase no código
Write-Host ""
Write-Host "📋 PASSO 2: Verificando configuração no código..." -ForegroundColor Yellow
$configFile = "mobile_app\lib\core\config\supabase_config.dart"
if (Test-Path $configFile) {
    Write-Host "✅ supabase_config.dart encontrado" -ForegroundColor Green
} else {
    Write-Error "❌ supabase_config.dart nao encontrado"
    exit 1
}

$mainFile = "mobile_app\lib\main.dart"
if (Test-Path $mainFile) {
    $content = Get-Content $mainFile
    if ($content -match "SupabaseConfig.initialize\(\)") {
        Write-Host "✅ Supabase.initialize() chamado no main.dart" -ForegroundColor Green
    }
} else {
    Write-Error "❌ main.dart nao encontrado"
    exit 1
}

# Passo 3: Aplicar Migrations
Write-Host ""
Write-Host "📋 PASSO 3: Aplicar RLS Policies..." -ForegroundColor Yellow
Write-Host "   É obrigatório aplicar as migrations no Supabase!" -ForegroundColor Red
Write-Host ""
Write-Host "   OPÇÃO A - Via Dashboard Supabase (Recomendado):" -ForegroundColor Cyan
Write-Host "   1. Abra: https://app.supabase.com/projects"
Write-Host "   2. Selecione projeto com ID: mroesvsmylnaxelrhqtl"
Write-Host "   3. Vá em: SQL Editor > Novo Query"
Write-Host "   4. Cole o SQL de: supabase\migrations\20260224120000_add_rls_patches.sql"
Write-Host "   5. Clique: Run"
Write-Host ""

$appliedMigration = Read-Host "   Já aplicou a migration? (sim/nao)"
if ($appliedMigration -ne "sim") {
    Write-Host ""
    Write-Host "   Copiando SQL para clipboard..." -ForegroundColor Yellow
    Get-Content "supabase\migrations\20260224120000_add_rls_patches.sql" | Set-Clipboard
    Write-Host "   ✅ SQL copiado! Cole em Supabase > SQL Editor" -ForegroundColor Green
    Write-Host ""
    Read-Host "   Pressione ENTER após aplicar a migration no Dashboard"
}

# Passo 4: Baixar Dependências
Write-Host ""
Write-Host "📋 PASSO 4: Instalando dependências Flutter..." -ForegroundColor Yellow
Push-Location "mobile_app"
flutter pub get
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ flutter pub get falhou"
    Pop-Location
    exit 1
}
Write-Host "✅ Dependências instaladas" -ForegroundColor Green
Pop-Location

# Passo 5: Limpar build antigo
Write-Host ""
Write-Host "📋 PASSO 5: Limpando builds antigos..." -ForegroundColor Yellow
Push-Location "mobile_app"
flutter clean
Pop-Location
Write-Host "✅ Build limpo" -ForegroundColor Green

# Passo 6: Iniciar app
Write-Host ""
Write-Host "📋 PASSO 6: Iniciando Flutter App..." -ForegroundColor Yellow
Write-Host ""
Write-Host "   Escolha o device:" -ForegroundColor Cyan
Write-Host "   1 - Chrome (Web)"
Write-Host "   2 - Android Emulator"
Write-Host "   3 - iOS Simulator"
Write-Host ""

$choice = Read-Host "   Escolha (1/2/3)"

Push-Location "mobile_app"
switch ($choice) {
    "1" {
        Write-Host "🚀 Iniciando em Chrome..." -ForegroundColor Green
        flutter run -d chrome --web-port=3000
    }
    "2" {
        Write-Host "🚀 Iniciando em Android Emulator..." -ForegroundColor Green
        flutter run -d emulator-5554
    }
    "3" {
        Write-Host "🚀 Iniciando em iOS Simulator..." -ForegroundColor Green
        flutter run -d iphone
    }
    default {
        Write-Host "🚀 Iniciando em Chrome..." -ForegroundColor Green
        flutter run -d chrome --web-port=3000
    }
}
Pop-Location

Write-Host ""
Write-Host "✅ App rodando!" -ForegroundColor Green
Write-Host "   - Faça login com email/Google OAuth"
Write-Host "   - Dados são sincronizados com Supabase remoto"
Write-Host "   - Notificações em tempo real funcionando"
