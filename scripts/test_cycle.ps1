
# Script de Ciclo de Testes Automatizado
# Executa: Deploy Web -> Deploy Firebase (App Distribution) -> Atualiza Emulador
# Backend assume-se ONLINE (Vercel)

$ErrorActionPreference = "Stop"

function Write-Step {
    param($msg)
    Write-Host "`n========================================================" -ForegroundColor Cyan
    Write-Host "$msg" -ForegroundColor Cyan
    Write-Host "========================================================`n"
}

# 1. Setup
$projectRoot = "C:\Users\thela\.gemini\antigravity\scratch\projeto_figma_app"
$mobileDir = "$projectRoot\mobile_app"

Set-Location $mobileDir

# 2. Deploy Web
Write-Step "1. Building & Deploying Web (Firebase Hosting)..."
try {
    # flutter build web --release
    # firebase deploy --only hosting
    # For speed in testing, we might just build. But user asked to deploy.
    Write-Host "Building Web..."
    flutter build web --release
    Write-Host "Deploying to Firebase Hosting..."
    firebase deploy --only hosting
} catch {
    Write-Host "Erro no Deploy Web: $_" -ForegroundColor Red
    # Continue anyway? No, user wants the cycle.
}

# 3. Send App to Firebase (App Distribution)
Write-Step "2. Sending Android App to Firebase App Distribution..."
try {
    Write-Host "Building APK..."
    flutter build apk --release
    
    # Check if firebase-tools is authenticated/ready
    # We use the App ID found in google-services.json: 1:478559853980:android:e99a1e14b2d7ebfbcc7c59
    Write-Host "Uploading to App Distribution..."
    firebase appdistribution:distribute build/app/outputs/flutter-apk/app-release.apk --app 1:478559853980:android:e99a1e14b2d7ebfbcc7c59 --groups testers
} catch {
    Write-Host "Erro ao enviar para Firebase App Distribution (verifique login/setup): $_" -ForegroundColor Yellow
    Write-Host "Continuando para o emulador..."
}

# 4. Run Emulator
Write-Step "3. Running on Emulator (Updates Local App)..."
# We use a new terminal or current? 
# The user wants "atualizar o emulador". 
# If an emulator is running, flutter run usually installs the new APK.
# We will launch it in a separate window or detached if possible, but 'flutter run' is interactive.
# Since this is a script, maybe we just install it?
# 'flutter install' installs the built APK.
Write-Host "Instalando APK atualizado no emulador..."
flutter install -d emulator-5554

# If user wants to see logs/hot reload, they should use the interactive terminal.
# But the script ends here.
Write-Host "Ciclo de Teste Concluído!" -ForegroundColor Green
