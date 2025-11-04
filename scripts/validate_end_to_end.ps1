param(
  [string]$Api = "https://api.msmarrakech.com",
  [string]$Frontend = "https://www.msmarrakech.com",
  [string]$Email = "demo@msmarrakech.com",
  [string]$Password = "Demo2025!",
  [string]$AdminKey
)

$ErrorActionPreference = 'Stop'

function Get-Json($ResponseContent) {
  try { return $ResponseContent | ConvertFrom-Json -Depth 20 } catch { return $null }
}

function Get-Code($Url) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri $Url -Method GET -TimeoutSec 20
    return $r.StatusCode
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) { return [int]$_.Exception.Response.StatusCode }
    return 0
  }
}

Write-Host "== API health checks =="
$codes = @{}
foreach ($p in @('/health','/health?db=1','/ai/health','/test/ping','/test/env')) {
  $u = "$Api$p"; $c = Get-Code $u; $codes[$p] = $c; Write-Host "$u -> $c"
}

if ($AdminKey) {
  Write-Host "== Create demo user via /test/create-demo-user =="
  try {
    $body = @{ email=$Email; password=$Password } | ConvertTo-Json -Compress
    $headers = @{ 'Content-Type'='application/json'; 'X-Test-Admin-Key'=$AdminKey }
    $r = Invoke-WebRequest -UseBasicParsing -Uri "$Api/test/create-demo-user" -Method POST -Headers $headers -Body $body -TimeoutSec 30
    Write-Host $r.Content
  } catch { Write-Warning "create-demo-user failed: $($_.Exception.Message)" }
} else {
  Write-Host "== Create demo user via /auth/register (fallback) =="
  try {
    $body = @{ email=$Email; password=$Password } | ConvertTo-Json -Compress
    $r = Invoke-WebRequest -UseBasicParsing -Uri "$Api/auth/register" -Method POST -ContentType 'application/json' -Body $body -TimeoutSec 30
    Write-Host $r.Content
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode -eq 409) {
      Write-Host "User already exists (409), continuing"
    } else {
      Write-Warning "register failed: $($_.Exception.Message)"
    }
  }
}

Write-Host "== Login and /auth/me =="
$token = $null
try {
  $body = @{ email=$Email; password=$Password } | ConvertTo-Json -Compress
  $r = Invoke-WebRequest -UseBasicParsing -Uri "$Api/auth/login" -Method POST -ContentType 'application/json' -Body $body -TimeoutSec 30
  $j = Get-Json $r.Content
  $token = ($j.accessToken) ? $j.accessToken : $j.token
  if (-not $token) { throw "missing token" }
  Write-Host "login OK, token acquired"
} catch { Write-Error "login failed: $($_.Exception.Message)"; exit 1 }

try {
  $headers = @{ Authorization = "Bearer $token" }
  $r = Invoke-WebRequest -UseBasicParsing -Uri "$Api/auth/me" -Method GET -Headers $headers -TimeoutSec 30
  Write-Host "/auth/me -> $($r.StatusCode)"
} catch { Write-Error "/auth/me failed: $($_.Exception.Message)"; exit 1 }

Write-Host "== Frontend checks =="
$f1 = Get-Code "$Frontend/index.html"
$f2 = Get-Code "$Frontend/login"
$f3 = Get-Code "$Frontend//login"
$f4 = Get-Code "$Frontend/#/login"
Write-Host "$Frontend/index.html -> $f1"
Write-Host "$Frontend/login -> $f2"
Write-Host "$Frontend//login -> $f3"
Write-Host "$Frontend/#/login -> $f4"

$allApiOk = ($codes['/health'] -eq 200 -and $codes['/health?db=1'] -eq 200 -and $codes['/ai/health'] -eq 200)
$frontOk = ($f1 -eq 200 -and (($f2 -eq 200) -or ($f3 -eq 200) -or ($f4 -eq 200)))

Write-Host "== Résumé =="
Write-Host ("Backend:   " + ($(if ($allApiOk) { 'OK' } else { 'FAIL' })))
Write-Host ("Frontend:  " + ($(if ($frontOk) { 'OK' } else { 'FAIL' })))
if ($allApiOk -and $frontOk) { exit 0 } else { exit 1 }

