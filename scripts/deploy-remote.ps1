# Deploy reineke.pro auf dem Hetzner-Server per SSH.
# Im Repo-Root ausführen:
#   powershell -File scripts/deploy-remote.ps1
#   powershell -File scripts/deploy-remote.ps1 -Target web
#   powershell -File scripts/deploy-remote.ps1 -Prune

param(
  [string]$Server = "root@5.75.246.39",
  [ValidateSet("all", "web", "api", "status")]
  [string]$Target = "all",
  [switch]$Prune
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DeployScript = Join-Path $ScriptDir "deploy-hetzner.sh"

if (-not (Test-Path $DeployScript)) {
  throw "Deploy-Skript nicht gefunden: $DeployScript"
}

$envPrefix = if ($Prune) { "PRUNE=1 " } else { "" }
$remoteCmd = "${envPrefix}bash -s -- $Target"

Write-Host ""
Write-Host "Deploy auf $Server ($Target) ..." -ForegroundColor Cyan
Write-Host ""

Get-Content -Raw -Encoding UTF8 $DeployScript | ssh $Server $remoteCmd

if ($LASTEXITCODE -ne 0) {
  throw "Deploy fehlgeschlagen (Exit-Code $LASTEXITCODE)"
}

Write-Host ""
Write-Host "Deploy abgeschlossen." -ForegroundColor Green
