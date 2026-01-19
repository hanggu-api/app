# Script para simular criação de serviço REAL (Fluxo do Cliente)

$body = @{
    category_id     = 6 # Geral (ID correto da tabela service_categories)
    description     = "Preciso de um chaveiro urgente - Porta emperrada"
    latitude        = -5.5059831
    longitude       = -47.4534962
    address         = "Rua Tocantins, Imperatriz - MA"
    price_estimated = 120.00
    price_upfront   = 0.00
    location_type   = "client_address"
    profession      = "Chaveiro" # String matching profession name
    scheduled_at    = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
} | ConvertTo-Json

Write-Host "🚀 Enviando solicitação de serviço REAL..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Method Post `
        -Uri "https://projeto-central-backend.carrobomebarato.workers.dev/api/services" `
        -ContentType "application/json" `
        -Body $body

    Write-Host "✅ Serviço Criado com Sucesso!" -ForegroundColor Green
    Write-Host "🆔 Service ID: $($response.service.id)" -ForegroundColor Yellow
    Write-Host "📄 Status: $($response.service.status)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔔 Se tudo estiver correto, seu celular deve tocar AGORA!" -ForegroundColor Magenta
}
catch {
    Write-Host "❌ Erro ao criar serviço:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            Write-Host $reader.ReadToEnd()
        }
        catch {
            Write-Host "Detalhes do erro não disponíveis."
        }
    }
}
