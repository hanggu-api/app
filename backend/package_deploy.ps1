$ErrorActionPreference = "Stop"

# Itens explícitos para o pacote de deploy
$items = @(
  "dist",
  "package.json",
  "package-lock.json",
  "ecosystem.config.js",
  "serviceAccountKey.json"
)

# Remover zip antigo se existir
if (Test-Path "backend_deploy.zip") {
  Remove-Item "backend_deploy.zip" -Force
}

# Validar itens existentes
$existing = @()
foreach ($i in $items) {
  if (Test-Path $i) {
    $existing += $i
  } else {
    Write-Host "Aviso: item não encontrado -> $i"
  }
}

if ($existing.Count -eq 0) {
  Write-Error "Nenhum item válido encontrado para empacotar."
}

# Criar o zip
Compress-Archive -Path $existing -DestinationPath "backend_deploy.zip" -Force

if (Test-Path "backend_deploy.zip") {
  Write-Host "Arquivo backend_deploy.zip criado com sucesso!"
  Write-Host "Envie este arquivo para o seu servidor VPS."
} else {
  Write-Error "Falha ao criar backend_deploy.zip"
}
