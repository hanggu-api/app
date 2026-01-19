$body = @{
    professionId = 3736
    title        = "Teste Chaveiro"
    description  = "Preciso abrir porta"
    price        = 50.00
    latitude     = "-23.550520"
    longitude    = "-46.633308"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
    -Uri "https://projeto-central-backend.carrobomebarato.workers.dev/api/test/create-service-and-notify" `
    -ContentType "application/json" `
    -Body $body | ConvertTo-Json -Depth 10

Write-Host ""
Write-Host "✅ Notificação enviada para chave@gmail.com!" -ForegroundColor Green
Write-Host "📱 Verifique o celular agora!" -ForegroundColor Yellow
