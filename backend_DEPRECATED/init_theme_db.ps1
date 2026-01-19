# Script PowerShell para Windows - Inicializar DB de Tema

Write-Host "🎨 Inicializando sistema de tema dinâmico..." -ForegroundColor Yellow

# Nome do banco de dados
$DB_NAME = "projeto-central-db"

Write-Host "📊 Criando tabelas..." -ForegroundColor Cyan

# Executar schema SQL
wrangler d1 execute $DB_NAME --file=.\database\theme_schema.sql

Write-Host "✅ Tabelas criadas com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Faça deploy: npm run deploy"
Write-Host "2. Teste endpoints:"
Write-Host "   curl https://projeto-central-backend.carrobomebarato.workers.dev/api/theme/active"
Write-Host "   curl https://projeto-central-backend.carrobomebarato.workers.dev/api/strings/pt-BR"
Write-Host ""
Write-Host "🎉 Sistema configurado!" -ForegroundColor Green
