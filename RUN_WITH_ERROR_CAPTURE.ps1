# Captura Erros do Flutter e Corrige Automaticamente
Write-Host "🚀 Iniciando Flutter com monitoramento de erros..." -ForegroundColor Cyan
Write-Host ""

$logFile = "flutter_run.log"
$errorFile = "flutter_errors.txt"

# Limpar logs anteriores
if (Test-Path $logFile) { Remove-Item $logFile }
if (Test-Path $errorFile) { Remove-Item $errorFile }

# Mudar para mobile_app
Push-Location "mobile_app"

Write-Host "📝 Logs serão salvos em: $logFile" -ForegroundColor Yellow
Write-Host "⚠️  Logs de erro em: $errorFile" -ForegroundColor Yellow
Write-Host ""

# Rodar Flutter e capturar output
Write-Host "▶️  Rodando: flutter run -d chrome" -ForegroundColor Green
Write-Host ""

try {
    # Capturar stdout E stderr
    $process = Start-Process -FilePath "flutter" `
        -ArgumentList "run", "-d", "chrome" `
        -NoNewWindow `
        -PassThru `
        -RedirectStandardOutput $logFile `
        -RedirectStandardError $errorFile `
        -ErrorAction Stop

    Write-Host "✅ Flutter iniciado (PID: $($process.Id))" -ForegroundColor Green
    Write-Host ""
    Write-Host "⏳ Aguardando 15 segundos para capturar erros iniciais..."
    Write-Host ""
    
    # Esperar um pouco para os logs se acumularem
    Start-Sleep -Seconds 15

    # Ler logs
    $logs = @()
    $errors = @()
    
    if (Test-Path $logFile) {
        $logs = Get-Content $logFile -ErrorAction SilentlyContinue
    }
    
    if (Test-Path $errorFile) {
        $errors = Get-Content $errorFile -ErrorAction SilentlyContinue
    }

    # Combinar e analisar
    $allOutput = $logs + $errors | Where-Object { $_ }

    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "📊 ANÁLISE DE ERROS" -ForegroundColor Yellow
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host ""

    if ($allOutput -match "error|Error|ERROR|exception|Exception|EXCEPTION" -or $errors) {
        Write-Host "❌ ERROS ENCONTRADOS:" -ForegroundColor Red
        Write-Host ""
        
        # Mostrar últimas 30 linhas (geralmente onde estão os erros críticos)
        $relevantLines = $allOutput | Select-Object -Last 30
        $relevantLines | ForEach-Object { 
            if ($_ -match "error|Error|ERROR|exception|Exception|EXCEPTION|failed|Failed|FAILED") {
                Write-Host "  ⚠️  $_" -ForegroundColor Red
            } else {
                Write-Host "     $_" -ForegroundColor Gray
            }
        }
        
        Write-Host ""
        Write-Host "💾 Logs completos salvos em: $logFile" -ForegroundColor Yellow
        Write-Host ""
        
    } else {
        Write-Host "✅ APP RUNNING!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📲 Flutter foi iniciado com sucesso em Chrome" -ForegroundColor Green
        Write-Host "   Aguarde a janela abrir automaticamente..."
        Write-Host ""
    }

    # Listar possíveis problemas comuns
    Write-Host "🔍 VERIFICAÇÃO RÁPIDA DE PROBLEMAS COMUNS:" -ForegroundColor Cyan
    Write-Host ""
    
    $commonIssues = @(
        @{
            pattern = "MissingPluginException"
            issue = "Plugin faltando"
            fix = "flutter pub get"
        },
        @{
            pattern = "Gradle|gradle"
            issue = "Problema com Gradle (Android)"
            fix = "flutter clean && flutter pub get"
        },
        @{
            pattern = "CocoaPods|pod"
            issue = "Problema com CocoaPods (iOS)"
            fix = "flutter clean && flutter pub get"
        },
        @{
            pattern = "SUPABASE|Supabase"
            issue = "Erro de inicialização Supabase"
            fix = "Verificar .env e credentials"
        },
        @{
            pattern = "RLS|Row Level Security"
            issue = "Problema com RLS Policies"
            fix = "Aplicar migration: 20260224120000_add_rls_patches.sql"
        }
    )

    $issuesFound = $false
    foreach ($issue in $commonIssues) {
        if ($allOutput -match $issue.pattern) {
            Write-Host "   🔴 Detectado: $($issue.issue)" -ForegroundColor Red
            Write-Host "      → Tente: $($issue.fix)" -ForegroundColor Yellow
            Write-Host ""
            $issuesFound = $true
        }
    }

    if (-not $issuesFound -and -not ($allOutput -match "error|Error|ERROR")) {
        Write-Host "   ✅ Nenhum problema comum detectado!" -ForegroundColor Green
        Write-Host ""
    }

    # Assistência interativa
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "🛠️  PRÓXIMOS PASSOS:" -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1️⃣  Verifique Chrome/emulador aberto"
    Write-Host "2️⃣  Se houver erros, Copie-os abaixo"
    Write-Host "3️⃣  Pressione Ctrl+C para parar this script"
    Write-Host "4️⃣  Execute: .\ANALYZE_AND_FIX_ERRORS.ps1"
    Write-Host ""

} catch {
    Write-Error "❌ Erro ao iniciar Flutter: $_"
}

Pop-Location
