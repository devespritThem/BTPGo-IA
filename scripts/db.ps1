Param(
  [ValidateSet('migrate','deploy','seed','studio')]
  [string]$Cmd = 'migrate'
)

$Root = (Resolve-Path "$PSScriptRoot/..").Path
Push-Location "$Root/backend"

switch ($Cmd) {
  'migrate' { npx prisma migrate dev }
  'deploy'  { npx prisma migrate deploy }
  'seed'    { npm run db:seed }
  'studio'  { npx prisma studio }
}

Pop-Location

