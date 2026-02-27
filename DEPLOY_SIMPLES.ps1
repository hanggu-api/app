# ✅ DEPLOY EDGE FUNCTIONS - Versão Simples e Confiável
# Execute este arquivo do diretório RAIZ do projeto
# Exemplo: C:\Users\thela\.gemini\antigravity\scratch\projeto_figma_app

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   DEPLOY AUTOMÁTICO - EDGE FUNCTIONS                     ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Detectar localização do script
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "📍 Diretório raiz: $scriptRoot" -ForegroundColor Cyan
Write-Host "📍 Diretório atual: $(Get-Location)" -ForegroundColor Cyan
Write-Host ""

# Path do supabase
$supabasePath = "$env:USERPROFILE\scoop\shims\supabase.exe"
if (-not (Test-Path $supabasePath)) {
    $supabasePath = "$env:USERPROFILE\scoop\apps\supabase\current\supabase.exe"
}

if (-not (Test-Path $supabasePath)) {
    Write-Error "❌ Supabase CLI não encontrado!"
    exit 1
}

Write-Host "✅ Supabase CLI: $supabasePath" -ForegroundColor Green
Write-Host ""

# Pasta supabase
$supabaseDir = Join-Path $scriptRoot "supabase"
if (-not (Test-Path $supabaseDir)) {
    Write-Error "❌ Pasta 'supabase' não encontrada em: $scriptRoot"
    exit 1
}

Write-Host "✅ Pasta supabase: $supabaseDir" -ForegroundColor Green
Write-Host ""

# Mudar para pasta supabase
Write-Host "📂 Entrando na pasta supabase..." -ForegroundColor Yellow
Set-Location $supabaseDir
Write-Host "   Agora em: $(Get-Location)" -ForegroundColor Gray
Write-Host ""

# Deploy
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "📤 INICIANDO DEPLOY..." -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

& $supabasePath functions deploy --debug

$deployCode = $LASTEXITCODE

Write-Host ""
if ($deployCode -eq 0) {
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "✅ SUCESSO! Edge Functions deployadas!" -ForegroundColor Green
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
} else {
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "⚠️  Deploy retornou erro código: $deployCode" -ForegroundColor Yellow
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Voltando ao diretório raiz..." -ForegroundColor Gray
Set-Location $scriptRoot
Write-Host ""
