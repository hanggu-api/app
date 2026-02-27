# Analisar Erros do Log e Corrigir Automaticamente
Write-Host "🔍 ANALISADOR DE ERROS - FLUTTER + SUPABASE" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$logFile = "flutter_run.log"
$errorFile = "flutter_errors.txt"

# Ler logs
$logs = @()
$errors = @()

if (Test-Path $logFile) {
    $logs = Get-Content $logFile -ErrorAction SilentlyContinue
    Write-Host "✅ Log principal lido ($($logs.Count) linhas)" -ForegroundColor Green
}

if (Test-Path $errorFile) {
    $errors = Get-Content $errorFile -ErrorAction SilentlyContinue
    Write-Host "✅ Log de erros lido ($($errors.Count) linhas)" -ForegroundColor Green
}

$allOutput = ($logs + $errors) | Where-Object { $_ }

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "📋 ERROS DETECTADOS" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

# Buscar linhas com erro
$errorLines = $allOutput | Where-Object { $_ -match "error|Error|ERROR|Exception|exception|EXCEPTION|failed|Failed|FAILED" }

if ($errorLines.Count -eq 0) {
    Write-Host "✅ NENHUM ERRO ENCONTRADO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Seu app está rodando corretamente! 🎉" -ForegroundColor Green
    exit 0
}

Write-Host "❌ Total de linhas com erro: $($errorLines.Count)" -ForegroundColor Red
Write-Host ""

# Mostrar erros
$errorLines | ForEach-Object {
    Write-Host "  📍 $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "🔧 DIAGNÓSTICO AUTOMÁTICO" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

$fixes = @()

# Checklist de diagnóstico
$diagnostics = @(
    @{
        name = "RLS Policy Error"
        pattern = "RLS|Row Level Security|permission denied|policy|policies"
        fix = {
            Write-Host "❌ PROBLEMA: RLS Policy não aplicada" -ForegroundColor Red
            Write-Host ""
            Write-Host "SOLUÇÃO: Aplicar migration SQL no Supabase" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Opções:"
            Write-Host "1. Abra: https://app.supabase.com/projects/mroesvsmylnaxelrhqtl"
            Write-Host "2. SQL Editor → New Query"
            Write-Host "3. Cole: supabase\migrations\20260224120000_add_rls_patches.sql"
            Write-Host "4. Execute"
            Write-Host ""
            Write-Host "Quer aplicar agora? (sim/nao)"
            $aplicar = Read-Host
            if ($aplicar -eq "sim") {
                Write-Host "Copiando SQL para clipboard..." -ForegroundColor Yellow
                Get-Content "supabase\migrations\20260224120000_add_rls_patches.sql" | Set-Clipboard
                Write-Host "✅ SQL copiado! Cole no Supabase Dashboard" -ForegroundColor Green
            }
        }
    },
    @{
        name = "Supabase Connection Error"
        pattern = "SUPABASE|supabase|auth|Auth|initialization|Initialization"
        fix = {
            Write-Host "❌ PROBLEMA: Erro na conexão Supabase" -ForegroundColor Red
            Write-Host ""
            Write-Host "VERIFICAÇÃO:" -ForegroundColor Yellow
            Write-Host "1. .env existe? $(if (Test-Path 'mobile_app\.env') { '✅ SIM' } else { '❌ NÃO' })"
            if (Test-Path "mobile_app\.env") {
                $envContent = Get-Content "mobile_app\.env"
                $hasUrl = $envContent -match "SUPABASE_URL"
                $hasKey = $envContent -match "SUPABASE_ANON_KEY"
                Write-Host "2. SUPABASE_URL presente? $(if ($hasUrl) { '✅ SIM' } else { '❌ NÃO' })"
                Write-Host "3. SUPABASE_ANON_KEY presente? $(if ($hasKey) { '✅ SIM' } else { '❌ NÃO' })"
            }
            Write-Host ""
            Write-Host "SOLUÇÃO:"
            Write-Host "1. Verifique credenciais em: mobile_app\.env"
            Write-Host "2. URL deve ser: https://mroesvsmylnaxelrhqtl.supabase.co"
            Write-Host "3. Key deve iniciar com: eyJhbGc..."
            Write-Host ""
        }
    },
    @{
        name = "Database Connection Error"
        pattern = "database|Database|postgres|Postgres|connection|Connection|failed|Failed"
        fix = {
            Write-Host "❌ PROBLEMA: Erro na conexão com banco de dados" -ForegroundColor Red
            Write-Host ""
            Write-Host "VERIFICAÇÃO:" -ForegroundColor Yellow
            Write-Host "1. Supabase project online? Acesse:"
            Write-Host "   https://app.supabase.com/projects/mroesvsmylnaxelrhqtl"
            Write-Host ""
            Write-Host "2. Teste conexão direto:"
            Write-Host "   - Abra Supabase Dashboard"
            Write-Host "   - SQL Editor"
            Write-Host "   - Execute: SELECT 1;"
            Write-Host ""
        }
    },
    @{
        name = "Missing Plugin"
        pattern = "MissingPluginException|plugin|Plugin|dependency"
        fix = {
            Write-Host "❌ PROBLEMA: Plugin/dependência faltando" -ForegroundColor Red
            Write-Host ""
            Write-Host "SOLUÇÃO: Reinstalar dependências" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Execute:"
            Write-Host "  cd mobile_app"
            Write-Host "  flutter clean"
            Write-Host "  flutter pub get"
            Write-Host "  flutter pub get --offline (se necessário)"
            Write-Host ""
        }
    },
    @{
        name = "Build Error"
        pattern = "build|Build|BUILD|compilation|Compilation|compile|Compile"
        fix = {
            Write-Host "❌ PROBLEMA: Erro de compilação" -ForegroundColor Red
            Write-Host ""
            Write-Host "SOLUÇÃO: Limpar e reconstruir" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Execute:"
            Write-Host "  cd mobile_app"
            Write-Host "  flutter clean"
            Write-Host "  flutter pub get"
            Write-Host "  flutter run -d chrome"
            Write-Host ""
        }
    }
)

# Executar diagnóstico
foreach ($diagnostic in $diagnostics) {
    if ($allOutput -match $diagnostic.pattern) {
        Write-Host "🔴 Detectado: $($diagnostic.name)" -ForegroundColor Red
        Write-Host ""
        & $diagnostic.fix
        Write-Host ""
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "📝 PRÓXIMAS AÇÕES" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""
Write-Host "Logs completos em: $logFile" -ForegroundColor Gray
Write-Host "Erros separados em: $errorFile" -ForegroundColor Gray
Write-Host ""
Write-Host "Após corrigir os problemas acima, execute:" -ForegroundColor Yellow
Write-Host "  .\RUN_WITH_ERROR_CAPTURE.ps1" -ForegroundColor Cyan
Write-Host ""
