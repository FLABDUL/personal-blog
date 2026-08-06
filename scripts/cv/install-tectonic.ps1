$ErrorActionPreference = "Stop"

$version = "0.16.9"
$archiveName = "tectonic-$version-x86_64-pc-windows-msvc.zip"
$downloadUrl = "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40$version/$archiveName"
$expectedSha256 = "131a24604785a9600989a3d91225f597df52ac06f00aeffe86fd529f99ee5cdd"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$toolsDirectory = Join-Path $root ".tools\tectonic"
$temporaryDirectory = Join-Path $root "tmp\pdfs\tectonic-install"
$archivePath = Join-Path $temporaryDirectory $archiveName

New-Item -ItemType Directory -Force -Path $toolsDirectory | Out-Null
New-Item -ItemType Directory -Force -Path $temporaryDirectory | Out-Null

Invoke-WebRequest -Uri $downloadUrl -OutFile $archivePath
$actualSha256 = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()

if ($actualSha256 -ne $expectedSha256) {
  throw "Tectonic archive checksum mismatch. Expected $expectedSha256 but received $actualSha256."
}

Expand-Archive -LiteralPath $archivePath -DestinationPath $toolsDirectory -Force
Remove-Item -LiteralPath $archivePath -Force
Remove-Item -LiteralPath $temporaryDirectory -Force

$binaryPath = Join-Path $toolsDirectory "tectonic.exe"
if (-not (Test-Path -LiteralPath $binaryPath)) {
  throw "Tectonic installation completed without creating $binaryPath."
}

& $binaryPath --version
Write-Output "Installed verified Tectonic $version at $binaryPath"
