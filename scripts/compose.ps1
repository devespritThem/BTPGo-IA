Param(
  [ValidateSet('up','down','restart')]
  [string]$Action = 'up',
  [switch]$Detach,
  [switch]$Recreate
)

$Root = (Resolve-Path "$PSScriptRoot/..").Path
Push-Location $Root

switch ($Action) {
  'up' {
    $flags = @('-f','infra/docker-compose.yml','up')
    if ($Detach) { $flags += '-d' }
    if ($Recreate) { $flags += '--force-recreate' }
    docker compose @flags
  }
  'down' { docker compose -f "infra/docker-compose.yml" down -v }
  'restart' { docker compose -f "infra/docker-compose.yml" restart }
}

Pop-Location

