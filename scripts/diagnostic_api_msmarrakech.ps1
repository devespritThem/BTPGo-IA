<#
=====================================================
 Codex Diagnostic: API MSMarrakech / Fly.io
 Vérifie DNS, SSL et connectivité pour api.msmarrakech.com
=====================================================

Usage:
  pwsh ./scripts/diagnostic_api_msmarrakech.ps1

Prérequis (optionnels mais utiles):
  - flyctl (pour vérifier le certificat côté Fly)
#>

param(
  [string]$Domain = 'api.msmarrakech.com',
  [string]$ExpectedCNAME = 'btpgo-backend.fly.dev',
  [string]$FlyApp = 'btpgo-backend',
  [int]$TimeoutSec = 10
)

$ErrorActionPreference = 'Stop'

function Info($m){ Write-Host $m -ForegroundColor Cyan }
function Warn($m){ Write-Host $m -ForegroundColor Yellow }
function Err($m){ Write-Host $m -ForegroundColor Red }
function Ok($m){ Write-Host $m -ForegroundColor Green }

Write-Host "`n=== Vérification de l'état DNS et SSL de $Domain ===" -ForegroundColor Cyan

# 1) DNS Résolution
Write-Host "`n1) Vérification DNS (CNAME/A) ..." -ForegroundColor Yellow

$hasCname = $false
try {
  $cname = Resolve-DnsName -Name $Domain -Type CNAME -ErrorAction Stop
  if ($cname) {
    $hasCname = $true
    $target = ($cname | Select-Object -First 1).CanonicalName.TrimEnd('.')
    Write-Host (" - CNAME: {0} -> {1}" -f $Domain, $target)
    if ($target -ieq $ExpectedCNAME) { Ok("   CNAME correspond à $ExpectedCNAME") } else { Warn("   CNAME inattendu (attendu: $ExpectedCNAME)") }
  }
} catch {
  Warn(" - Pas de CNAME résolu (peut être proxifié via Cloudflare)")
}

try {
  $a = Resolve-DnsName -Name $Domain -Type A -ErrorAction Stop
  $ips = ($a | Where-Object { $_.IPAddress } | Select-Object -ExpandProperty IPAddress)
  if ($ips) { Write-Host (" - A records: {0}" -f ($ips -join ', ')) }
} catch { Warn(" - Pas d'enregistrement A trouvé") }

# 2) SSL/TLS et page d’accueil
Write-Host "`n2) Vérification SSL/TLS et page d’accueil ..." -ForegroundColor Yellow
try {
  $resp = Invoke-WebRequest -Uri ("https://{0}" -f $Domain) -Method Head -TimeoutSec $TimeoutSec -UseBasicParsing
  Ok(" - HTTPS répond: {0}" -f $resp.StatusCode)
} catch {
  Err(" - Échec HEAD https://$Domain : $($_.Exception.Message)")
}

# 3) Endpoints API: /health et /metrics
Write-Host "`n3) Vérification endpoints API ..." -ForegroundColor Yellow
function Test-Endpoint([string]$path){
  try {
    $u = "https://$Domain$path"
    $r = Invoke-WebRequest -Uri $u -TimeoutSec $TimeoutSec -UseBasicParsing
    Ok(" - GET {0} -> {1}" -f $path, $r.StatusCode)
    return $true
  } catch {
    Err(" - GET {0} KO: {1}" -f $path, $_.Exception.Message)
    return $false
  }
}

$okHealth = Test-Endpoint "/health"
$okMetrics = Test-Endpoint "/metrics"

# 4) Vérification certificat Fly (optionnel)
Write-Host "`n4) Vérification certificat Fly (optionnel) ..." -ForegroundColor Yellow
if (Get-Command flyctl -ErrorAction SilentlyContinue) {
  try {
    Info(" - flyctl certs show $Domain -a $FlyApp")
    flyctl certs show $Domain -a $FlyApp | Out-Host
  } catch {
    Warn(" - Impossible d'afficher le certificat via flyctl: $($_.Exception.Message)")
  }
} else {
  Warn(" - flyctl non trouvé, étape ignorée")
}

# 5) Résumé
Write-Host "`n=== Résumé ===" -ForegroundColor Cyan
if ($hasCname) {
  if ($target -ieq $ExpectedCNAME) { Ok("DNS OK: CNAME vers $ExpectedCNAME") } else { Warn("DNS: CNAME inattendu ($target)") }
} else { Warn("DNS: pas de CNAME (peut être Cloudflare proxy)") }

if ($okHealth) { Ok("/health OK") } else { Err("/health KO") }
if ($okMetrics) { Ok("/metrics OK") } else { Warn("/metrics KO") }

Write-Host "`nTerminé." -ForegroundColor Cyan

