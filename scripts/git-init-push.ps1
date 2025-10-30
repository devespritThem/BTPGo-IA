Param(
  [Parameter(Mandatory=$true)][string]$Remote,
  [string]$Branch = 'main'
)

$Root = (Resolve-Path "$PSScriptRoot/..").Path
Push-Location $Root

if (-not (Test-Path ".git")) {
  git init | Out-Null
}
git add .
git commit -m "chore: initial scaffold BTPGo-IA-Suite" --allow-empty
git branch -M $Branch
if (-not (git remote | Select-String -SimpleMatch "origin")) {
  git remote add origin $Remote
}
git push -u origin $Branch

Pop-Location

