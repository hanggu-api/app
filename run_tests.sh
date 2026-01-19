#!/bin/bash

# Automated Test Runner
# Runs both backend and frontend tests

echo "🚀 Starting Automated Test Suite"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
BACKEND_PASSED=false
FRONTEND_PASSED=false

# Function to print colored output
print_status() {
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
    fi
}

# 1. Backend Tests
echo ""
echo "📋 Running Backend Tests..."
echo "=================================="

cd backend
node test_automated_flow.js

if [ $? -eq 0 ]; then
    BACKEND_PASSED=true
    print_status "Backend tests passed" 0
else
    print_status "Backend tests failed" 1
fi

# 2. Frontend Integration Tests
echo ""
echo "📱 Running Flutter Integration Tests..."
echo "=================================="

cd ../mobile_app

# Check if emulator is running
adb devices | grep -q "emulator"
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  No emulator detected. Starting emulator...${NC}"
    emulator -avd Pixel_5_API_31 &
    sleep 30
fi

# Run integration tests
flutter test integration_test/service_flow_test.dart

if [ $? -eq 0 ]; then
    FRONTEND_PASSED=true
    print_status "Frontend tests passed" 0
else
    print_status "Frontend tests failed" 1
fi

# 3. Test Summary
echo ""
echo "=================================="
echo "📊 Test Summary"
echo "=================================="

if [ "$BACKEND_PASSED" = true ]; then
    print_status "Backend Tests" 0
else
    print_status "Backend Tests" 1
fi

if [ "$FRONTEND_PASSED" = true ]; then
    print_status "Frontend Tests" 0
else
    print_status "Frontend Tests" 1
fi

echo ""

# Exit with error if any test failed
if [ "$BACKEND_PASSED" = true ] && [ "$FRONTEND_PASSED" = true ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
