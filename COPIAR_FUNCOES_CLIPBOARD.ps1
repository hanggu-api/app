# 🚀 HELPER - COPIAR ARQUIVOS PARA CLIPBOARD AUTOMATICAMENTE

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   COPIAR EDGE FUNCTIONS PARA CLIPBOARD                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$functions = @(
    @{ name = "ai-classify"; desc = "Classificação de serviços com IA" },
    @{ name = "config"; desc = "Carregamento de configurações" },
    @{ name = "geo"; desc = "Serviços de geolocalização" },
    @{ name = "strings"; desc = "Carregamento de strings/traduções" },
    @{ name = "theme"; desc = "Carregamento de tema" },
    @{ name = "dispatch"; desc = "Dispatch de provedores para serviços" },
    @{ name = "location"; desc = "Gerenciamento de localização" },
    @{ name = "payments"; desc = "Processamento de pagamentos" },
    @{ name = "push-notifications"; desc = "Notificações push" }
)

Write-Host "Escolha qual função copiar:" -ForegroundColor Yellow
Write-Host ""

for ($i = 0; $i -lt $functions.Count; $i++) {
    $num = $i + 1
    Write-Host "$num. $($functions[$i].name) - $($functions[$i].desc)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Para copiar todas de uma vez, digite:" -ForegroundColor Cyan
Write-Host "   a" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para copiar uma específica, digite o número (1-9):" -ForegroundColor Cyan
Write-Host "   1" -ForegroundColor Yellow
Write-Host ""

$choice = Read-Host "Escolha"
Write-Host ""

if ($choice -eq "a") {
    Write-Host "📋 Copiando TODAS as funções em sequência..." -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($func in $functions) {
        $file = "supabase\functions\$($func.name)\index.ts"
        if (Test-Path $file) {
            $content = Get-Content $file -Raw
            Set-Clipboard -Value $content
            Write-Host "✅ $($func.name) - Copiado para clipboard!" -ForegroundColor Green
            Write-Host "   Cole em: https://app.supabase.com/projects/mroesvsmylnaxelrhqtl/functions/$($func.name)" -ForegroundColor Gray
            Write-Host ""
            
            $resp = Read-Host "   Colou no Dashboard? (s para próxima, n para parar)"
            if ($resp -eq "n") {
                break
            }
        } else {
            Write-Host "❌ $($func.name) - Arquivo não encontrado!" -ForegroundColor Red
        }
    }
} else {
    $idx = [int]$choice - 1
    if ($idx -ge 0 -and $idx -lt $functions.Count) {
        $func = $functions[$idx]
        $file = "supabase\functions\$($func.name)\index.ts"
        
        if (Test-Path $file) {
            $content = Get-Content $file -Raw
            Set-Clipboard -Value $content
            
            Write-Host "✅ $($func.name) - Copiado para clipboard!" -ForegroundColor Green
            Write-Host ""
            Write-Host "📋 Próximas ações:" -ForegroundColor Cyan
            Write-Host "1. Abra: https://app.supabase.com/projects/mroesvsmylnaxelrhqtl/functions/$($func.name)" -ForegroundColor Gray
            Write-Host "2. Clique em 'Deploy'" -ForegroundColor Gray
            Write-Host "3. Cole o código (Ctrl+V)" -ForegroundColor Gray
            Write-Host "4. Clique em 'Deploy'" -ForegroundColor Gray
            Write-Host ""
        } else {
            Write-Error "Arquivo não encontrado: $file"
        }
    } else {
        Write-Error "Opção inválida!"
    }
}

Write-Host ""
write-host "Após terminar, execute: .\RUN_WITH_ERROR_CAPTURE.ps1" -ForegroundColor Green
Write-Host ""
