[CmdletBinding()]
param(
  [ValidateRange(1024, 65535)]
  [int]$Port = 4096,
  [string]$HostName = "127.0.0.1",
  [string]$LogDirectory = "$env:LOCALAPPDATA\OpenCodeHomeStation\logs"
)

$ErrorActionPreference = "Stop"

# Safe default: loopback only. Do not change this to 0.0.0.0 unless
# you understand the exposure and have configured a private authenticated network.
if ($HostName -ne "127.0.0.1" -and $HostName -ne "localhost" -and $HostName -ne "::1") {
  throw "Refusing to bind to a non-loopback address by default. Use a private VPN and review the security design before changing this."
}

$command = Get-Command "opencode" -ErrorAction SilentlyContinue
if (-not $command) {
  throw "OpenCode CLI was not found in PATH. Install OpenCode and verify that opencode --version works."
}

New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$stdout = Join-Path $LogDirectory "server-$timestamp.out.log"
$stderr = Join-Path $LogDirectory "server-$timestamp.err.log"

Write-Host "Starting OpenCode server on $HostName`:$Port"
Write-Host "Logs: $LogDirectory"
Write-Host "Stop with Ctrl+C in this window. This script intentionally does not install a scheduled task or Windows service."

# Keep this process in the foreground so Ctrl+C reliably stops the server.
& $command.Source serve --hostname $HostName --port $Port 1>> $stdout 2>> $stderr
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  Write-Error "OpenCode server exited with code $exitCode. Check $stderr"
}
exit $exitCode
