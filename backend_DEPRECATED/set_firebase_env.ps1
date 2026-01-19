# Script to set Firebase Credentials in Vercel
$ErrorActionPreference = "Stop"

$keyFile = "serviceAccountKey.json"

if (!(Test-Path $keyFile)) {
    Write-Error "serviceAccountKey.json not found!"
    exit 1
}

$jsonContent = Get-Content $keyFile -Raw
# Validate JSON and Compress
try {
    $obj = $jsonContent | ConvertFrom-Json
    $compressed = $obj | ConvertTo-Json -Compress -Depth 10
} catch {
    Write-Error "Invalid JSON in serviceAccountKey.json"
    exit 1
}

Write-Host "Configuring Vercel Environment Variables..."

# Function to add env var
function Add-VercelEnv {
    param($env)
    Write-Host "Adding to $env..."
    # Pipe content to vercel env add. 
    # Vercel CLI prompts: "What's the value of <name>?" if not piped.
    # If piped, it reads from stdin.
    $compressed | npx vercel env add FIREBASE_SERVICE_ACCOUNT $env --force
}

# We try/catch because if it exists, it might fail or ask to overwrite.
# 'vercel env add' doesn't support overwrite easily via pipe, we might need 'vercel env rm' first?
# Let's try 'rm' first to be safe.

Write-Host "Removing existing variables (if any)..."
echo "y" | npx vercel env rm FIREBASE_SERVICE_ACCOUNT production 2>$null
echo "y" | npx vercel env rm FIREBASE_SERVICE_ACCOUNT preview 2>$null
echo "y" | npx vercel env rm FIREBASE_SERVICE_ACCOUNT development 2>$null

Write-Host "Adding new variables..."
Add-VercelEnv "production"
Add-VercelEnv "preview"
Add-VercelEnv "development"

Write-Host "✅ Environment variables set."
Write-Host "🚀 Triggering redeploy..."
npx vercel --prod --yes
