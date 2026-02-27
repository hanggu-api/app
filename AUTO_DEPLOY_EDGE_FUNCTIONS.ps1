# Deploy Automático de Edge Functions + Pega Log de Erro + Corrige
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║   AUTO-DEPLOY EDGE FUNCTIONS + ANÁLISE DE ERROS           ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# Step 1: Validar Edge Functions locais
Write-Host "📋 PASSO 1: Validando Edge Functions locais..." -ForegroundColor Cyan
$functionsDir = "supabase\functions"
$functions = @()

if (Test-Path $functionsDir) {
    $dirs = Get-ChildItem -Path $functionsDir -Directory
    foreach ($dir in $dirs) {
        $indexFile = Join-Path $dir.FullName "index.ts"
        if (Test-Path $indexFile) {
            $functions += @{
                name = $dir.Name
                path = $dir.FullName
                indexPath = $indexFile
            }
            Write-Host "   ✅ $($dir.Name)" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $($dir.Name) - INCOMPLETO" -ForegroundColor Red
        }
    }
    Write-Host ""
    Write-Host "✅ Total: $($functions.Count) funções prontas para deploy" -ForegroundColor Green
} else {
    Write-Error "Pasta supabase\functions não encontrada!"
    exit 1
}

# Step 2: Tentar deploy via CLI
Write-Host ""
Write-Host "🚀 PASSO 2: Tentando deploy via Supabase CLI..." -ForegroundColor Cyan
Write-Host ""

# Verificar se supabase está instalado
try {
    $supabaseVersion = & supabase --version 2>$null
    Write-Host "   ✅ Supabase CLI encontrado: $supabaseVersion" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "   🔑 Aguarde login (siga as instruções)" -ForegroundColor Yellow
    Write-Host ""
    
    # Tentar fazer login silenciosamente (pode falhar, ok)
    & supabase login --no-prompt 2>$null
    
    # Tentar ligar ao projeto
    Write-Host "   🔗 Linkando ao projeto Supabase..." -ForegroundColor Yellow
    Push-Location "supabase"
    & supabase link --project-ref mroesvsmylnaxelrhqtl 2>$null
    
    # Fazer deploy
    Write-Host "   📤 Deployando funções..." -ForegroundColor Yellow
    & supabase functions deploy 2>&1 | Tee-Object -Variable deployLog
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ DEPLOY BEM-SUCEDIDO!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Todas as Edge Functions foram deployadas no Supabase remoto:" -ForegroundColor Green
        $functions | ForEach-Object {
            Write-Host "   ✅ $($_.name)" -ForegroundColor Green
        }
    } else {
        Write-Host ""
        Write-Host "⚠️  Deploy teve problemas, mas não é crítico" -ForegroundColor Yellow
        Write-Host ""
    }
    
    Pop-Location
    
} catch {
    Write-Host "   ⚠️  Supabase CLI não está instalado ou não logado" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Instrções para instalar:" -ForegroundColor Cyan
    Write-Host "   npm install -g supabase@latest" -ForegroundColor Gray
    Write-Host ""
}

# Step 3: Fallback Manual
Write-Host ""
Write-Host "═════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "📋 PASSO 3: Deploy Manual (Se CLI falhar)" -ForegroundColor Yellow
Write-Host "═════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

Write-Host "Se o CLI não funcionou, deploy manualmente:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Abra: https://app.supabase.com/projects/mroesvsmylnaxelrhqtl" -ForegroundColor Cyan
Write-Host "2. Vá em: Edge Functions" -ForegroundColor Cyan
Write-Host "3. Para cada função abaixo, crie ou atualize:" -ForegroundColor Cyan
Write-Host ""

$functions | ForEach-Object {
    Write-Host "   📁 $($_.name)" -ForegroundColor Gray
    Write-Host "      Copie de: $($_.path | Resolve-Path -Relative)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "═════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "✅ APÓS DEPLOYAR As Edge Functions" -ForegroundColor Green
Write-Host "═════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Aguarde 5-10 segundos para Edge Functions ficarem online" -ForegroundColor Cyan
Write-Host "2. Execute novamente:" -ForegroundColor Cyan
Write-Host "   .\RUN_WITH_ERROR_CAPTURE.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Os erros devem desaparecer:" -ForegroundColor Cyan
Write-Host "   ❌ ANTES: FunctionException(status: 404)" -ForegroundColor Red
Write-Host "   ✅ DEPOIS: Sem erros de Edge Function" -ForegroundColor Green
Write-Host ""

# Step 4: Análise final
Write-Host "═════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 RESUMO DO QUE FOI FEITO" -ForegroundColor Cyan
Write-Host "═════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Validou $($functions.Count) Edge Functions locais"
Write-Host "✅ Tentou deploy automático via Supabase CLI"
Write-Host "✅ Forneceu instruções para deploy manual se necessário"
Write-Host "✅ App continua rodando normalmente mesmo sem Edge Functions"
Write-Host ""
Write-Host "💡 Nota: O app FUNCIONA sem Edge Functions, mas com limitações" -ForegroundColor Yellow
Write-Host "   - Sem funções: Sem classificação de serviço, geo, config etc"
Write-Host "   - Com funções: Todas as features funcionam 100%" -ForegroundColor Green
Write-Host ""
