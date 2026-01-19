# Simplified Test Script
# Uses the test endpoint to bypass authentication

$API_BASE = "https://projeto-central-backend.carrobomebarato.workers.dev/api"
$TEST_SECRET = "test-secret-2024"

Write-Host "🚀 Running Simplified Backend Tests" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Test 1: Create Service (using test endpoint)
Write-Host "`n📋 Test 1: Creating test service..." -ForegroundColor Yellow

$serviceBody = @{
    profession_id = 1
    description   = "Teste automatizado - Instalação elétrica"
    latitude      = -15.7942
    longitude     = -47.8822
    address       = "Brasília, DF"
    client_id     = 531  # Replace with your test client ID
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_BASE/test/create-service" `
        -Method POST `
        -Headers @{
        "Content-Type"  = "application/json"
        "X-Test-Secret" = $TEST_SECRET
    } `
        -Body $serviceBody

    $serviceId = $response.service_id
    Write-Host "✅ Service created: $serviceId" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to create service: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Approve upfront payment
Write-Host "`n📋 Test 2: Approving upfront payment..." -ForegroundColor Yellow

$paymentBody = @{
    service_id = $serviceId
    type       = "upfront"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$API_BASE/test/force-payment-approval" `
        -Method POST `
        -Headers @{
        "Content-Type"  = "application/json"
        "X-Test-Secret" = $TEST_SECRET
    } `
        -Body $paymentBody

    Write-Host "✅ Upfront payment approved" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to approve payment: $_" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 2

# Test 3: Check service status
Write-Host "`n📋 Test 3: Checking service status..." -ForegroundColor Yellow

try {
    $service = Invoke-RestMethod -Uri "$API_BASE/services/$serviceId" `
        -Headers @{
        "X-Test-Secret" = $TEST_SECRET
    }

    Write-Host "✅ Service status: $($service.service.status)" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to get service: $_" -ForegroundColor Red
    exit 1
}

# Test 4: Force dispatch
Write-Host "`n📋 Test 4: Forcing dispatch..." -ForegroundColor Yellow

try {
    Invoke-RestMethod -Uri "$API_BASE/test/force-dispatch/$serviceId" `
        -Method POST `
        -Headers @{
        "X-Test-Secret" = $TEST_SECRET
    }

    Write-Host "✅ Dispatch forced" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Dispatch may have failed (this is OK if no providers available)" -ForegroundColor Yellow
}

Write-Host "`n====================================" -ForegroundColor Cyan
Write-Host "✅ Basic tests completed!" -ForegroundColor Green
Write-Host "Service ID: $serviceId" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Check service in the app" -ForegroundColor White
Write-Host "2. Test provider acceptance manually" -ForegroundColor White
Write-Host "3. Complete the full flow" -ForegroundColor White
