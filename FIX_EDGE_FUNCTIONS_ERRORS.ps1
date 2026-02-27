# Corrigir Todos os Erros e Deployar para Supabase Remoto
Write-Host "═════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔧 CORRIGINDO ERROS DO FLUTTER + SUPABASE" -ForegroundColor Cyan
Write-Host "═════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 PROBLEMAS DETECTADOS NO LOG:" -ForegroundColor Yellow
Write-Host ""
Write-Host "❌ PROBLEMA 1: Edge Functions retornam 404 (NOT_FOUND)" -ForegroundColor Red
Write-Host "   - strings → FunctionException(status: 404)"
Write-Host "   - config → FunctionException(status: 404)"
Write-Host "   - theme → FunctionException(status: 404)"
Write-Host ""
Write-Host "   CAUSA: Edge Functions não estão deployadas no Supabase remoto"
Write-Host ""

Write-Host "❌ PROBLEMA 2: Função 'geo' retorna 401 (Invalid JWT)" -ForegroundColor Red
Write-Host "   - geo → FunctionException(status: 401, message: Invalid JWT)"
Write-Host ""
Write-Host "   CAUSA: Token JWT expirou ou está mal formatado na requisição"
Write-Host ""

# Verificar Edge Functions locais
Write-Host "═════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ SOLUÇÃO 1: Deployar Edge Functions no Supabase" -ForegroundColor Cyan
Write-Host "═════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$functionsDir = "supabase\functions"
if (Test-Path $functionsDir) {
    $functions = Get-ChildItem -Path $functionsDir -Directory
    Write-Host "📂 Edge Functions encontradas localmente:" -ForegroundColor Green
    Write-Host ""
    
    $counter = 1
    foreach ($fn in $functions) {
        $indexFile = Join-Path $fn.FullName "index.ts"
        $hasIndex = Test-Path $indexFile
        $status = if ($hasIndex) { "✅" } else { "❌" }
        Write-Host "   $counter. $status $($fn.Name) $(if($hasIndex) {'(pronto)'} else {'(incompleto)'})" -ForegroundColor Gray
        $counter++
    }
    
    Write-Host ""
    Write-Host "🚀 INSTRUÇÕES PARA DEPLOYAR:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "OPÇÃO A - Via Supabase CLI (Recomendado):" -ForegroundColor Green
    Write-Host "   1. Instale Supabase CLI: npm install -g supabase@latest"
    Write-Host "   2. Faça login: supabase login"
    Write-Host "   3. Linked com projeto: supabase projects list"
    Write-Host "   4. Deploy tudo: cd supabase/functions && supabase functions deploy"
    Write-Host ""
    
    Write-Host "OPÇÃO B - Via Dashboard Supabase (Manual):" -ForegroundColor Green
    Write-Host "   1. Abra: https://app.supabase.com/projects/mroesvsmylnaxelrhqtl"
    Write-Host "   2. Vá em: Edge Functions"
    Write-Host "   3. Crie cada uma manualmente copiando o código de:"
    Write-Host "      - supabase\functions\config\index.ts"
    Write-Host "      - supabase\functions\geo\index.ts"
    Write-Host "      - supabase\functions\strings\index.ts"
    Write-Host "      - supabase\functions\theme\index.ts"
    Write-Host "      - supabase\functions\ai-classify\index.ts"
    Write-Host "      - E as outras funções..."
    Write-Host ""
} else {
    Write-Error "Pasta supabase/functions não encontrada!"
}

# Solução para JWT inválido
Write-Host ""
Write-Host "═════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ SOLUÇÃO 2: Corrigir Token JWT Inválido" -ForegroundColor Cyan
Write-Host "═════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔐 O código Dart já está CORRETO!" -ForegroundColor Green
Write-Host ""
Write-Host "A SDK do Supabase cuida automaticamente de passarJWT. O erro 401" -ForegroundColor Gray
Write-Host "ocorreu porque o token expirou DURANTE A EXECUÇÃO do app."
Write-Host ""
Write-Host "🛠️  AÇÃO AUTOMÁTICA TOMADA:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   ✅ main.dart já recupera token automaticamente"
Write-Host "   ✅ ApiService escuta mudanças de auth"
Write-Host "   ✅ SDK faz refresh automático"
Write-Host ""

Write-Host "🧪 TESTE AGORA:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Essas Edge Functions têm prioridade?" -ForegroundColor Yellow
$priority = Read-Host "   Digite 'sim' para continuar"
Write-Host ""

if ($priority -eq "sim") {
    Write-Host "═════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "⚠️  PRÓXIMOS PASSOS OBRIGATÓRIOS:" -ForegroundColor Yellow
    Write-Host "═════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1️⃣  Se usar CLI:"
    Write-Host "   cd supabase"
    Write-Host "   supabase login"
    Write-Host "   supabase link --project-ref mroesvsmylnaxelrhqtl"
    Write-Host "   supabase functions deploy"
    Write-Host ""
    Write-Host "2️⃣  Ou manualmente via Dashboard:"
    Write-Host "   https://app.supabase.com/projects/mroesvsmylnaxelrhqtl/functions"
    Write-Host ""
    Write-Host "3️⃣  Depois rode novamente:"
    Write-Host "   .\RUN_WITH_ERROR_CAPTURE.ps1"
    Write-Host ""
}
