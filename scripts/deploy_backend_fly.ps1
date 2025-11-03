Param(
  # Utiliser le fly.toml à la racine par défaut
  [string]$Config = 'fly.toml',
  # URL publique du backend (ex: https://btpgo-backend.fly.dev)
  [string]$BackendUrl = $env:BACKEND_URL_FLY
)

$Root = (Resolve-Path "$PSScriptRoot/..").Path
if (-not (Get-Command flyctl -ErrorAction SilentlyContinue)) {
  Write-Error "flyctl not found. Install Fly.io CLI and login (fly auth login)."; exit 1
}
Push-Location $Root
flyctl deploy --remote-only --config $Config
Pop-Location

# Health checks optionnels si une URL est fournie
if ($BackendUrl) {
  Write-Host "[deploy] Waiting for health at $BackendUrl/health"
  $ok = $false
  for ($i = 0; $i -lt 60; $i++) {
    try {
      $r = Invoke-WebRequest -Uri "$BackendUrl/health" -Method Get -TimeoutSec 5 -UseBasicParsing
      if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch {}
    Start-Sleep -Seconds 2
  }
  if (-not $ok) { Write-Error "Backend not healthy at $BackendUrl/health"; exit 1 }

  Write-Host "[deploy] Checking DB connectivity at $BackendUrl/health?db=1"
  $ok = $false
  for ($i = 0; $i -lt 60; $i++) {
    try {
      $r = Invoke-WebRequest -Uri "$BackendUrl/health?db=1" -Method Get -TimeoutSec 5 -UseBasicParsing
      if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch {}
    Start-Sleep -Seconds 2
  }
  if (-not $ok) { Write-Error "DB not reachable at $BackendUrl/health?db=1"; exit 1 }
}

