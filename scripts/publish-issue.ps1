<#
Copies exactly eight page images into a dated issue folder and makes that issue
the first (latest) item in data/issues.json. Run it from PowerShell:

  .\scripts\publish-issue.ps1 -SourceFolder "C:\Newspaper\20-11-2026"
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateScript({ Test-Path $_ -PathType Container })]
  [string]$SourceFolder,
  [datetime]$IssueDate = (Get-Date),
  [string]$Edition = "",
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$dateKey = $IssueDate.ToString('yyyy-MM-dd')
$targetDirectory = Join-Path $projectRoot "issues\$dateKey"
$manifestPath = Join-Path $projectRoot 'data\issues.json'

$images = Get-ChildItem -LiteralPath $SourceFolder -File |
  Where-Object { $_.Extension -match '^\.(jpe?g|png|webp)$' } |
  Sort-Object @{ Expression = { [int]([regex]::Match($_.BaseName, '\d+').Value) } }, Name

if ($images.Count -ne 8) {
  throw "Exactly 8 JPG, PNG, or WebP images are required. Found $($images.Count)."
}
if ((Test-Path -LiteralPath $targetDirectory) -and -not $Force) {
  throw "Issue folder already exists: $targetDirectory. Use -Force only if you intentionally want to replace it."
}

New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
$pageLabels = @('मुखपृष्ठ', 'संमिश्र', 'जिल्हा', 'संपादकीय', 'संभाजीनगर', 'जालना', 'संमिश्र', 'शेवटचे पान')
$marathiNumbers = @('१', '२', '३', '४', '५', '६', '७', '८')
$pages = @()

for ($index = 0; $index -lt 8; $index++) {
  $extension = $images[$index].Extension.ToLowerInvariant()
  $fileName = "page$($index + 1)$extension"
  Copy-Item -LiteralPath $images[$index].FullName -Destination (Join-Path $targetDirectory $fileName) -Force
  $pages += [ordered]@{
    number = $marathiNumbers[$index]
    label = $pageLabels[$index]
    image = "issues/$dateKey/$fileName"
  }
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$issue = [pscustomobject]@{
  date = $dateKey
  title = 'दैनिक सूर्यप्रभा'
  edition = $Edition
  pages = $pages
}
$manifest.issues = @($manifest.issues | Where-Object { $_.date -ne $dateKey })
$manifest.issues = @($issue) + @($manifest.issues)
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding utf8

Write-Host "Published $dateKey with 8 pages."
Write-Host "Next: git add . ; git commit -m 'Publish $dateKey issue' ; git push"
