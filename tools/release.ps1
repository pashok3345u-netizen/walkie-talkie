# Publishes a Walkie-Talkie version into the GitHub repo folder (same result as release.py,
# for computers without Python):
#   update.json        - what the program checks (version, engine, notes, files + SHA-256)
#   v<N>/<files>       - the files the program downloads (everything in app/ except the installer-only ones)
#   Walkie-Talkie.zip  - the installer for new people
# usage: powershell -NoProfile -ExecutionPolicy Bypass -File tools\release.ps1 <package dir with install.bat + app\> <repo dir> "<notes>"
param(
  [Parameter(Mandatory = $true)][string]$Pkg,
  [Parameter(Mandatory = $true)][string]$Repo,
  [string]$Notes = ''
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$Pkg = (Resolve-Path $Pkg).Path
$Repo = (Resolve-Path $Repo).Path
$App = Join-Path $Pkg 'app'
$utf8 = New-Object System.Text.UTF8Encoding($false)   # no BOM
$ver = [IO.File]::ReadAllText((Join-Path $App 'version.json'), $utf8) | ConvertFrom-Json
$V = [int]$ver.version
$Engine = [string]$ver.engine
$Fixed = @('loader.js', 'package.json', 'version.json')   # only the installer puts these

function JsonStr([string]$s) {
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.Append('"')
  foreach ($c in $s.ToCharArray()) {
    switch ($c) {
      '"' { [void]$sb.Append('\"') }
      '\' { [void]$sb.Append('\\') }
      "`n" { [void]$sb.Append('\n') }
      "`r" { [void]$sb.Append('\r') }
      "`t" { [void]$sb.Append('\t') }
      default {
        if ([int]$c -lt 0x20) { [void]$sb.Append(('\u{0:x4}' -f [int]$c)) } else { [void]$sb.Append($c) }
      }
    }
  }
  [void]$sb.Append('"')
  return $sb.ToString()
}

# keep only the newest version's files
Get-ChildItem -Path $Repo -Directory | Where-Object { $_.Name -match '^v\d+$' -and [int]$_.Name.Substring(1) -ne $V } |
  ForEach-Object { Remove-Item $_.FullName -Recurse -Force }
$VDir = Join-Path $Repo ('v' + $V)
if (Test-Path $VDir) { Remove-Item $VDir -Recurse -Force }
New-Item -ItemType Directory -Path $VDir | Out-Null

$names = [string[]](Get-ChildItem -Path $App -File | ForEach-Object { $_.Name })
[Array]::Sort($names, [StringComparer]::Ordinal)
$sha = [Security.Cryptography.SHA256]::Create()
$lines = @()
foreach ($f in $names) {
  if ($Fixed -contains $f -or $f.ToLower().EndsWith('.exe')) { continue }
  $b = [IO.File]::ReadAllBytes((Join-Path $App $f))
  [IO.File]::WriteAllBytes((Join-Path $VDir $f), $b)
  $h = -join ($sha.ComputeHash($b) | ForEach-Object { $_.ToString('x2') })
  $lines += ('    ' + (JsonStr $f) + ': ' + (JsonStr $h))
}
$json = "{`n  `"version`": $V,`n  `"minEngine`": " + (JsonStr $Engine) + ",`n  `"notes`": " + (JsonStr $Notes) +
  ",`n  `"files`": {`n" + ($lines -join ",`n") + "`n  }`n}"
[IO.File]::WriteAllText((Join-Path $Repo 'update.json'), $json, $utf8)

# the installer: everything in the package folder, paths with forward slashes
$ZipPath = Join-Path $Repo 'Walkie-Talkie.zip'
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
$zip = [IO.Compression.ZipFile]::Open($ZipPath, [IO.Compression.ZipArchiveMode]::Create)
try {
  $files = Get-ChildItem -Path $Pkg -Recurse -File | ForEach-Object { $_.FullName.Substring($Pkg.Length).TrimStart('\').Replace('\', '/') }
  $files = [string[]]$files
  [Array]::Sort($files, [StringComparer]::Ordinal)
  foreach ($rel in $files) {
    [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $Pkg $rel.Replace('/', '\')), $rel, [IO.Compression.CompressionLevel]::Optimal)
  }
} finally { $zip.Dispose() }
Write-Host ('version ' + $V + ' files ' + $lines.Count + ' zip ' + (Get-Item $ZipPath).Length)
