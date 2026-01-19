$body = @{
    profession = "Chaveiro"
    latitude   = -5.50567111
    longitude  = -47.45260614
} | ConvertTo-Json

$response = Invoke-RestMethod -Method Post `
    -Uri "https://projeto-central-backend.carrobomebarato.workers.dev/api/test/find-providers" `
    -ContentType "application/json" `
    -Body $body

$response | ConvertTo-Json -Depth 10
