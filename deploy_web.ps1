param(
  [switch]$Watch = $false,
  [string]$RepoUrl = 'https://github.com/hanggu-api/web.git',
  [string]$ApiUrl = 'https://cardapyia.com/api'
)

$proj = $PSScriptRoot
$mobile = Join-Path $proj 'mobile_app'
$buildDir = Join-Path $mobile 'build/web'
$deployDir = Join-Path $proj 'web_deploy'
$files = @('flutter_bootstrap.js','flutter_service_worker.js','main.dart.js')

function Invoke-BuildAndDeploy {
  Set-Location $mobile
  if (Test-Path (Join-Path $buildDir '.git')) { Remove-Item (Join-Path $buildDir '.git') -Recurse -Force }
  flutter clean
  flutter pub get
  flutter build web --release --no-wasm-dry-run --dart-define=API_URL=$ApiUrl
  Set-Location $proj
  if (-not (Test-Path $deployDir)) { git clone $RepoUrl $deployDir }
  Set-Location $deployDir
  try { git remote set-url origin $RepoUrl } catch {}
  try { git fetch origin } catch {}
  try { git checkout main } catch {}
  git pull --rebase origin main
  foreach ($f in $files) { Copy-Item (Join-Path $buildDir $f) -Destination (Join-Path $deployDir $f) -Force }
  $changes = git status --porcelain
  if (-not [string]::IsNullOrWhiteSpace($changes)) {
    git add $files
    $stamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    git commit -m ("Deploy web automatizado: arquivos de build atualizados - " + $stamp)
    $pushOk = $true
    try { git push origin main } catch { $pushOk = $false }
    if (-not $pushOk) {
      git pull --rebase origin main
      $changes2 = git status --porcelain
      if (-not [string]::IsNullOrWhiteSpace($changes2)) {
        git add $files
        git commit -m ("Deploy web automatizado: arquivos de build atualizados - " + $stamp)
      }
      try { git push origin main } catch {}
    }
  } else {
    try { git push origin main } catch {}
  }
}

function Start-AutoWatch {
  $watchDir = Join-Path $mobile 'lib'
  $fsw = New-Object System.IO.FileSystemWatcher
  $fsw.Path = $watchDir
  $fsw.IncludeSubdirectories = $true
  $fsw.EnableRaisingEvents = $true
  $fsw.NotifyFilter = [System.IO.NotifyFilters]'FileName,DirectoryName,LastWrite'
  $mobileWatch = New-Object System.IO.FileSystemWatcher
  $mobileWatch.Path = $mobile
  $mobileWatch.Filter = 'pubspec.yaml'
  $mobileWatch.IncludeSubdirectories = $false
  $mobileWatch.EnableRaisingEvents = $true
  $mobileWatch.NotifyFilter = [System.IO.NotifyFilters]'LastWrite,FileName'
  $script:timer = $null
  $action = {
    if ($script:timer) { $script:timer.Stop(); $script:timer.Dispose() }
    $script:timer = New-Object Timers.Timer
    $script:timer.Interval = 2000
    $script:timer.AutoReset = $false
    $script:timer.add_Elapsed({ Invoke-BuildAndDeploy })
    $script:timer.Start()
  }
  Register-ObjectEvent $fsw Changed -Action $action | Out-Null
  Register-ObjectEvent $fsw Created -Action $action | Out-Null
  Register-ObjectEvent $fsw Renamed -Action $action | Out-Null
  Register-ObjectEvent $fsw Deleted -Action $action | Out-Null
  Register-ObjectEvent $mobileWatch Changed -Action $action | Out-Null
  while ($true) { Start-Sleep -Seconds 3600 }
}

if ($Watch) { Start-AutoWatch } else { Invoke-BuildAndDeploy }