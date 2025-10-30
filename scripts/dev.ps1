Param(
  [switch]$Backend,
  [switch]$Frontend,
  [switch]$AI,
  [switch]$Compose,
  [switch]$All
)

$Root = (Resolve-Path "$PSScriptRoot/..").Path
if ($All) { $Backend=$true; $Frontend=$true; $AI=$true }

if ($Compose) {
  Push-Location $Root
  docker compose -f "infra/docker-compose.yml" up --build
  Pop-Location
  exit $LASTEXITCODE
}

if ($Backend) {
  Push-Location "$Root/backend"
  if (-not (Test-Path .env)) { Copy-Item .env.example .env }
  npm install
  npx prisma generate
  npx prisma migrate dev
  npm run dev
  Pop-Location
}

if ($Frontend) {
  Push-Location "$Root/frontend"
  if (-not (Test-Path .env) -and (Test-Path .env.example)) { Copy-Item .env.example .env }
  npm install
  npm run dev
  Pop-Location
}

if ($AI) {
  Push-Location "$Root/ai_engine"
  if (Get-Command python -ErrorAction SilentlyContinue) {
    pip install -r requirements.txt
    uvicorn app.main:app --reload
  } else {
    Write-Host "[ai] Python not found. Install Python 3.11+."
  }
  Pop-Location
}

