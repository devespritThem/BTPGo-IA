Write-Host "[clean] Removing node_modules, dist, caches..."
Get-ChildItem -Path "$PSScriptRoot/.." -Recurse -Directory -Include node_modules,dist,.turbo,.next -ErrorAction SilentlyContinue |
  ForEach-Object { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }

Write-Host "[clean] Removing logs..."
Get-ChildItem -Path "$PSScriptRoot/.." -Recurse -File -Include *.log -ErrorAction SilentlyContinue |
  ForEach-Object { Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue }

Write-Host "[clean] docker compose down -v ..."
Push-Location "$PSScriptRoot/.."
docker compose down -v 2>$null
Pop-Location

Write-Host "[clean] docker system prune -a -f ..."
docker system prune -a -f 2>$null

Write-Host "[clean] Done."

