Param(
  [string]$BaseUrl = $env:BACKEND_URL
)

if (-not $BaseUrl) { $BaseUrl = 'https://api.msmarrakech.com' }

function Code($u){ try { (Invoke-WebRequest -UseBasicParsing -Uri $u -TimeoutSec 15).StatusCode.value__ } catch { try { $_.Exception.Response.StatusCode.value__ } catch { 0 } } }
function Show($u){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri $u -TimeoutSec 15; Write-Host ("$u -> " + $r.StatusCode.value__); if($r.Content){ $c=$r.Content; if($c.Length -gt 180){ $c=$c.Substring(0,180) }; Write-Host $c } } catch { try { Write-Host ("$u -> HTTP " + $_.Exception.Response.StatusCode.value__) } catch { Write-Host ("$u -> ERR") } } }

Write-Host "Testing base: $BaseUrl" -ForegroundColor Cyan
Show "$BaseUrl/health"
Show "$BaseUrl/health?db=1"
Show "$BaseUrl/test/ping"
Show "$BaseUrl/test/env"
Show "$BaseUrl/test/db"
Show "$BaseUrl/test/ai"
Show "$BaseUrl/ai/health"

