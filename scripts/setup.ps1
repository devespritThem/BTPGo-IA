Param(
  [switch]$WithCompose,
  [string]$SpaCyModel = 'fr_core_news_sm'
)

$Root = (Resolve-Path "$PSScriptRoot/..").Path
Write-Host "[setup] Root: $Root"

# Copy env examples
if (-not (Test-Path "$Root/backend/.env")) {
  Copy-Item "$Root/backend/.env.example" "$Root/backend/.env" -Force
  Write-Host "[setup] backend/.env created"
}
if (-not (Test-Path "$Root/frontend/.env")) {
  if (Test-Path "$Root/frontend/.env.example") {
    Copy-Item "$Root/frontend/.env.example" "$Root/frontend/.env" -Force
    Write-Host "[setup] frontend/.env created"
  }
}
if (-not (Test-Path "$Root/.env")) {
  Copy-Item "$Root/.env.example" "$Root/.env" -Force
  Write-Host "[setup] .env created"
}

# Ensure storage directory exists
$storage = Join-Path "$Root/backend" "storage"
New-Item -ItemType Directory -Force -Path $storage | Out-Null

if ($WithCompose) {
  Push-Location "$Root"
  docker compose -f "infra/docker-compose.yml" up -d db
  Pop-Location
}

Write-Host "[setup] Done. Next: run scripts/dev.ps1 -All"

