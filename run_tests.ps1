# Automated Test Runner (PowerShell)
# Runs both backend and frontend tests

Write-Host "🚀 Starting Automated Test Suite" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Test results
$backendPassed = $false
$frontendPassed = $false

# 1. Backend Tests
Write-Host ""
Write-Host "📋 Running Backend Tests..." -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow

Set-Location backend
node test_automated_flow.js

if ($LASTEXITCODE -eq 0) {
    $backendPassed = $true
    Write-Host "✅ Backend tests passed" -ForegroundColor Green
} else {
    Write-Host "❌ Backend tests failed" -ForegroundColor Red
}

# 2. Frontend Integration Tests
Write-Host ""
Write-Host "📱 Running Flutter Integration Tests..." -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow

Set-Location ..\mobile_app

# Check if emulator is running
$emulatorRunning = adb devices | Select-String "emulator"
if (-not $emulatorRunning) {
    Write-Host "⚠️  No emulator detected. Please start an emulator first." -ForegroundColor Yellow
    Write-Host "Run: emulator -avd Pixel_5_API_31" -ForegroundColor Yellow
    exit 1
}

# Run integration tests
flutter test integration_test/service_flow_test.dart

if ($LASTEXITCODE -eq 0) {
    $frontendPassed = $true
    Write-Host "✅ Frontend tests passed" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend tests failed" -ForegroundColor Red
}

# 3. Test Summary
Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

if ($backendPassed) {
    Write-Host "✅ Backend Tests" -ForegroundColor Green
} else {
    Write-Host "❌ Backend Tests" -ForegroundColor Red
}

if ($frontendPassed) {
    Write-Host "✅ Frontend Tests" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend Tests" -ForegroundColor Red
}

Write-Host ""

# Exit with error if any test failed
if ($backendPassed -and $frontendPassed) {
    Write-Host "🎉 All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Some tests failed" -ForegroundColor Red
    exit 1
}
