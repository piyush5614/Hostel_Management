param(
  [string]$Output = "hostel-connect-handoff.zip"
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$archive = [System.IO.Path]::GetFullPath($Output)

if (Test-Path $archive) {
  Remove-Item $archive -Force
}

tar.exe -a -c -f $archive `
  --exclude=node_modules `
  --exclude=dist `
  --exclude=test-results `
  --exclude=playwright-report `
  --exclude=.git `
  -C $root .

Write-Host "Created $archive"