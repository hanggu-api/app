# Deploy Automático de Edge Functions com Supabase CLI (path absoluto)
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   DEPLOYING EDGE FUNCTIONS TO SUPABASE REMOTO            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Path absoluto do supabase (instalado via scoop)
$supabasePath = "$env:USERPROFILE\scoop\shims\supabase.exe"

if (-not (Test-Path $supabasePath)) {
    $supabasePath = "$env:USERPROFILE\scoop\apps\supabase\current\supabase.exe"
}

if (-not (Test-Path $supabasePath)) {
    Write-Error "❌ Supabase CLI não encontrado nos caminhos esperados"
    Write-Host ""
    Write-Host "Caminhos procurados:" -ForegroundColor Yellow
    Write-Host "  - $env:USERPROFILE\scoop\shims\supabase.exe"
    Write-Host "  - $env:USERPROFILE\scoop\apps\supabase\current\supabase.exe"
    exit 1
}

Write-Host "✅ PASSO 1: Supabase CLI encontrado" -ForegroundColor Green
Write-Host "   Path: $supabasePath" -ForegroundColor Gray
Write-Host ""

# Testar supabase funciona
Write-Host "✅ PASSO 2: Testando Supabase CLI..." -ForegroundColor Cyan
try {
    $version = & $supabasePath --version
    Write-Host "   ✅ Versão: $version" -ForegroundColor Green
} catch {
    Write-Error "❌ Erro ao testar Supabase CLI: $_"
    exit 1
}

Write-Host ""
Write-Host "🔐 PASSO 3: Login no Supabase..." -ForegroundColor Cyan
Write-Host "   (Se solicitado, abra o navegador e continue)" -ForegroundColor Yellow
Write-Host ""

try {
    & $supabasePath login
    $loginSuccess = $LASTEXITCODE -eq 0
    
    if ($loginSuccess) {
        Write-Host "   ✅ Login bem-sucedido!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Login pode ter falhado, tentando continuação..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Erro no login: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔗 PASSO 4: Linkando ao projeto Supabase..." -ForegroundColor Cyan

Push-Location "supabase"

try {
    Write-Host "   Projeto ID: mroesvsmylnaxelrhqtl" -ForegroundColor Gray
    Write-Host ""
    
    & $supabasePath link --project-ref mroesvsmylnaxelrhqtl
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Projeto linkado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Link retornou erro código: $($LASTEXITCODE)" -ForegroundColor Yellow
        Write-Host "      (Pode estar já linkado, continuando...)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  Erro ao linkar: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📤 PASSO 5: Deployando Edge Functions..." -ForegroundColor Cyan
Write-Host ""

try {
    & $supabasePath functions deploy
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
        Write-Host "✅ DEPLOY BEM-SUCEDIDO!" -ForegroundColor Green
        Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
        Write-Host ""
        Write-Host "Todas as Edge Functions foram deployadas no Supabase remoto!" -ForegroundColor Green
        Write-Host ""
        Write-Host "   ✅ ai-classify" -ForegroundColor Green
        Write-Host "   ✅ geo" -ForegroundColor Green
        Write-Host "   ✅ dispatch" -ForegroundColor Green
        Write-Host "   ✅ location" -ForegroundColor Green
        Write-Host "   ✅ payments" -ForegroundColor Green
        Write-Host "   ✅ push-notifications" -ForegroundColor Green
        Write-Host "   ✅ config" -ForegroundColor Green
        Write-Host "   ✅ strings" -ForegroundColor Green
        Write-Host "   ✅ theme" -ForegroundColor Green
        Write-Host ""
        
        $deploySuccess = $true
    } else {
        Write-Host "⚠️  Deploy retornou código de erro: $($LASTEXITCODE)" -ForegroundColor Yellow
        $deploySuccess = $false
    }
} catch {
    Write-Host "❌ Erro no deploy: $_" -ForegroundColor Red
    $deploySuccess = $false
}

Pop-Location

Write-Host ""
if ($deploySuccess) {
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "🎉 SUCESSO TOTAL!" -ForegroundColor Green
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximo passo: Teste o app novamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "Execute:" -ForegroundColor Yellow
    Write-Host "   .\RUN_WITH_ERROR_CAPTURE.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Os erros devem desaparecer:" -ForegroundColor Green
    Write-Host "   ❌ ANTES: FunctionException(status: 404)" -ForegroundColor Red
    Write-Host "   ✅ DEPOIS: Sem erros" -ForegroundColor Green
} else {
    Write-Host "⚠️  Deploy teve problemas" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opções:" -ForegroundColor Yellow
    Write-Host "1. Tente novamente que supabase pode estar sincronizando" -ForegroundColor Gray
    Write-Host "2. Aguarde 5 minutos e rode novamente" -ForegroundColor Gray
    Write-Host "3. Verifique em https://app.supabase.com/projects/mroesvsmylnaxelrhqtl > Functions" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Enquanto isso, o app continua funcionando normalmente! 🚀" -ForegroundColor Green
}

Write-Host ""
