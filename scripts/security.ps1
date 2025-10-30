Param(
  [switch]$Trivy
)

if ($Trivy) {
  if (-not (Get-Command trivy -ErrorAction SilentlyContinue)) {
    Write-Host "[security] Trivy not found. Install https://aquasecurity.github.io/trivy/"; exit 1
  }
  trivy fs --ignore-unfixed --severity CRITICAL,HIGH --exit-code 0 "$PSScriptRoot/.."
}

Write-Host "[security] Done."

