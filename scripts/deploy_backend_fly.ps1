Param(
  [string]$Config = 'infra/fly.toml'
)

$Root = (Resolve-Path "$PSScriptRoot/..").Path
if (-not (Get-Command flyctl -ErrorAction SilentlyContinue)) {
  Write-Error "flyctl not found. Install Fly.io CLI and login (fly auth login)."; exit 1
}
Push-Location $Root
flyctl deploy --remote-only --config $Config
Pop-Location

