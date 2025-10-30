Param(
  [switch]$Detach,
  [switch]$Recreate
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path "$PSScriptRoot/..").Path

Write-Host "[build] Building Docker images (backend, frontend, ai_engine)"
Push-Location "$Root/backend"; docker build -t btpgo-backend .; Pop-Location
Push-Location "$Root/frontend"; docker build -t btpgo-frontend .; Pop-Location
Push-Location "$Root/ai_engine"; docker build -t btpgo-ai .; Pop-Location

Write-Host "[compose] Bringing up full stack"
Push-Location $Root
$flags = @('-f','infra/docker-compose.yml','up','--build')
if ($Detach) { $flags += '-d' }
if ($Recreate) { $flags += '--force-recreate' }
docker compose @flags
Pop-Location

