param(
  [string]$Repo = "devespritThem/BTPGo-IA",
  [string]$Branch = "main"
)

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host "GitHub CLI (gh) is required: https://cli.github.com/" -ForegroundColor Yellow
  exit 1
}

# Requires a token with admin:repo_hook or repo admin permissions
$ErrorActionPreference = 'Stop'

$body = @{
  required_status_checks = @{ strict = $true; contexts = @() }
  enforce_admins = $true
  required_pull_request_reviews = @{
    required_approving_review_count = 1
    dismiss_stale_reviews = $true
    require_code_owner_reviews = $true
  }
  restrictions = $null
  allow_deletions = $false
  allow_force_pushes = $false
  required_linear_history = $true
  required_conversation_resolution = $true
} | ConvertTo-Json -Depth 6

gh api \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  repos/$Repo/branches/$Branch/protection \
  -d "$body"

Write-Host "Branch protection applied on $Repo:$Branch" -ForegroundColor Green

