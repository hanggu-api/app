# Aplicar migration ao Supabase remoto via psql
# Você precisa ter a connection string do projeto Supabase

Write-Host "Aplicando migration ao Supabase remoto..." -ForegroundColor Cyan

# Pedir connection string
$connStr = Read-Host "Cole a connection string (postgres://user:pass@host:port/db)"
if (-not $connStr) {
    Write-Host "❌ Connection string vazia. Abra Supabase Dashboard -> Settings -> Database -> Connection string" -ForegroundColor Red
    exit 1
}

$migFile = Join-Path $PSScriptRoot "supabase\migrations\20260224120000_add_rls_patches.sql"
if (-not (Test-Path $migFile)) {
    Write-Error "Migration file not found: $migFile"
    exit 1
}

# Run migration
psql -d $connStr -f $migFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration aplicada com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao aplicar (verifique connection string e permissões)" -ForegroundColor Red
    exit 1
}
