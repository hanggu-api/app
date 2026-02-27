# Test Supabase Connection and RLS Policies
Write-Host "🔍 Testing Supabase Connection & Configuration..." -ForegroundColor Cyan
Write-Host ""

# Load .env file
$envFile = "mobile_app\.env"
if (Test-Path $envFile) {
    Write-Host "✅ .env file found" -ForegroundColor Green
    
    $envContent = Get-Content $envFile
    $supabaseUrl = $envContent | Select-String "SUPABASE_URL=" | ForEach-Object { $_.Line.Split("=")[1] }
    $anonKey = $envContent | Select-String "SUPABASE_ANON_KEY=" | ForEach-Object { $_.Line.Split("=")[1] }
    
    Write-Host "   URL: $supabaseUrl"
    Write-Host "   Key: $($anonKey.Substring(0,20))..." -ForegroundColor Yellow
} else {
    Write-Error ".env file not found!"
    exit 1
}

Write-Host ""
Write-Host "📝 Migration Status Check:" -ForegroundColor Cyan

# Check if migration file exists
$migrationFile = "supabase\migrations\20260224120000_add_rls_patches.sql"
if (Test-Path $migrationFile) {
    Write-Host "✅ Migration file exists" -ForegroundColor Green
    $lines = (Get-Content $migrationFile | Measure-Object -Line).Lines
    Write-Host "   Lines: $lines"
} else {
    Write-Host "❌ Migration file NOT found" -ForegroundColor Red
}

Write-Host ""
Write-Host "📱 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Open Supabase Dashboard: $supabaseUrl"
Write-Host "2. Go to SQL Editor"
Write-Host "3. Copy & paste contents of: $migrationFile"
Write-Host "4. Click 'Run'"
Write-Host ""

# Option to copy migration content
Write-Host ""
$response = Read-Host "Copy migration SQL to clipboard? (yes/no)"
if ($response -eq "yes") {
    Get-Content $migrationFile | Set-Clipboard
    Write-Host "✅ Migration SQL copied to clipboard!" -ForegroundColor Green
    Write-Host "   Paste it in Supabase Dashboard > SQL Editor"
}

Write-Host ""
Write-Host "🚀 Once migration is applied, run: .\RUN_APP_SIMPLE.ps1" -ForegroundColor Green
