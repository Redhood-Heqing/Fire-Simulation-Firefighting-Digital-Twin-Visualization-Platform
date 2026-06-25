param(
  [string]$RvtPath = "D:\档案馆\2 0508.rvt",
  [string]$RevitExe = "D:\Autodesk\Revit 2025\Revit.exe"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$project = Join-Path $root "tools\RevitAutoExporter\RevitAutoExporter.csproj"
$bin = Join-Path $root "tools\RevitAutoExporter\bin\Release\net8.0-windows\FireTwinRevitAutoExporter.dll"
$addinDir = Join-Path $env:APPDATA "Autodesk\Revit\Addins\2025"
$addinPath = Join-Path $addinDir "FireTwinRevitAutoExporter.addin"
$template = Join-Path $root "tools\RevitAutoExporter\FireTwinRevitAutoExporter.addin.template"
$exportDir = Join-Path $root "apps\web\public\models"
$logPath = Join-Path $root "revit-export.log"

dotnet build $project -c Release
New-Item -ItemType Directory -Force -Path $addinDir, $exportDir | Out-Null
(Get-Content -Raw $template).Replace("__ASSEMBLY_PATH__", $bin) | Set-Content -Encoding UTF8 $addinPath

$env:FIRE_TWIN_RVT = $RvtPath
$env:FIRE_TWIN_EXPORT_DIR = $exportDir
$env:FIRE_TWIN_EXPORT_NAME = "library_complex"
$env:FIRE_TWIN_EXPORT_LOG = $logPath
$env:FIRE_TWIN_AUTO_CLOSE = "1"

Start-Process -FilePath $RevitExe -ArgumentList "/language","CHS" -WindowStyle Hidden
Write-Host "Started Revit export. Log: $logPath"
