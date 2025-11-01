param(
  [Parameter(Mandatory=$true)][string]$Repo,              # ex: devespritThem/BTPGo-IA
  [string]$Domain = 'msmarrakech.com',
  [string]$BackendApp = 'btpgo-api',
  [string]$AiApp = 'btpgo-ai',
  [string]$DatabaseUrl = '',
  [switch]$Force,                 # écrase les secrets existants
  [switch]$SetFlySecrets          # pousse aussi les secrets côté Fly (via flyctl)
)

$ErrorActionPreference = 'Stop'
function Info($m){ Write-Host $m -ForegroundColor Cyan }
function Ok($m){ Write-Host $m -ForegroundColor Green }
function Warn($m){ Write-Host $m -ForegroundColor Yellow }
function Err($m){ Write-Host $m -ForegroundColor Red }

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Err 'GitHub CLI (gh) requis: https://cli.github.com/'
  exit 1
}
try {
  $st = & gh auth status 2>&1
  if ($LASTEXITCODE -ne 0 -or -not ($st -match 'Logged in to github.com')) { throw 'not logged' }
} catch {
  Err 'gh non authentifié. Exécutez: gh auth login'
  exit 1
}

$ApiHost = "api.$Domain"
$AiHost  = "ai.$Domain"
$FrontHost = "www.$Domain"

$expected = [ordered]@{
  'FLY_API_TOKEN'        = ''                       # doit être saisi par vous (token Fly)
  'FLY_BACKEND_APP'      = $BackendApp
  'BACKEND_URL_FLY'      = "https://$ApiHost"
  'DATABASE_URL'         = $DatabaseUrl
  'JWT_SECRET'           = ''                       # généré si absent
  'DATA_ENCRYPTION_KEY'  = ''                       # généré si absent
  'FRONTEND_URL_PROD'    = "https://$FrontHost"
  'FLY_AI_APP'           = $AiApp
  'AI_URL_FLY'           = "https://$AiHost"
}

# Récupère les secrets existants
$existing = @()
try {
  $lines = & gh secret list -R $Repo 2>&1
  if ($LASTEXITCODE -eq 0 -and $lines) {
    $existing = $lines -split "`r?`n" | Where-Object { $_ } | ForEach-Object { ($_ -split '\s+')[0] }
  }
} catch {}

function New-Hex32() {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
}
function New-Base6432() {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  [Convert]::ToBase64String($bytes)
}

function Set-RepoSecret([string]$name, [string]$value) {
  if (-not $value) { return }
  & gh secret set $name -R $Repo -b "$value" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "gh secret set $name failed" }
  Ok "GitHub secret mis à jour: $name"
}

Info "Audit des secrets requis sur $Repo"
$missing = @()
foreach ($k in $expected.Keys) {
  if ($existing -notcontains $k) { $missing += $k; Write-Host "  ❌ $k" -ForegroundColor Red } else { Write-Host "  ✅ $k" -ForegroundColor Green }
}

# Collecte interactive si nécessaire
if (-not $expected['DATABASE_URL']) {
  Write-Host "Entrer DATABASE_URL (ex Supabase: postgresql://postgres:<PWD>@db.<PROJ>.supabase.co:5432/postgres?sslmode=require)" -ForegroundColor Yellow
  $expected['DATABASE_URL'] = Read-Host 'DATABASE_URL'
}
if (-not $expected['FLY_API_TOKEN']) {
  Write-Host "Entrer FLY_API_TOKEN (flyctl auth token)" -ForegroundColor Yellow
  $expected['FLY_API_TOKEN'] = Read-Host 'FLY_API_TOKEN'
}

if (-not $expected['JWT_SECRET']) { $expected['JWT_SECRET'] = New-Hex32() }
if (-not $expected['DATA_ENCRYPTION_KEY']) { $expected['DATA_ENCRYPTION_KEY'] = New-Base6432() }

Info "Application des secrets (GitHub Actions)"
foreach ($k in $expected.Keys) {
  $should = $Force -or ($existing -notcontains $k)
  if ($should) {
    Set-RepoSecret -name $k -value $expected[$k]
  }
}

if ($SetFlySecrets) {
  if (-not (Get-Command flyctl -ErrorAction SilentlyContinue)) { Warn 'flyctl absent: https://fly.io/docs/hands-on/install-flyctl/'; }
  else {
    if (-not $expected['FLY_API_TOKEN']) { Warn 'FLY_API_TOKEN vide; saute la synchro Fly'; }
    else {
      $env:FLY_API_TOKEN = $expected['FLY_API_TOKEN']
      Info "Push secrets vers Fly (app=$BackendApp)"
      & flyctl secrets set `
        JWT_SECRET="$($expected['JWT_SECRET'])" `
        DATA_ENCRYPTION_KEY="$($expected['DATA_ENCRYPTION_KEY'])" `
        FRONTEND_URL="$($expected['FRONTEND_URL_PROD'])" `
        DATABASE_URL="$($expected['DATABASE_URL'])" `
        -a $BackendApp | Out-Null
      if ($LASTEXITCODE -eq 0) { Ok 'Secrets Fly (backend) mis à jour' } else { Warn 'Echec secrets Fly (backend)' }
    }
  }
}

Write-Host ''
Ok 'Synchronisation des secrets terminée.'
Write-Host ('BACKEND_URL_FLY={0}  |  FRONTEND_URL_PROD={1}' -f $expected['BACKEND_URL_FLY'],$expected['FRONTEND_URL_PROD']) -ForegroundColor DarkGray

