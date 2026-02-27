cd c:\Users\thela\.gemini\antigravity\scratch\projeto_figma_app\mobile_app

flutter pub get
if ($LASTEXITCODE -ne 0) {
  Write-Error "flutter pub get failed"
  exit 1
}

Write-Host "Starting Flutter app..." -ForegroundColor Green
flutter run -d chrome

