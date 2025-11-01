<#
======================================================================
 Script : btpgo_codex_diagnostic.ps1
 Auteur : Hamza Ait Chikh – MSMarrakech
 Description :
   - Vérifie GitHub CLI (gh) et l’authentification
   - Clone/valide le dépôt BTPGo-IA en local
   - Liste et vérifie les secrets GitHub essentiels
   - Contrôle basique des workflows et de la config Fly
   - Produit un résumé actionnable

 Usage (PowerShell):
   pwsh ./scripts/btpgo_codex_diagnostic.ps1 -Repo "devespritThem/BTPGo-IA" -ProjectPath "C:\hamza dev\project\BTPGo-IA"
======================================================================
#>

param(
  [string]$Repo = "devespritThem/BTPGo-IA",
  [string]$ProjectPath = "$PSScriptRoot\..\..\BTPGo-IA",
  [switch]$CloneIfMissing = $true
)

$ErrorActionPreference = 'Stop'

function Info($m){ Write-Host $m -ForegroundColor Cyan }
function Ok($m){ Write-Host $m -ForegroundColor Green }
function Warn($m){ Write-Host $m -ForegroundColor Yellow }
function Err($m){ Write-Host $m -ForegroundColor Red }

Write-Host "`nLancement du diagnostic Codex + GitHub pour BTPGo-IA..." -ForegroundColor Cyan

# 1️⃣ Vérification GitHub CLI
Info "`n1) Vérification GitHub CLI"
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host "❌ GitHub CLI non trouvé. Téléchargement..." -ForegroundColor Red
  try { Start-Process "https://cli.github.com/" } catch {}
  exit 1
}
try {
  gh auth status | Out-Host
} catch {
  Err "Non authentifié à GitHub CLI. Exécutez: gh auth login"
  exit 1
}

# 2️⃣ Clonage / présence locale du dépôt
Info "`n2) Vérification du dépôt local"
$ProjectPath = [IO.Path]::GetFullPath($ProjectPath)
if (-not (Test-Path $ProjectPath)) {
  if ($CloneIfMissing) {
    Info "Clonage du dépôt $Repo vers $ProjectPath ..."
    $parent = Split-Path $ProjectPath -Parent
    if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    gh repo clone $Repo "$ProjectPath"
    Ok "Dépôt cloné."
  } else {
    Err "Dépôt introuvable localement: $ProjectPath"
    exit 1
  }
} else {
  Ok "Dépôt présent: $ProjectPath"
}

# 3️⃣ Secrets GitHub requis
Info "`n3) Vérification des secrets GitHub (repo: $Repo)"
$required = @(
  'FLY_API_TOKEN', 'FLY_BACKEND_APP', 'BACKEND_URL_FLY',
  'DATABASE_URL', 'JWT_SECRET', 'DATA_ENCRYPTION_KEY', 'FRONTEND_URL_PROD',
  'FLY_AI_APP', 'AI_URL_FLY',
  'SFTP_HOST','SFTP_PORT','SFTP_USER','SFTP_PASS','SFTP_REMOTE_PATH'
)

$existing = @()
try {
  $list = gh secret list -R $Repo 2>$null | ForEach-Object { ($_ -split '\s+')[0] } | Where-Object { $_ }
  $existing = @($list)
  Write-Host ("Secrets existants: {0}" -f ($existing -join ', '))
} catch {
  Warn "Impossible de lister les secrets via gh secret list -R $Repo (droits requis)."
}

$missing = @()
foreach ($s in $required) { if (-not ($existing -contains $s)) { $missing += $s } }
if ($missing.Count -gt 0) {
  Warn ("Secrets manquants: {0}" -f ($missing -join ', '))
} else {
  Ok "Tous les secrets requis sont présents."
}

# 4️⃣ Workflows & config Fly
Info "`n4) Contrôle des workflows et config Fly"
$wfPath = Join-Path $ProjectPath ".github/workflows"
$neededWf = @('deploy-backend-fly.yml','deploy-frontend-o2switch.yml','db-migrate.yml')
foreach ($w in $neededWf) {
  $p = Join-Path $wfPath $w
  if (Test-Path $p) { Ok ("Workflow présent: $w") } else { Warn ("Workflow manquant: $w") }
}

$flyRoot = Join-Path $ProjectPath "fly.toml"
if (Test-Path $flyRoot) {
  $fly = Get-Content $flyRoot -Raw
  $appOk = ($fly -match "app\s*=\s*'btpgo-api'" -or $fly -match 'app\s*=\s*"btpgo-api"')
  $portOk = ($fly -match 'internal_port\s*=\s*4000')
  if ($appOk) { Ok "fly.toml (racine): app=btpgo-api" } else { Warn "fly.toml (racine): app != btpgo-api" }
  if ($portOk) { Ok "fly.toml (racine): internal_port=4000" } else { Warn "fly.toml (racine): internal_port!=4000" }
} else {
  Warn "fly.toml (racine) introuvable"
}

# 5️⃣ Sanity backend (/health local facultatif)
Info "`n5) Sanity backend local (facultatif)"
try {
  $backendDir = Join-Path $ProjectPath 'backend'
  if (Test-Path (Join-Path $backendDir 'index.js')) {
    Ok "Backend entry détectée (index.js). Pour tester localement:"
    Write-Host "  set HEALTH_SKIP_DB=true && node index.js" -ForegroundColor DarkGray
    Write-Host "  curl http://localhost:4000/health  (attendu: {\"status\":\"ok\"})" -ForegroundColor DarkGray
  } else {
    Warn "Backend entry (index.js) introuvable"
  }
} catch {}

# 6️⃣ Résumé & recommandations
Write-Host "`n=== Résumé ===" -ForegroundColor Cyan
if ($missing.Count -gt 0) {
  Write-Host "Secrets requis manquants: $($missing -join ', ')" -ForegroundColor Yellow
  Write-Host "Ajoutez-les: Settings → Secrets and variables → Actions" -ForegroundColor Yellow
}
Write-Host "Workflows attendus: deploy-backend-fly.yml, deploy-frontend-o2switch.yml, db-migrate.yml" -ForegroundColor Cyan
Write-Host "fly.toml (racine): app=btpgo-api, internal_port=4000, checks /health, release_command Prisma" -ForegroundColor Cyan

if ($missing.Count -gt 0) { exit 2 } else { exit 0 }
