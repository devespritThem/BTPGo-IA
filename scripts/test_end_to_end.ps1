Param(
  [string]$BaseUrl = 'http://localhost:3000'
)

$ErrorActionPreference = 'Stop'
function InvokeJsonPost($url, $body, $headers) {
  $json = ($body | ConvertTo-Json -Depth 9)
  return Invoke-RestMethod -Method Post -Uri $url -Headers $headers -ContentType 'application/json' -Body $json
}

Write-Host "[e2e] Health check $BaseUrl/health"
$health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get
if (-not $health.ok) { throw "Health failed" }

$rand = Get-Random -Maximum 999999
$email = "e2e$rand@btpgo.local"
$password = "ChangeMe123!"

Write-Host "[e2e] Register org + owner"
$reg = InvokeJsonPost "$BaseUrl/auth/register-org" @{ orgName = "Org$rand"; email = $email; password = $password; name = "E2E" } @{}
$access = $reg.accessToken; $refresh = $reg.refreshToken; $orgId = $reg.orgId
if (-not $access) { throw "No access token" }
$authHeaders = @{ Authorization = "Bearer $access"; 'X-Org-Id' = $orgId }

Write-Host "[e2e] Create project"
$proj = InvokeJsonPost "$BaseUrl/projects" @{ name = "Proj $rand" } $authHeaders

Write-Host "[e2e] Finance: customer + invoice"
$cust = InvokeJsonPost "$BaseUrl/finance/customers" @{ name = "Client $rand"; email = $email } $authHeaders
$inv = InvokeJsonPost "$BaseUrl/finance/invoices" @{ customerId = $cust.id; lines = @(@{ description = 'Ligne'; quantity = 1; unitPrice = 1000; taxRate = 0.2 }) } $authHeaders
$invFetch = Invoke-RestMethod -Uri "$BaseUrl/finance/invoices/$($inv.invoice.id)" -Headers $authHeaders -Method Get

Write-Host "[e2e] Messaging: add message + summary"
$msg = InvokeJsonPost "$BaseUrl/projects/$($proj.id)/messages" @{ content = "Point quotidien OK" } $authHeaders
$sum = Invoke-RestMethod -Uri "$BaseUrl/projects/$($proj.id)/messages/summary" -Headers $authHeaders -Method Get

Write-Host "[e2e] Analytics dashboard"
$dash = Invoke-RestMethod -Uri "$BaseUrl/analytics/dashboard" -Headers $authHeaders -Method Get

"" | Select-Object @{n='status';e={'ok'}},
  @{n='orgId';e={$orgId}},
  @{n='projectId';e={$proj.id}},
  @{n='invoiceTotal';e={$invFetch.totals.total}},
  @{n='messages';e={$sum.count}},
  @{n='revenue';e={$dash.kpis.revenue}} | Format-List | Out-String | Write-Host

