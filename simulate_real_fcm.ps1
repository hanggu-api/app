# 🚀 101 Service - Simulador de Notificações REAIS (Firebase)
# Este script dispara notificações verdadeiras via Backend -> Firebase -> Celular.

$backendPath = "c:\Users\thela\.gemini\antigravity\scratch\projeto_figma_app\backend"

function Show-Menu {
    Clear-Host
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host "   📲 101 SERVICE - NOTIFICAÇÕES REAIS (FCM)" -ForegroundColor Yellow
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host "1. Enviar OFERTA REAL (Uber-Style no Celular)" -ForegroundColor White
    Write-Host "2. Enviar MENSAGEM DE CHAT REAL" -ForegroundColor White
    Write-Host "3. Enviar AVISO DE CHEGADA REAL" -ForegroundColor White
    Write-Host "4. Sair" -ForegroundColor Red
    Write-Host "----------------------------------------------"
    Write-Host "Nota: O app deve estar logado no celular/emulador." -ForegroundColor Gray
    Write-Host "==============================================" -ForegroundColor Cyan
}

while ($true) {
    Show-Menu
    $choice = Read-Host "Escolha o cenário que deseja disparar"

    switch ($choice) {
        "1" {
            Write-Host "🔥 Disparando Oferta Real via Backend..." -ForegroundColor Green
            Push-Location $backendPath
            npx ts-node src/scripts/trigger_real_notification.ts offer
            Pop-Location
            Write-Host "✅ Comando enviado ao Firebase!"
            Pause
        }
        "2" {
            Write-Host "💬 Disparando Chat Real via Backend..." -ForegroundColor Green
            Push-Location $backendPath
            npx ts-node src/scripts/trigger_real_notification.ts chat
            Pop-Location
            Pause
        }
        "3" {
            Write-Host "🏃 Disparando Chegada Real via Backend..." -ForegroundColor Green
            Push-Location $backendPath
            npx ts-node src/scripts/trigger_real_notification.ts arrived
            Pop-Location
            Pause
        }
        "4" {
            exit
        }
        Default {
            Write-Host "❌ Opção inválida!" -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
}
