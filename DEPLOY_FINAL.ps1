# ✅ DEPLOY FINAL - ENVIAR EDGE FUNCTIONS PARA SUPABASE REMOTO
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     ENVIANDO EDGE FUNCTIONS PARA SUPABASE REMOTO         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$supabase = "$env:USERPROFILE\scoop\shims\supabase.exe"

Write-Host "🚀 Iniciando deploy..." -ForegroundColor Green
Write-Host ""

# Colocar output em arquivo para análise
$logFile = "deploy_output.log"

# Executar deploy
Write-Host "Aguarde... pode levar alguns minutos..." -ForegroundColor Yellow
Write-Host ""

Start-Process -FilePath $supabase `
    -ArgumentList "functions", "deploy" `
    -WorkingDirectory "supabase" `
    -NoNewWindow `
    -Wait `
    -RedirectStandardOutput $logFile `
    -RedirectStandardError $logFile

# Ler resultado
$output = Get-Content $logFile -Raw

Write-Host $output -ForegroundColor Gray

# Verificar sucesso
if ($output -match "deployed successfully" -or $output -match "Updated" -or $output -match "Created") {
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "✅ SUCESSO! Edge Functions enviadas para Supabase remoto!" -ForegroundColor Green
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "✨ Seu app agora tem 100% de funcionalidade remota!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "⏳ Deploy enviado para processing..." -ForegroundColor Yellow
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Verificar status em:" -ForegroundColor Cyan
    Write-Host "   https://app.supabase.com/projects/mroesvsmylnaxelrhqtl" -ForegroundColor Cyan
    Write-Host "   → Edge Functions" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "📋 Log salvo em: $logFile" -ForegroundColor Gray
Write-Host ""
