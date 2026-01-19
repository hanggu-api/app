$envPath = ".env"
$serviceAccountPath = "serviceAccountKey.json"
$credentialsPath = "credentials.json"

function Add-VercelEnv {
    param(
        [string]$key,
        [string]$value,
        [string]$target = "production"
    )
    
    if ([string]::IsNullOrWhiteSpace($value)) {
        Write-Host "Skipping empty value for $key"
        return
    }

    Write-Host "Setting $key for $target..."
    # Check if exists (simplified: just try to remove first to ensure update)
    vercel env rm $key $target --yes *>$null
    
    # Pipe value to vercel env add
    # Note: PowerShell piping needing care with encoding might be an issue, 
    # but Vercel CLI usually accepts text. 
    # Use ascii encoding to avoid BOM issues if possible, or simple Write-Output.
    $value | vercel env add $key $target 
}

# 1. Parse .env
Write-Host "Reading .env..."
Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if ($line -notmatch "^#" -and $line -match "=") {
        $parts = $line -split "=", 2
        $key = $parts[0].Trim()
        $val = $parts[1].Trim()
        
        # Strip quotes if present
        if ($val -match '^"(.*)"$') { $val = $matches[1] }
        elseif ($val -match "^'(.*)'$") { $val = $matches[1] }
        
        # Skip special large text handled separately logic if needed, 
        # but for now assume .env has standard vars
        if ($key -ne "API_BASE_URL") {
            # Skip dynamic ones if we want to force valid one
            Add-VercelEnv -key $key -value $val
        }
    }
}

# 2. JSON Files
if (Test-Path $serviceAccountPath) {
    $content = Get-Content $serviceAccountPath -Raw
    # Minify JSON to avoid whitespace issues
    $content = ($content | ConvertFrom-Json) | ConvertTo-Json -Depth 100 -Compress
    Add-VercelEnv -key "FIREBASE_SERVICE_ACCOUNT" -value $content
}

if (Test-Path $credentialsPath) {
    $content = Get-Content $credentialsPath -Raw
    $content = ($content | ConvertFrom-Json) | ConvertTo-Json -Depth 100 -Compress
    Add-VercelEnv -key "GOOGLE_CREDENTIALS_JSON" -value $content
}

Write-Host "Environment Variables Update Complete."
