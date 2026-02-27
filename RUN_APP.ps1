#!/usr/bin/env powershell
# Rodar app Flutter com Supabase remoto 100%

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# 1. Checar .env
$envFile = Join-Path $PSScriptRoot "mobile_app" ".env"
if (-not (Test-Path $envFile)) {
    Write-Error ".env não encontrado em $envFile"
    exit 1
}

$envContent = Get-Content $envFile
if ($envContent -match "SUPABASE_URL" -and $envContent -match "SUPABASE_ANON_KEY") {
    Write-Host "✅ .env configurado com Supabase" -ForegroundColor Green
} else {
    Write-Error ".env sem SUPABASE_URL ou SUPABASE_ANON_KEY"
    exit 1
}

# 2. Flutter pub get
Write-Host "Baixando dependências..." -ForegroundColor Cyan
Set-Location (Join-Path $PSScriptRoot "mobile_app")
flutter pub get

if ($LASTEXITCODE -ne 0) {
    Write-Error "flutter pub get falhou"
    exit 1
}

# 3. Rodar app
Write-Host "Iniciando app Flutter..." -ForegroundColor Cyan
# Detecta device disponível
$devices = flutter devices 2>$null | Select-String "device|emulator" | Where-Object {$_ -notmatch "no device|no devices found"}

if (-not $devices) {
    Write-Host "Nenhum device encontrado. Opções:" -ForegroundColor Yellow
    Write-Host "- Android: abra Android Studio ou `adb devices` para emulador"
    Write-Host "- iOS: use Xcode ou `flutter run -d macos`"
    Write-Host "- Web: `flutter run -d chrome`"
    exit 0
}

Write-Host "Devices detectados:" -ForegroundColor Cyan
Write-Host $devices

# Run para primeiro device (usar -d para especificar)
flutter run

exit $LASTEXITCODE
