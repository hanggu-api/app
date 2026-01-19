
    # Auto-generated migration runner
    $files = Get-ChildItem "C:\Users\thela\.gemini\antigravity\scratch\projeto_figma_app\backend\scripts\d1_migration" -Filter *.sql | Sort-Object Name
    foreach ($file in $files) {
        Write-Host "Executing $($file.Name)..."
        npx wrangler d1 execute ai-service-db --remote --file "$($file.FullName)" --yes
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error executing $($file.Name)" -ForegroundColor Red
            exit 1
        }
    }
    Write-Host "Migration Complete!" -ForegroundColor Green
  