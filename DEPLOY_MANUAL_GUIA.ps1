# 📋 GUIA COMPLETO - DEPLOY MANUAL VIA SUPABASE DASHBOARD

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   DEPLOY MANUAL - EDGE FUNCTIONS VIA DASHBOARD           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "📝 PASSO A PASSO:" -ForegroundColor Green
Write-Host ""

Write-Host "1️⃣  ABRIR SUPABASE DASHBOARD" -ForegroundColor Yellow
Write-Host "   └─ URL: https://app.supabase.com/projects" -ForegroundColor Gray
Write-Host "   └─ Selecione projeto: mroesvsmylnaxelrhqtl" -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣  IR PARA EDGE FUNCTIONS" -ForegroundColor Yellow
Write-Host "   └─ Menu esquerdo → Edge Functions" -ForegroundColor Gray
Write-Host "   └─ Ou URL direta: https://app.supabase.com/projects/mroesvsmylnaxelrhqtl/functions" -ForegroundColor Gray
Write-Host ""

Write-Host "3️⃣  CRIAR/ATUALIZAR CADA FUNÇÃO" -ForegroundColor Yellow
Write-Host ""
Write-Host "   📁 FUNÇÃO 1: ai-classify" -ForegroundColor Cyan
Write-Host "      1. Clique em 'ai-classify' ou 'Create function'" -ForegroundColor Gray
Write-Host "      2. Abra: supabase\functions\ai-classify\index.ts" -ForegroundColor Gray
Write-Host "      3. Cole TODO o conteúdo em 'Deploy'" -ForegroundColor Gray
Write-Host "      4. Clique em 'Deploy'" -ForegroundColor Gray
Write-Host ""

Write-Host "   📁 FUNÇÃO 2: config" -ForegroundColor Cyan
Write-Host "      1. Repita o processo acima" -ForegroundColor Gray
Write-Host "      2. Arquivo: supabase\functions\config\index.ts" -ForegroundColor Gray
Write-Host ""

Write-Host "   📁 FUNÇÃO 3: geo" -ForegroundColor Cyan
Write-Host "      1. Repita o processo acima" -ForegroundColor Gray
Write-Host "      2. Arquivo: supabase\functions\geo\index.ts" -ForegroundColor Gray
Write-Host ""

Write-Host "   📁 FUNÇÃO 4: strings" -ForegroundColor Cyan
Write-Host "      1. Repita o processo acima" -ForegroundColor Gray
Write-Host "      2. Arquivo: supabase\functions\strings\index.ts" -ForegroundColor Gray
Write-Host ""

Write-Host "   📁 FUNÇÃO 5: theme" -ForegroundColor Cyan
Write-Host "      1. Repita o processo acima" -ForegroundColor Gray
Write-Host "      2. Arquivo: supabase\functions\theme\index.ts" -ForegroundColor Gray
Write-Host ""

Write-Host "   📁 FUNÇÃO 6: dispatch (IMPORTANTE)" -ForegroundColor Cyan
Write-Host "      1. Repita o processo acima" -ForegroundColor Gray
Write-Host "      2. Arquivo: supabase\functions\dispatch\index.ts" -ForegroundColor Gray
Write-Host ""

Write-Host "   📁 FUNÇÃO 7: location" -ForegroundColor Cyan
Write-Host "      1. Repita o processo acima" -ForegroundColor Gray
Write-Host "      2. Arquivo: supabase\functions\location\index.ts" -ForegroundColor Gray
Write-Host ""

Write-Host "   📁 FUNÇÃO 8: payments (IMPORTANTE)" -ForegroundColor Cyan
Write-Host "      1. Repita o processo acima" -ForegroundColor Gray
Write-Host "      2. Arquivo: supabase\functions\payments\index.ts" -ForegroundColor Gray
Write-Host ""

Write-Host "   📁 FUNÇÃO 9: push-notifications" -ForegroundColor Cyan
Write-Host "      1. Repita o processo acima" -ForegroundColor Gray
Write-Host "      2. Arquivo: supabase\functions\push-notifications\index.ts" -ForegroundColor Gray
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "⏱️  TEMPO ESTIMADO: 10-15 minutos" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

Write-Host "4️⃣  VERIFICAR SE FUNCIONOU" -ForegroundColor Green
Write-Host "   └─ Abra a janela do Chrome com o app" -ForegroundColor Gray
Write-Host "   └─ Pressione F12 para abrir DevTools" -ForegroundColor Gray
Write-Host "   └─ Vá em Console" -ForegroundColor Gray
Write-Host "   └─ Os erros 404 devem desaparecer!" -ForegroundColor Gray
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "💡 DICA: COPIAR ARQUIVO AUTOMATICAMENTE" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$funcs = @("ai-classify", "config", "geo", "strings", "theme", "dispatch", "location", "payments", "push-notifications")

foreach ($func in $funcs) {
    $file = "supabase\functions\$func\index.ts"
    if (Test-Path $file) {
        Write-Host "📋 $func" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Para copiar um arquivo para clipboard:" -ForegroundColor Yellow
Write-Host "   Get-Content 'supabase\functions\ai-classify\index.ts' | Set-Clipboard" -ForegroundColor Gray
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ PRÓXIMO PASSO" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Após terminar o deploy manual:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Execute:" -ForegroundColor Yellow
Write-Host "   .\RUN_WITH_ERROR_CAPTURE.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Os erros devem desaparecer!" -ForegroundColor Green
Write-Host ""
