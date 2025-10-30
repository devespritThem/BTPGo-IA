Param(
  [switch]$Docker
)

$Root = (Resolve-Path "$PSScriptRoot/..").Path

if ($Docker) {
  Push-Location "$Root/backend"
  docker build -t btpgo-backend .
  Pop-Location

  Push-Location "$Root/frontend"
  docker build -t btpgo-frontend .
  Pop-Location

  Push-Location "$Root/ai_engine"
  docker build -t btpgo-ai .
  Pop-Location
  exit 0
}

# Non-docker builds
Push-Location "$Root/backend"
npm install
npx prisma generate
npm run build
Pop-Location

Push-Location "$Root/frontend"
npm install
npm run build
Pop-Location

Write-Host "[build] Completed."

