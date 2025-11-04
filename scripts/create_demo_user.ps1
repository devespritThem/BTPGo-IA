param(
  [string]$Api = "https://api.msmarrakech.com",
  [string]$Email = "demo@msmarrakech.com",
  [string]$Password = "Demo2025!",
  [Parameter(Mandatory=$true)][string]$AdminKey
)

$ErrorActionPreference = 'Stop'

Write-Host "Creating demo user $Email on $Api via /test/create-demo-user"
$body = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
$headers = @{ 'Content-Type' = 'application/json'; 'X-Test-Admin-Key' = $AdminKey }

$r = Invoke-WebRequest -UseBasicParsing -Method POST -Uri "$Api/test/create-demo-user" -Headers $headers -Body $body
Write-Host $r.Content
