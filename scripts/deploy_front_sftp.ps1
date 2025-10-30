Param(
  [string]$Host = $env:O2SWITCH_SFTP_HOST,
  [string]$User = $env:O2SWITCH_SFTP_USER,
  [string]$Password = $env:O2SWITCH_SFTP_PASS,
  [string]$RemotePath = $(if ($env:O2SWITCH_SFTP_PATH) { $env:O2SWITCH_SFTP_PATH } else { '/public_html' })
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path "$PSScriptRoot/..").Path
$Front = Join-Path $Root 'frontend'

if (-not $Host -or -not $User -or -not $Password) {
  Write-Error "Missing SFTP credentials. Set O2SWITCH_SFTP_HOST/USER/PASS or pass params."; exit 1
}

Push-Location $Front
if (Test-Path 'package.json') {
  npm ci 2>$null; if ($LASTEXITCODE -ne 0) { npm install }
  npm run build
}
Pop-Location

$Dist = Join-Path $Front 'dist'
if (-not (Test-Path $Dist)) { Write-Error "dist/ not found. Build failed?"; exit 1 }

# Try WinSCP .NET automation first
$WinScpNet = 'C:\Program Files (x86)\WinSCP\WinSCPnet.dll'
if (-not (Test-Path $WinScpNet)) { $WinScpNet = 'C:\Program Files\WinSCP\WinSCPnet.dll' }
if (Test-Path $WinScpNet) {
  Add-Type -Path $WinScpNet
  $sessionOptions = New-Object WinSCP.SessionOptions -Property @{ Protocol = [WinSCP.Protocol]::Sftp; HostName = $Host; UserName = $User; Password = $Password; SshHostKeyPolicy = [WinSCP.SshHostKeyPolicy]::GiveUpSecurityAndAcceptAny }
  $session = New-Object WinSCP.Session
  $session.Open($sessionOptions)
  $transferOptions = New-Object WinSCP.TransferOptions
  $transferOptions.TransferMode = [WinSCP.TransferMode]::Binary
  $res = $session.PutFiles((Join-Path $Dist '*'), $RemotePath, $true, $transferOptions)
  $res.Check()
  $session.Dispose()
  Write-Host "[deploy] Upload complete to $Host:$RemotePath"
  exit 0
}

# Fallback: psftp (PuTTY). Requires psftp in PATH.
if (Get-Command psftp -ErrorAction SilentlyContinue) {
  Write-Host "[deploy] Using psftp (no recursive support by default). Uploading files in root only."
  Push-Location $Dist
  Get-ChildItem -File | ForEach-Object { psftp "$User@$Host" -pw "$Password" -b:"-" 2>$null << "EOF"
cd $RemotePath
put "$($_.Name)"
bye
EOF
  }
  Pop-Location
  Write-Host "[deploy] Upload attempted via psftp (root files). For full upload use WinSCP."
  exit 0
}

Write-Error "No WinSCP .NET or psftp found. Install WinSCP (recommended)."

