param(
  [string]$Base = 'https://cardapyia.com/api',
  [int]$Clients = 1000,
  [int]$Providers = 200,
  [int]$ServicesPerClient = 10,
  [int]$MessagesPerService = 10,
  [int]$IntervalSeconds = 60
)

$ErrorActionPreference = 'Stop'

function Json($o){ return (ConvertTo-Json $o -Compress) }
function Log($msg){ Write-Host ("[" + (Get-Date).ToString('HH:mm:ss') + "] " + $msg) }

$clientsList = @(); $providersList = @(); $servicesList = @()

function RegisterUser($role){
  $stamp = (Get-Date).ToString('yyyyMMddHHmmss')
  $suffix = (Get-Random -Minimum 100000 -Maximum 999999)
  $name = if ($role -eq 'client') { "Cliente $stamp" } else { "Prestador $stamp" }
  $email = if ($role -eq 'client') { "cliente+$stamp+$suffix@cardapyia.com" } else { "prestador+$stamp+$suffix@cardapyia.com" }
  $body = @{ email=$email; password='Test@12345'; name=$name; role=$role; phone=('555' + (Get-Random -Minimum 10000000 -Maximum 99999999)) } | ConvertTo-Json
  $res = Invoke-RestMethod -Uri "$Base/auth/register" -Method POST -ContentType 'application/json' -Body $body
  return @{ id = $res.user.id; email = $email; token = $res.token }
}

function CreateService($client){
  $lat = -23.55 + (Get-Random -Minimum 0 -Maximum 0.02)
  $lng = -46.63 + (Get-Random -Minimum 0 -Maximum 0.02)
  $priceEst = 80 + (Get-Random -Minimum 0 -Maximum 250)
  $priceUp = [Math]::Round($priceEst * 0.25)
  $desc = "Serviço " + (Get-Random -Minimum 1000 -Maximum 9999) + " descrição detalhada"
  $payload = @{ category_id = ((Get-Random -Minimum 1 -Maximum 6)); description = $desc; latitude = $lat; longitude = $lng; address = "Rua Random, 123"; price_estimated = $priceEst; price_upfront = $priceUp } | ConvertTo-Json
  $create = Invoke-RestMethod -Uri "$Base/services" -Method POST -Headers @{ Authorization = "Bearer $($client.token)" } -ContentType 'application/json' -Body $payload
  return @{ id = $create.id; clientId = $client.id }
}

function AcceptService($svc){
  $prov = $providersList[(Get-Random -Minimum 0 -Maximum $providersList.Count)]
  if (-not $prov) { return $null }
  $resp = Invoke-RestMethod -Uri "$Base/services/$($svc.id)/accept" -Method POST -Headers @{ Authorization = "Bearer $($prov.token)" } -ContentType 'application/json' -Body '{}'
  return $prov
}

Add-Type -AssemblyName System.Drawing
function MakePng($sid){
  $tmp = [System.IO.Path]::GetTempPath(); $path = Join-Path $tmp ("chat-" + $sid + ".png")
  $bmp = New-Object System.Drawing.Bitmap 2,2
  $bmp.SetPixel(0,0,[System.Drawing.Color]::Red)
  $bmp.SetPixel(1,1,[System.Drawing.Color]::Blue)
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  return $path
}

function SendMessages($svc){
  $client = ($clientsList | Where-Object { $_.id -eq $svc.clientId })
  $prov = $providersList[(Get-Random -Minimum 0 -Maximum $providersList.Count)]
  for ($m=1; $m -le $MessagesPerService; $m++) {
    $isClient = ($m % 2 -eq 1)
    $sender = if ($isClient) { $client } else { $prov }
    $headers = @{ Authorization = "Bearer $($sender.token)" }
    if ($m -eq $MessagesPerService) {
      $pngPath = MakePng $svc.id
      try {
        $form = @{ file = (Get-Item $pngPath); serviceId = $svc.id }
        $up = Invoke-RestMethod -Uri "$Base/media/chat/image" -Method POST -Headers $headers -Form $form
        $payload = @{ content = $up.key; type = 'image' } | ConvertTo-Json
        Invoke-RestMethod -Uri "$Base/chat/$($svc.id)" -Method POST -Headers $headers -ContentType 'application/json' -Body $payload | Out-Null
      } catch {
        $payload = @{ content = "Falha upload imagem"; type = 'text' } | ConvertTo-Json
        Invoke-RestMethod -Uri "$Base/chat/$($svc.id)" -Method POST -Headers $headers -ContentType 'application/json' -Body $payload | Out-Null
      } finally { if (Test-Path $pngPath) { Remove-Item $pngPath -Force } }
    } else {
      $payload = @{ content = ("Mensagem " + $m + " serviço " + $svc.id); type = 'text' } | ConvertTo-Json
      Invoke-RestMethod -Uri "$Base/chat/$($svc.id)" -Method POST -Headers $headers -ContentType 'application/json' -Body $payload | Out-Null
    }
  }
}

Log "Iniciando teste de carga: $Clients clientes, $Providers prestadores, $ServicesPerClient serviços/cliente, $MessagesPerService msgs/serviço"

while ($true) {
  try {
    # Registra lote de clientes
    $toCreateClients = [Math]::Min(20, $Clients - $clientsList.Count)
    for ($i=0; $i -lt $toCreateClients; $i++) { $c = RegisterUser 'client'; $clientsList += $c }
    if ($toCreateClients -gt 0) { Log ("Criados clientes: " + $toCreateClients + " (total " + $clientsList.Count + ")") }

    # Registra lote de prestadores
    $toCreateProviders = [Math]::Min(5, $Providers - $providersList.Count)
    for ($j=0; $j -lt $toCreateProviders; $j++) { $p = RegisterUser 'provider'; $providersList += $p }
    if ($toCreateProviders -gt 0) { Log ("Criados prestadores: " + $toCreateProviders + " (total " + $providersList.Count + ")") }

    # Cria serviços para novos clientes (ou recicla se já atingiu alvo)
    $clientsForServices = $clientsList | Select-Object -Last ([Math]::Min($toCreateClients, 20))
    foreach ($client in $clientsForServices) {
      $existingCount = ($servicesList | Where-Object { $_.clientId -eq $client.id }).Count
      $toMake = [Math]::Min($ServicesPerClient - $existingCount, 10)
      for ($k=0; $k -lt $toMake; $k++) {
        $svc = CreateService $client; $servicesList += $svc
        $prov = AcceptService $svc
        SendMessages $svc
      }
    }

    Log ("Resumo: clientes=" + $clientsList.Count + " prestadores=" + $providersList.Count + " serviços=" + $servicesList.Count)
  } catch {
    Log ("Erro no ciclo: " + $_.Exception.Message)
  }

  Start-Sleep -Seconds $IntervalSeconds
}