# ✅ DEPLOY MANUAL INTELIGENTE - COPIAR E COLAR AS 4 FUNÇÕES QUE FALTAM

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   DEPLOY DAS 4 FUNÇÕES FALTANDO - MANUAL SIMPLIFICADO    ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "❌ ERROS DETECTADOS:" -ForegroundColor Red
Write-Host ""
Write-Host "   theme    → 404 NOT_FOUND (não deployada)" -ForegroundColor Red
Write-Host "   strings  → 404 NOT_FOUND (não deployada)" -ForegroundColor Red
Write-Host "   config   → 401 Invalid JWT (deployada mas com erro)" -ForegroundColor Red
Write-Host "   geo      → 401 Invalid JWT (deployada mas com erro)" -ForegroundColor Red
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "📋 PROCESSO:" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

$functionsToFix = @(
    @{ name = "theme"; file = "supabase\functions\theme\index.ts" },
    @{ name = "strings"; file = "supabase\functions\strings\index.ts" },
    @{ name = "config"; file = "supabase\functions\config\index.ts" },
    @{ name = "geo"; file = "supabase\functions\geo\index.ts" }
)

$counter = 1
foreach ($fn in $functionsToFix) {
    Write-Host "$counter️⃣  FUNÇÃO: $($fn.name)" -ForegroundColor Cyan
    Write-Host "   ➜ Arquivo: $($fn.file)" -ForegroundColor Gray
    
    if (Test-Path $fn.file) {
        Write-Host "   ✅ Arquivo encontrado" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Arquivo NÃO encontrado" -ForegroundColor Red
    }
    
    Write-Host ""
    $counter++
}

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 INSTRUÇÕES PASSO A PASSO:" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "PARA CADA FUNÇÃO ABAIXO:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Pressione INPUT para copiar a função para clipboard" -ForegroundColor Gray
Write-Host "2. Abra a URL mostrada no navegador" -ForegroundColor Gray
Write-Host "3. Cole (Ctrl+V) e clique em 'Deploy'" -ForegroundColor Gray
Write-Host "4. Digite 's' quando terminar" -ForegroundColor Gray
Write-Host ""

$deployed = 0

foreach ($fn in $functionsToFix) {
    if (-not (Test-Path $fn.file)) {
        Write-Host "⏭️  Pulando $($fn.name) (arquivo não encontrado)" -ForegroundColor Yellow
        continue
    }
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "📁 FUNÇÃO: $($fn.name)" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    
    # Copiar para clipboard
    $content = Get-Content $fn.file -Raw
    Set-Clipboard -Value $content
    Write-Host "✅ Copiado para clipboard!" -ForegroundColor Green
    Write-Host ""
    
    # Mostrar instruções
    Write-Host "📍 URL Dashboard:" -ForegroundColor Yellow
    Write-Host "   https://app.supabase.com/projects/mroesvsmylnaxelrhqtl/functions/$($fn.name)" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "📝 Próximas ações:" -ForegroundColor Yellow
    Write-Host "   1. Abra a URL acima (Ctrl+Click para abrir no navegador)" -ForegroundColor Gray
    Write-Host "   2. Cole o código: Ctrl+V" -ForegroundColor Gray
    Write-Host "   3. Clique em 'Deploy'" -ForegroundColor Gray
    Write-Host "   4. Aguarde terminar (vai mostrar ✅ verde)" -ForegroundColor Gray
    Write-Host ""
    
    $resp = Read-Host "Já colou e deployou? (s/n)"
    if ($resp -eq "s") {
        Write-Host "✅ $($fn.name) Enviada com sucesso!" -ForegroundColor Green
        $deployed++
    } else {
        Write-Host "⏸️  Pulando para próxima..." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ RESUMO" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Funções deployadas: $deployed/4" -ForegroundColor Green
Write-Host ""

if ($deployed -eq 4) {
    Write-Host "🎉 PERFEITO! Todas as 4 funções foram enviadas!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Agora execute:" -ForegroundColor Yellow
    Write-Host "   .\RUN_WITH_ERROR_CAPTURE.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Os erros devem desaparecer! ✨" -ForegroundColor Green
} else {
    Write-Host "⚠️  Algumas funções não foram deployadas" -ForegroundColor Yellow
    Write-Host "   Você pode rodá-lo novamente para completar" -ForegroundColor Yellow
}

Write-Host ""
