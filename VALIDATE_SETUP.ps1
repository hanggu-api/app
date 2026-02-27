# Validação pré-launch: app 100% pronto?

Write-Host "🔍 Checando app 101 Service..." -ForegroundColor Cyan

$check = @()

# 1. .env
if (Test-Path "mobile_app\.env") {
    $env_ok = (Get-Content "mobile_app\.env" | Select-String "SUPABASE_URL|SUPABASE_ANON_KEY").Count -eq 2
    $check += @{name=".env"; ok=$env_ok}
} else {
    $check += @{name=".env"; ok=$false}
}

# 2. pubspec.yaml
if (Test-Path "mobile_app\pubspec.yaml") {
    $pubspec_ok = (Get-Content "mobile_app\pubspec.yaml" | Select-String "supabase_flutter|firebase_core").Count -ge 2
    $check += @{name="pubspec.yaml (deps)"; ok=$pubspec_ok}
}

# 3. Supabase migrations
$migCount = @(Get-ChildItem "supabase\migrations\*.sql" -ErrorAction SilentlyContinue).Count
$check += @{name="Migrations ($migCount)"; ok=($migCount -gt 10)}

# 4. Edge Functions
$funcCount = @(Get-ChildItem "supabase\functions\*" -Directory -ErrorAction SilentlyContinue | Where-Object {$_.Name -notin @('_shared', 'node_modules')}).Count
$check += @{name="Edge Functions ($funcCount)"; ok=($funcCount -ge 4)}

# 5. Flutter entry point
$mainExists = Test-Path "mobile_app\lib\main.dart"
$check += @{name="main.dart"; ok=$mainExists}

# 6. Supabase config
$supConfig = Test-Path "mobile_app\lib\core\config\supabase_config.dart"
$check += @{name="supabase_config.dart"; ok=$supConfig}

# 7. CLI tools
$flutter = Get-Command flutter -ErrorAction SilentlyContinue
$check += @{name="Flutter CLI"; ok=($null -ne $flutter)}

# Print results
Write-Host ""
foreach ($item in $check) {
    $icon = if ($item.ok) { "✅" } else { "❌" }
    Write-Host "$icon $($item.name)" -ForegroundColor $(if ($item.ok) { 'Green' } else { 'Red' })
}

$allOk = @($check | Where-Object {$_.ok -eq $false}).Count -eq 0
Write-Host ""
if ($allOk) {
    Write-Host "🎉 App 100% pronto! Execute: .\RUN_APP.ps1" -ForegroundColor Green
} else {
    Write-Host "⚠️  Alguns itens faltam. Revise acima." -ForegroundColor Yellow
}
