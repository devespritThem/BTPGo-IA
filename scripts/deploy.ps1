Param(
  [switch]$BackendFly,
  [switch]$FrontendSftp
)

$Root = (Resolve-Path "$PSScriptRoot/..").Path

if ($BackendFly) {
  if (-not (Get-Command flyctl -ErrorAction SilentlyContinue)) {
    Write-Host "[deploy] flyctl not found. Install Fly.io CLI first."; exit 1
  }
  Push-Location $Root
  flyctl deploy --remote-only --config infra/fly.toml
  Pop-Location
}

if ($FrontendSftp) {
  Write-Host "[deploy] Using SFTP – ensure secrets are set or pass credentials."
  Write-Host "[deploy] Run via GitHub Actions for CI deployment."
}

