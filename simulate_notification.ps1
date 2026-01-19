# 🚀 101 Service - Notification Simulator (ADB)
# Este script simula o recebimento de notificações no app para testar modais e sons.
# Requisitos: Celular conectado via ADB ou Emulador rodando.

$adb = "adb"
$pkg = "com.play101.app"

function Show-Menu {
    Clear-Host
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host "   🔥 101 SERVICE - SIMULADOR DE NOTIFICAÇÕES" -ForegroundColor Yellow
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host "--- TESTE DE MODAL (BROADCAST) ---" -ForegroundColor Gray
    Write-Host "1. Simular NOVA OFERTA (30s + Som Chamado)" -ForegroundColor White
    Write-Host "2. Simular PRESTADOR CHEGOU (Modal Cliente)" -ForegroundColor White
    Write-Host "--- TESTE DE NAVEGAÇÃO (DEEP LINK) ---" -ForegroundColor Gray
    Write-Host "3. Abrir CHAT Direto (Deep Link)" -ForegroundColor White
    Write-Host "4. Abrir RASTREAMENTO Direto (Deep Link)" -ForegroundColor White
    Write-Host "5. Sair" -ForegroundColor Red
    Write-Host "==============================================" -ForegroundColor Cyan
}

while ($true) {
    Show-Menu
    $choice = Read-Host "Escolha uma opção"

    switch ($choice) {
        "1" {
            Write-Host "🚀 Enviando Oferta de Serviço (Broadcast)..." -ForegroundColor Green
            & $adb shell am broadcast -a "com.google.android.c2dm.intent.RECEIVE" -p $pkg `
                --es "type" "service.offered" `
                --es "service_id" "123" `
                --es "id" "123" `
                --es "category_name" "Chaveiro 24h" `
                --es "address" "Rua de Simulação ADB, 100" `
                --es "provider_amount" "250.00"
            Write-Host "✅ Comando enviado! (Nota: Algumas versões do Android bloqueiam broadcasts falsos de FCM)."
            Pause
        }
        "2" {
            Write-Host "🏃 Enviando Prestador Chegou (Broadcast)..." -ForegroundColor Green
            & $adb shell am broadcast -a "com.google.android.c2dm.intent.RECEIVE" -p $pkg `
                --es "type" "provider_arrived" `
                --es "service_id" "101" `
                --es "id" "101"
            Pause
        }
        "3" {
            $sid = Read-Host "Digite o ID do serviço para o Chat (ex: 123)"
            Write-Host "💬 Disparando Deep Link de Chat..." -ForegroundColor Green
            & $adb shell am start -W -a android.intent.action.VIEW -d "service101://app/chat/$sid" $pkg
            Pause
        }
        "4" {
            $sid = Read-Host "Digite o ID do serviço para Rastreamento"
            Write-Host "📍 Disparando Deep Link de Tracking..." -ForegroundColor Green
            & $adb shell am start -W -a android.intent.action.VIEW -d "service101://app/tracking/$sid" $pkg
            Pause
        }
        "5" { exit }
    }
}
