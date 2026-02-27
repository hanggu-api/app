# 🔧 CORRIGIR ERROS - DEPLOY CORRETO DAS EDGE FUNCTIONS
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║     CORRIGINDO ERROS 404 E 401 - DEPLOY FINAL           ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# Path do supabase
$supabase = "$env:USERPROFILE\scoop\shims\supabase.exe"

Write-Host "📁 PASSO 1: Validar Edge Functions locais" -ForegroundColor Cyan
Write-Host ""

$functions = @(
    "ai-classify",
    "config", 
    "geo",
    "strings",
    "theme",
    "dispatch",
    "location",
    "payments",
    "push-notifications"
)

$missingFunctions = @()

foreach ($func in $functions) {
    $indexFile = "supabase\functions\$func\index.ts"
    if (Test-Path $indexFile) {
        $size = (Get-Item $indexFile).Length
        Write-Host "✅ $func ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "❌ $func - NÃO ENCONTRADO!" -ForegroundColor Red
        $missingFunctions += $func
    }
}

Write-Host ""

if ($missingFunctions.Count -gt 0) {
    Write-Host "⚠️  Funções faltando: $($missingFunctions -join ', ')" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "📤 PASSO 2: Deploy via CLI (tentativa final)" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

Write-Host "Executando: supabase functions deploy" -ForegroundColor Yellow
Write-Host ""

# Salvar output
$logFile = "deploy_final.log"
$errorFile = "deploy_error.log"

Push-Location "supabase"

# Executar deploy com output
& $supabase functions deploy 2>&1 | Tee-Object -FilePath $logFile

$deployCode = $LASTEXITCODE

Pop-Location

Write-Host ""
if ($deployCode -eq 0) {
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "✅ ✅ ✅ SUCESSO! EDGE FUNCTIONS ENVIADAS! ✅ ✅ ✅" -ForegroundColor Green
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Seu app agora tem todas as funções ativas no Supabase remoto!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximo passo: Execute novamente" -ForegroundColor Yellow
    Write-Host "   .\RUN_WITH_ERROR_CAPTURE.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Os erros 404 e 401 devem desaparecer! 🎉" -ForegroundColor Green
} else {
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "⚠️  Deploy retornou erro - Usando Plano B (Deploy Manual)" -ForegroundColor Yellow
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "Log salvo em: $logFile" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "As funções que FALTAM no servidor são:" -ForegroundColor Red
    Write-Host "   ❌ theme (404)" -ForegroundColor Red
    Write-Host "   ❌ strings (404)" -ForegroundColor Red
    Write-Host "   ⚠️  config (401 - JWT inválido)" -ForegroundColor Yellow
    Write-Host "   ⚠️  geo (401 - JWT inválido)" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "Vou copiar essas funções para clipboard..." -ForegroundColor Yellow
    Write-Host ""
    
    # Copiar as principais que faltam
    $criticalFuncs = @("theme", "strings", "config", "geo")
    
    foreach ($func in $criticalFuncs) {
        $file = "supabase\functions\$func\index.ts"
        if (Test-Path $file) {
            $content = Get-Content $file -Raw
            Set-Clipboard -Value $content
            
            Write-Host ""
            Write-Host "📋 [$func] Copiado para clipboard!" -ForegroundColor Green
            Write-Host "   1. Abra: https://app.supabase.com/projects/mroesvsmylnaxelrhqtl/functions/$func" -ForegroundColor Gray
            Write-Host "   2. Cole o código (Ctrl+V)" -ForegroundColor Gray
            Write-Host "   3. Clique em 'Deploy'" -ForegroundColor Gray
            
            $resp = Read-Host "   Já colou no Dashboard? (s/n)"
            if ($resp -ne "s") {
                Write-Host "   Aguardando você colar..." -ForegroundColor Yellow
                Read-Host "   Pressione ENTER quando terminar"
            }
        }
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ PRÓXIMO PASSO FINAL" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Execute:" -ForegroundColor Yellow
Write-Host "   .\RUN_WITH_ERROR_CAPTURE.ps1" -ForegroundColor Green
Write-Host ""
Write-Host "Verificar consoles no Chrome (DevTools > Console)" -ForegroundColor Yellow
Write-Host "Os erros devem desaparecer! 🎉" -ForegroundColor Green
Write-Host ""
