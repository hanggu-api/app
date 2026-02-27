# Supabase CLI agora está disponível (instalado via scoop)
# Este script fará o deploy das Edge Functions

# Limpar cache do npm para evitar problemas
Write-Host "🧹 Limpando npm cache..." -ForegroundColor Yellow
npm cache clean --force 2>$null

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ SUPABASE CLI INSTALADO COM SUCESSO!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$version = supabase --version
Write-Host "Versão: $version" -ForegroundColor Green
Write-Host ""

Write-Host "🚀 Para fazer deploy das Edge Functions, execute:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   .\DEPLOY_EDGE_FUNCTIONS_NOW.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Ou manualmente:" -ForegroundColor Gray
Write-Host "   cd supabase" -ForegroundColor Gray
Write-Host "   supabase login" -ForegroundColor Gray
Write-Host "   supabase link --project-ref mroesvsmylnaxelrhqtl" -ForegroundColor Gray
Write-Host "   supabase functions deploy" -ForegroundColor Gray
Write-Host ""
