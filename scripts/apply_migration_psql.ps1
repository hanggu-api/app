<#
PowerShell helper to apply a SQL migration using psql.
Usage: run the script and paste the Postgres connection string when prompted.
Do NOT paste credentials into public channels.
#>
[CmdletBinding()]
param(
    [string]$ConnectionString
)

$RepoRoot = Split-Path -Parent $PSScriptRoot
$SqlFile = Join-Path $RepoRoot 'supabase\migrations\20260224120000_add_rls_patches.sql'
if (-not (Test-Path $SqlFile)) {
    Write-Error "SQL file not found: $SqlFile"
    Write-Host "Checked paths:" -NoNewline; Write-Host "`n - $SqlFile`n - $PSScriptRoot\supabase\migrations\20260224120000_add_rls_patches.sql"
    exit 1
}

$psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlCmd) {
    Write-Error "`n'psql' not found in PATH. Install PostgreSQL client tools or put 'psql' in PATH.`nSee: https://www.postgresql.org/download/"
    # Offer supabase CLI fallback info
    $supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
    if ($supabaseCmd) {
        Write-Host "Supabase CLI available. You can run: supabase db connect  (then inside psql) and run:\n\i $SqlFile"
    }
    exit 2
}

if (-not $ConnectionString) {
    $ConnectionString = Read-Host -Prompt 'Paste your Postgres connection string (postgres://USER:PASS@HOST:PORT/DB)'
}

# Mask password for display
$masked = $ConnectionString -replace '(postgres:\/\/[^:]+):[^@]+@', '$1:*****@'
Write-Host "Using connection: $masked"

try {
    & psql -d $ConnectionString -f $SqlFile
    $code = $LASTEXITCODE
    if ($code -ne 0) {
        Write-Error "psql exited with code $code"
        exit $code
    }
    Write-Host "Migration applied successfully." -ForegroundColor Green
} catch {
    Write-Error "Error running psql: $_"
    exit 1
}
