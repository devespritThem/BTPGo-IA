param(
  [Parameter(Mandatory=$true)][string]$Repo,            # ex: devespritThem/BTPGo-IA
  [string]$Domain = 'msmarrakech.com',
  [switch]$Force                                        # écrase si déjà présent
)

$ErrorActionPreference = 'Stop'
function Info($m){ Write-Host $m -ForegroundColor Cyan }
function Ok($m){ Write-Host $m -ForegroundColor Green }
function Warn($m){ Write-Host $m -ForegroundColor Yellow }
function Err($m){ Write-Host $m -ForegroundColor Red }

Info "Initialisation du setup des secrets GitHub pour $Repo"

# 1) Vérification GitHub CLI + Auth
Info "Vérification de GitHub CLI (gh) et de l'authentification"
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  $onWin = $IsWindows -or ($env:OS -match 'Windows')
  $onMac = $IsMacOS -or ($env:OSTYPE -match 'darwin')
  $onLin = $IsLinux -or ($env:OSTYPE -match 'linux')
  Write-Host "❌ GitHub CLI (gh) non détecté." -ForegroundColor Red
  Write-Host "   Installe gh avec l’une des commandes suivantes :" -ForegroundColor Yellow
  if ($onWin) {
    Write-Host "   winget install --id GitHub.cli" -ForegroundColor Yellow
    Write-Host "   choco install gh" -ForegroundColor Yellow
  } elseif ($onMac) {
    Write-Host "   brew install gh" -ForegroundColor Yellow
  } elseif ($onLin) {
    Write-Host "   sudo apt install gh    # Debian/Ubuntu (si dispo)" -ForegroundColor Yellow
    Write-Host "   sudo dnf install gh    # Fedora (si dispo)" -ForegroundColor Yellow
    Write-Host "   sudo pacman -S github-cli  # Arch" -ForegroundColor Yellow
  }
  Write-Host "   Documentation: https://cli.github.com/" -ForegroundColor Yellow
  exit 1
}
try {
  $st = & gh auth status 2>&1
  if ($LASTEXITCODE -ne 0 -or -not ($st -match 'Logged in to github.com')) { throw 'not logged' }
} catch {
  Write-Host "⚠️ Non connecté à GitHub. Lance d'abord : gh auth login" -ForegroundColor Yellow
  exit 1
}

# 2) Préparation des valeurs par défaut
$ApiHost = "api.$Domain"
$AiHost  = "ai.$Domain"
$FrontHost = "www.$Domain"

# 3) Récupérer existants
Info "Récupération des secrets existants sur $Repo"
$existing = @()
try {
  $lines = & gh secret list -R $Repo 2>&1
  if ($LASTEXITCODE -eq 0 -and $lines) {
    $existing = $lines -split "`r?`n" | Where-Object { $_ } | ForEach-Object { ($_ -split '\s+')[0] }
  }
} catch {}

function Has-Secret([string]$name) {
  return $existing -contains $name
}

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
  if ((-not $Force) -and (Has-Secret $name)) { Warn "Existant (skip): $name"; return }
  & gh secret set $name -R $Repo -b "$value" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "gh secret set $name failed" }
  Ok "Secret mis à jour: $name"
}

# 4) Saisie guidée des valeurs sensibles
Write-Host ''
Info 'Saisie des valeurs requises (laisser vide pour conserver/ignorer)'

# Database URL
if (-not (Has-Secret 'DATABASE_URL') -or $Force) {
  Write-Host "DATABASE_URL (ex Supabase): postgresql://USER:PWD@HOST:5432/DB?sslmode=require" -ForegroundColor Yellow
  $DATABASE_URL = Read-Host 'DATABASE_URL'
}

# Fly (token + noms d'apps)
if (-not (Has-Secret 'FLY_API_TOKEN') -or $Force) {
  Write-Host "FLY_API_TOKEN (flyctl auth token)" -ForegroundColor Yellow
  $FLY_API_TOKEN = Read-Host 'FLY_API_TOKEN'
}
if (-not (Has-Secret 'FLY_BACKEND_APP') -or $Force) {
  $FLY_BACKEND_APP = Read-Host 'FLY_BACKEND_APP (défaut: btpgo-api)'
  if (-not $FLY_BACKEND_APP) { $FLY_BACKEND_APP = 'btpgo-api' }
}
if (-not (Has-Secret 'FLY_AI_APP') -or $Force) {
  $FLY_AI_APP = Read-Host 'FLY_AI_APP (défaut: btpgo-ai)'
  if (-not $FLY_AI_APP) { $FLY_AI_APP = 'btpgo-ai' }
}

# SFTP (o2switch)
Write-Host ''
Info 'SFTP (déploiement frontend o2switch)'
if (-not (Has-Secret 'SFTP_HOST') -or $Force)        { $SFTP_HOST        = Read-Host 'SFTP_HOST (ex: ssh.clusterXXX.o2switch.net)' }
if (-not (Has-Secret 'SFTP_USERNAME') -or $Force)    { $SFTP_USERNAME    = Read-Host 'SFTP_USERNAME' }
if (-not (Has-Secret 'SFTP_PASSWORD') -or $Force)    { $SFTP_PASSWORD    = Read-Host 'SFTP_PASSWORD' }
if (-not (Has-Secret 'SFTP_REMOTE_PATH') -or $Force) { $SFTP_REMOTE_PATH = Read-Host 'SFTP_REMOTE_PATH (défaut: public_html/)' }
if (-not $SFTP_REMOTE_PATH) { $SFTP_REMOTE_PATH = 'public_html/' }
if (-not (Has-Secret 'SFTP_PORT') -or $Force)        { $SFTP_PORT        = Read-Host 'SFTP_PORT (défaut: 22)' }
if (-not $SFTP_PORT) { $SFTP_PORT = '22' }

# Stripe (optionnel mais recommandé)
Write-Host ''
Info 'Stripe (optionnel)'
if (-not (Has-Secret 'STRIPE_SECRET_KEY') -or $Force)     { $STRIPE_SECRET_KEY     = Read-Host 'STRIPE_SECRET_KEY (sk_live_... ou sk_test_...)' }
if (-not (Has-Secret 'STRIPE_WEBHOOK_SECRET') -or $Force) { $STRIPE_WEBHOOK_SECRET = Read-Host 'STRIPE_WEBHOOK_SECRET (whsec_...)' }

# Email SMTP (optionnel)
Write-Host ''
Info 'Email SMTP (optionnel)'
if (-not (Has-Secret 'EMAIL_USER') -or $Force) { $EMAIL_USER = Read-Host 'EMAIL_USER' }
if (-not (Has-Secret 'EMAIL_PASS') -or $Force) { $EMAIL_PASS = Read-Host 'EMAIL_PASS' }

# CORS_ORIGINS (optionnel)
if (-not (Has-Secret 'CORS_ORIGINS') -or $Force) {
  $defaultCors = "https://$FrontHost,https://$Domain,https://*.$Domain"
  $CORS_ORIGINS = Read-Host "CORS_ORIGINS (défaut: $defaultCors)"
  if (-not $CORS_ORIGINS) { $CORS_ORIGINS = $defaultCors }
}

# OIDC/Redis (optionnels)
Write-Host ''
Info 'OIDC/Redis (optionnels)'
if (-not (Has-Secret 'REDIS_URL') -or $Force)           { $REDIS_URL = Read-Host 'REDIS_URL (ex: rediss://:pwd@host:port/0)' }
if (-not (Has-Secret 'OIDC_ISSUER') -or $Force)         { $OIDC_ISSUER = Read-Host 'OIDC_ISSUER' }
if (-not (Has-Secret 'OIDC_CLIENT_ID') -or $Force)      { $OIDC_CLIENT_ID = Read-Host 'OIDC_CLIENT_ID' }
if (-not (Has-Secret 'OIDC_CLIENT_SECRET') -or $Force)  { $OIDC_CLIENT_SECRET = Read-Host 'OIDC_CLIENT_SECRET' }
if (-not (Has-Secret 'OIDC_REDIRECT_URI') -or $Force)   { $OIDC_REDIRECT_URI = Read-Host 'OIDC_REDIRECT_URI (ex: https://www.'+$Domain+'/auth/callback)' }

# 5) Génération des clés si absentes
if (-not (Has-Secret 'JWT_SECRET') -or $Force) {
  $JWT_SECRET = New-Hex32
  Warn "JWT_SECRET généré"
}
if (-not (Has-Secret 'DATA_ENCRYPTION_KEY') -or $Force) {
  $DATA_ENCRYPTION_KEY = New-Base6432
  Warn "DATA_ENCRYPTION_KEY généré"
}

# 6) Définition des URLs dérivées du domaine
$BACKEND_URL_FLY   = "https://$ApiHost"
$AI_URL_FLY        = "https://$AiHost"
$FRONTEND_URL_PROD = "https://$FrontHost"
$BACKEND_URL_PROD  = $BACKEND_URL_FLY

# 7) Push des secrets
Write-Host ''
Info 'Application des secrets (GitHub Actions)'

# URLs de prod
Set-RepoSecret -name 'BACKEND_URL_FLY'   -value $BACKEND_URL_FLY
Set-RepoSecret -name 'AI_URL_FLY'        -value $AI_URL_FLY
Set-RepoSecret -name 'FRONTEND_URL_PROD' -value $FRONTEND_URL_PROD
Set-RepoSecret -name 'BACKEND_URL_PROD'  -value $BACKEND_URL_PROD

# Core Backend
Set-RepoSecret -name 'DATABASE_URL'        -value $DATABASE_URL
Set-RepoSecret -name 'JWT_SECRET'          -value $JWT_SECRET
Set-RepoSecret -name 'DATA_ENCRYPTION_KEY' -value $DATA_ENCRYPTION_KEY
Set-RepoSecret -name 'CORS_ORIGINS'        -value $CORS_ORIGINS

# Fly.io
Set-RepoSecret -name 'FLY_API_TOKEN'   -value $FLY_API_TOKEN
Set-RepoSecret -name 'FLY_BACKEND_APP' -value $FLY_BACKEND_APP
Set-RepoSecret -name 'FLY_AI_APP'      -value $FLY_AI_APP

# SFTP Frontend
Set-RepoSecret -name 'SFTP_HOST'        -value $SFTP_HOST
Set-RepoSecret -name 'SFTP_USERNAME'    -value $SFTP_USERNAME
Set-RepoSecret -name 'SFTP_PASSWORD'    -value $SFTP_PASSWORD
Set-RepoSecret -name 'SFTP_REMOTE_PATH' -value $SFTP_REMOTE_PATH
Set-RepoSecret -name 'SFTP_PORT'        -value $SFTP_PORT

# Stripe (optionnel)
Set-RepoSecret -name 'STRIPE_SECRET_KEY'     -value $STRIPE_SECRET_KEY
Set-RepoSecret -name 'STRIPE_WEBHOOK_SECRET' -value $STRIPE_WEBHOOK_SECRET

# Email (optionnel)
Set-RepoSecret -name 'EMAIL_USER' -value $EMAIL_USER
Set-RepoSecret -name 'EMAIL_PASS' -value $EMAIL_PASS

# OIDC/Redis (optionnels)
Set-RepoSecret -name 'REDIS_URL'          -value $REDIS_URL
Set-RepoSecret -name 'OIDC_ISSUER'        -value $OIDC_ISSUER
Set-RepoSecret -name 'OIDC_CLIENT_ID'     -value $OIDC_CLIENT_ID
Set-RepoSecret -name 'OIDC_CLIENT_SECRET' -value $OIDC_CLIENT_SECRET
Set-RepoSecret -name 'OIDC_REDIRECT_URI'  -value $OIDC_REDIRECT_URI

Write-Host ''
Ok 'Synchronisation des secrets terminée.'
Write-Host ("BACKEND_URL_FLY={0}  |  FRONTEND_URL_PROD={1}" -f $BACKEND_URL_FLY,$FRONTEND_URL_PROD) -ForegroundColor DarkGray
