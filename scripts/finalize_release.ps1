param(
  [Parameter(Mandatory=$true)][string]$Repo,                 # ex: devespritThem/BTPGo-IA
  [string]$Domain = 'msmarrakech.com',
  [switch]$SkipSecrets,
  [switch]$DryRun,
  [switch]$NoTrigger
)

$ErrorActionPreference = 'Stop'
function Info($m){ Write-Host $m -ForegroundColor Cyan }
function Ok($m){ Write-Host $m -ForegroundColor Green }
function Warn($m){ Write-Host $m -ForegroundColor Yellow }
function Err($m){ Write-Host $m -ForegroundColor Red }

Info "Finalisation BTPGo: CORS + Workflows + Secrets + Push"

# Pre-flight: tools
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Err 'git manquant'; exit 1 }
if (-not (Get-Command gh -ErrorAction SilentlyContinue))  { Err 'gh manquant (https://cli.github.com/)'; exit 1 }
try {
  & gh auth status 2>&1 | Out-Null
} catch {
  Err "gh non authentifié. Lancez: gh auth login"; exit 1
}

# Paths
$Root = (Resolve-Path "$PSScriptRoot/..").Path
$WfDir = Join-Path $Root '.github/workflows'
New-Item -ItemType Directory -Force -Path $WfDir | Out-Null

# 1) Ensure daily-health-check.yml
$daily = @"
name: Daily Prod Health Check

on:
  schedule:
    - cron: '0 5 * * *'
  workflow_dispatch:

jobs:
  run_smoke:
    uses: ./.github/workflows/smoke-prod.yml
"@
Set-Content -Path (Join-Path $WfDir 'daily-health-check.yml') -Value $daily -Encoding UTF8
Ok 'daily-health-check.yml mis à jour'

# 2) Ensure smoke-prod.yml AI retry step contains status check loop
$smokePath = Join-Path $WfDir 'smoke-prod.yml'
if (Test-Path $smokePath) {
  $sm = Get-Content $smokePath -Raw
  $snippet = @"
      - name: Test AI Engine Health (with retry)
        env:
          AI_URL: \\${{ secrets.AI_URL_FLY }}
        run: |
          echo "Testing AI Engine..."
          for i in {1..3}; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$AI_URL/health")
            if [ "$STATUS" = "200" ]; then
              echo "✅ AI Engine healthy"
              exit 0
            fi
            echo "Retrying ($i/3)..."
            sleep 5
          done
          echo "❌ AI Engine not responding"
          exit 1
"@
  # Replace existing AI step block if present, else append
  if ($sm -match 'name:\s*Test AI Engine Health') {
    $sm2 = $sm -replace '(?ms)^\s*- name:\s*Test AI Engine Health[\s\S]*?(?=\n\s*- name:|\z)',$snippet
    if ($sm2 -ne $sm) { $sm = $sm2 }
  } elseif ($sm -match 'name:\s*Test AI Engine Health \(with retry\)') {
    $sm2 = $sm -replace '(?ms)^\s*- name:\s*Test AI Engine Health \(with retry\)[\s\S]*?(?=\n\s*- name:|\z)',$snippet
    if ($sm2 -ne $sm) { $sm = $sm2 }
  } else {
    $sm = $sm.TrimEnd() + "`n" + $snippet
  }
  Set-Content -Path $smokePath -Value $sm -Encoding UTF8
  Ok 'smoke-prod.yml (AI retry) assuré'
} else {
  Warn 'smoke-prod.yml absent – saute la mise à jour AI retry'
}

# Helpers
function Get-ExistingSecrets() {
  $names = @()
  try {
    $lines = & gh secret list -R $Repo 2>&1
    if ($LASTEXITCODE -eq 0 -and $lines) {
      $names = $lines -split "`r?`n" | Where-Object { $_ } | ForEach-Object { ($_ -split '\s+')[0] }
    }
  } catch {}
  return $names
}
function Set-GHSecret([string]$name, [string]$value) {
  if (-not $value) { return }
  Info "gh secret set $name"
  if (-not $DryRun) { & gh secret set $name -R $Repo -b "$value" | Out-Null }
}

# 3) Set recommended CORS secrets (idempotent)
if (-not $SkipSecrets) {
  $CORS_ORIGINS = "https://www.$Domain,https://$Domain,https://*.$Domain"
  $secretsToSet = @{
    'CORS_ORIGINS'        = $CORS_ORIGINS
    'CORS_ALLOWED_HEADERS'= 'Authorization,Content-Type,Accept'
    'CORS_ALLOWED_METHODS'= 'GET,POST,PATCH,DELETE,OPTIONS'
    'CORS_EXPOSED_HEADERS'= 'Authorization,Content-Length,Content-Disposition,ETag'
  }
  foreach($k in $secretsToSet.Keys){ Set-GHSecret -name $k -value $secretsToSet[$k] }
  Ok 'Secrets CORS mis à jour sur GitHub'
}

# 4) SFTP / Stripe secrets (prompt for missing)
if (-not $SkipSecrets) {
  $existing = Get-ExistingSecrets
  # SFTP
  $sftpFields = @('SFTP_HOST','SFTP_USERNAME','SFTP_PASSWORD','SFTP_REMOTE_PATH','SFTP_PORT')
  foreach($f in $sftpFields){
    if ($existing -contains $f) { continue }
    switch ($f) {
      'SFTP_HOST' { $val = Read-Host 'SFTP_HOST (ex: ssh.clusterXXX.o2switch.net)'; Set-GHSecret $f $val }
      'SFTP_USERNAME' { $val = Read-Host 'SFTP_USERNAME'; Set-GHSecret $f $val }
      'SFTP_PASSWORD' { $val = Read-Host 'SFTP_PASSWORD'; Set-GHSecret $f $val }
      'SFTP_REMOTE_PATH' { $val = Read-Host 'SFTP_REMOTE_PATH (défaut: public_html/)'; if (-not $val) { $val='public_html/' }; Set-GHSecret $f $val }
      'SFTP_PORT' { $val = Read-Host 'SFTP_PORT (défaut: 22)'; if (-not $val) { $val='22' }; Set-GHSecret $f $val }
    }
  }
  # Stripe
  if ($existing -notcontains 'STRIPE_SECRET_KEY') {
    $sk = Read-Host 'STRIPE_SECRET_KEY (sk_live_... ou sk_test_...)'
    Set-GHSecret 'STRIPE_SECRET_KEY' $sk
  }
  Ok 'Secrets SFTP/Stripe vérifiés'
}

# 5) Git add/commit/push
Push-Location $Root
& git add backend/index.js '.github/workflows/smoke-prod.yml' '.github/workflows/daily-health-check.yml' 2>$null
if (-not $DryRun) {
  & git commit -m "Add CORS audit logger, extend headers/methods, add AI health retry + daily monitoring" 2>$null | Out-Null
  & git push -u origin main
}
Pop-Location
Ok 'Commit & push effectués'

# 6) Trigger workflows (optional, default: trigger unless -NoTrigger)
if (-not $NoTrigger -and -not $DryRun) {
  Info 'Déclenchement des workflows GitHub Actions'
  $wfs = @(
    'deploy-backend-fly.yml',
    'deploy-ai-fly.yml',
    'deploy-frontend-o2switch.yml',
    'smoke-prod.yml'
  )
  foreach($wf in $wfs){
    try { & gh workflow run $wf -R $Repo | Out-Null; Ok "Workflow lancé: $wf" } catch { Warn "Impossible de lancer $wf" }
  }
}

Write-Host "Actions prêtes: Deploy Backend (Fly), Deploy AI Engine (Fly), Deploy Frontend (SFTP), Smoke Test Production." -ForegroundColor DarkGray
