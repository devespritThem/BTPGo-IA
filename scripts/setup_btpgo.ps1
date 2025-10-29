Param(
  [switch]$WithCompose,
  [switch]$Migrate
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path "$PSScriptRoot/..").Path
Write-Host "[setup] Root: $Root"

# Copy env files
if (-not (Test-Path "$Root/backend/.env")) { Copy-Item "$Root/backend/.env.example" "$Root/backend/.env" -Force; Write-Host "[setup] backend/.env created" }
if (-not (Test-Path "$Root/frontend/.env") -and (Test-Path "$Root/frontend/.env.example")) { Copy-Item "$Root/frontend/.env.example" "$Root/frontend/.env" -Force; Write-Host "[setup] frontend/.env created" }
if (-not (Test-Path "$Root/.env")) { Copy-Item "$Root/.env.example" "$Root/.env" -Force; Write-Host "[setup] .env created" }

# Ensure storage dir
New-Item -ItemType Directory -Force -Path (Join-Path "$Root/backend" 'storage') | Out-Null

# Install backend deps and prisma
if (Get-Command npm -ErrorAction SilentlyContinue) {
  Push-Location "$Root/backend"
  Write-Host "[setup] npm ci (backend)"
  npm ci 2>$null; if ($LASTEXITCODE -ne 0) { npm install }
  npx prisma generate
  if ($Migrate) { npx prisma migrate dev }
  Pop-Location
} else { Write-Warning "npm not found; skip backend" }

# Install frontend deps
if (Get-Command npm -ErrorAction SilentlyContinue) {
  Push-Location "$Root/frontend"
  if (Test-Path 'package.json') {
    Write-Host "[setup] npm ci (frontend)"
    npm ci 2>$null; if ($LASTEXITCODE -ne 0) { npm install }
  }
  Pop-Location
}

# Install AI Engine deps
if (Get-Command python -ErrorAction SilentlyContinue) {
  Push-Location "$Root/ai_engine"
  if (Test-Path 'requirements.txt') {
    Write-Host "[setup] pip install -r requirements.txt (ai_engine)"
    pip install -r requirements.txt
  }
  Pop-Location
} else { Write-Warning "python not found; skip ai_engine" }

# Optional: start DB
if ($WithCompose) {
  Push-Location $Root
  docker compose -f 'infra/docker-compose.yml' up -d db
  Pop-Location
}

Write-Host "[setup] Completed."

