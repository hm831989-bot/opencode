param(
  [int]$OpenCodePort = 4096,
  [int]$StationPort = 8787,
  [string]$StationHost = "127.0.0.1",
  [string]$OpenCodeUrl = "http://127.0.0.1:4096"
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$LogDir = Join-Path $env:LOCALAPPDATA "OpenCodeHomeStation\logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$OpenCode = Get-Command opencode -ErrorAction SilentlyContinue
if (-not $OpenCode) {
  throw "OpenCode CLI was not found in PATH. Install/configure OpenCode first, then rerun this script."
}
$Node = Get-Command node -ErrorAction SilentlyContinue
if (-not $Node) {
  throw "Node.js was not found in PATH. Install Node.js 20+ first, then rerun this script."
}
if ($StationHost -notin @("127.0.0.1", "localhost", "::1") -and -not $env:HOME_STATION_TOKEN) {
  throw "Remote bind requires HOME_STATION_TOKEN. Use loopback or set a long random token first."
}

$env:OPENCODE_URL = $OpenCodeUrl
$env:HOME_STATION_HOST = $StationHost
$env:HOME_STATION_PORT = "$StationPort"

$opencodeOutLog = Join-Path $LogDir "opencode.stdout.log"
$opencodeErrLog = Join-Path $LogDir "opencode.stderr.log"
Write-Host "Starting OpenCode server on loopback port $OpenCodePort..."
$existing = Get-NetTCPConnection -LocalPort $OpenCodePort -State Listen -ErrorAction SilentlyContinue
if (-not $existing) {
  $proc = Start-Process -FilePath $OpenCode.Source -ArgumentList @("serve", "--hostname", "127.0.0.1", "--port", "$OpenCodePort") -PassThru -WindowStyle Hidden -RedirectStandardOutput $opencodeOutLog -RedirectStandardError $opencodeErrLog
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    try { $null = Invoke-WebRequest "$OpenCodeUrl/global/health" -TimeoutSec 1; $ready = $true; break } catch {}
    if ($proc.HasExited) { break }
  }
  if (-not $ready) { Write-Warning "OpenCode health endpoint did not respond yet. The GUI will still start; check $opencodeOutLog and $opencodeErrLog." }
} else {
  Write-Host "Port $OpenCodePort is already listening; reusing it."
}
Write-Host ("Starting Home Agent Station GUI at http://" + $StationHost + ":" + $StationPort)
Write-Host ("Logs: " + $LogDir)
Push-Location $Root
try {
  & $Node.Source (Join-Path $Root "server.mjs")
} finally {
  Pop-Location
}