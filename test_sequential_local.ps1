# 🧪 Teste de Escalonamento de Notificações
# Este script registra prestadores fakes e dispara um serviço para testar o DO DispatchManager.

$baseUrl = "http://localhost:8787"

function Log {
    param($msg)
    Write-Host "[TEST] $msg" -ForegroundColor Cyan
}

# 1. Registrar Prestador 1 (Mais próximo)
Log "Registrando Prestador 1 (Próximo)..."
Invoke-RestMethod -Uri "$baseUrl/api/notifications/register-token" -Method Post -Body (@{
        token     = "fake-token-provider-1"
        platform  = "android"
        latitude  = -5.52639
        longitude = -47.49167
    } | ConvertTo-Json) -ContentType "application/json"

# 2. Registrar Prestador 2 (Um pouco mais longe)
Log "Registrando Prestador 2 (Distante)..."
Invoke-RestMethod -Uri "$baseUrl/api/notifications/register-token" -Method Post -Body (@{
        token     = "fake-token-provider-2"
        platform  = "android"
        latitude  = -5.53500
        longitude = -47.50000
    } | ConvertTo-Json) -ContentType "application/json"

# 3. Disparar Serviço
Log "Disparando Serviço de Teste..."
$resp = Invoke-RestMethod -Uri "$baseUrl/api/test/create-service-and-notify" -Method Post -Body (@{
        profession = "Chaveiro"
        latitude   = -5.52600
        longitude  = -47.49100
        price      = 150.00
    } | ConvertTo-Json) -ContentType "application/json"

$serviceId = $resp.serviceId
Log "Serviço Criado: $serviceId. Aguarde os logs do Worker para ver o escalonamento."

# 4. Simular Aceite (Opcional - execute manualmente se quiser testar trava)
Log "Execute para aceitar: Invoke-RestMethod -Uri '$baseUrl/api/services/$serviceId/accept' -Method Post -Headers @{Authorization='Bearer <TOKEN_PRESTADOR>'}"
