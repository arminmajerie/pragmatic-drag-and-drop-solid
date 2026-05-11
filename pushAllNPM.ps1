param(
  [string]$PlanPath = (Join-Path $PSScriptRoot 'npm-release-plan.json'),

  [string]$Registry,

  [string]$InstallRegistry,

  [ValidateSet('public', 'restricted')]
  [string]$DefaultAccess = 'public',

  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$DependencySections = @('dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies')

function Step([string]$Message) {
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Require-Command([string]$CommandName) {
  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "Required command '$CommandName' was not found in PATH."
  }
}

function Read-PackageJson([string]$PackageJsonPath) {
  return Get-Content -LiteralPath $PackageJsonPath -Raw | ConvertFrom-Json
}

function Invoke-Npm([string]$WorkingDirectory, [string[]]$Arguments) {
  Push-Location $WorkingDirectory
  try {
    & npm @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "npm $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
  }
  finally {
    Pop-Location
  }
}

function Invoke-NpmCapture([string]$WorkingDirectory, [string[]]$Arguments) {
  Push-Location $WorkingDirectory
  try {
    $output = & npm @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
      $rendered = ($output | Out-String).Trim()
      throw "npm $($Arguments -join ' ') failed with exit code $LASTEXITCODE`n$rendered"
    }

    return ($output | Out-String)
  }
  finally {
    Pop-Location
  }
}

function Get-PackedTarballPath([string]$WorkingDirectory, [string]$DestinationDirectory) {
  $output = Invoke-NpmCapture -WorkingDirectory $WorkingDirectory -Arguments @('pack', '--workspaces=false', '--json', '--pack-destination', $DestinationDirectory)
  $packed = $output | ConvertFrom-Json
  if ($null -eq $packed -or $packed.Count -eq 0 -or [string]::IsNullOrWhiteSpace($packed[0].filename)) {
    throw "npm pack did not return a tarball filename for $WorkingDirectory"
  }

  return Join-Path $DestinationDirectory $packed[0].filename
}

Require-Command npm

if (-not (Test-Path -LiteralPath $PlanPath)) {
  throw "Release plan not found: $PlanPath"
}

$plan = Get-Content -LiteralPath $PlanPath -Raw | ConvertFrom-Json
if ($null -eq $plan.packages -or $plan.packages.Count -eq 0) {
  throw 'The release plan does not contain any packages to publish.'
}

$temporaryTarballDirectory = Join-Path $PSScriptRoot '.release-tarballs'
if (Test-Path -LiteralPath $temporaryTarballDirectory) {
  Remove-Item -LiteralPath $temporaryTarballDirectory -Recurse -Force
}
New-Item -Path $temporaryTarballDirectory -ItemType Directory | Out-Null

$plannedVersions = @{}
foreach ($package in $plan.packages) {
  $plannedVersions[$package.name] = $package.newVersion
}

$localTarballs = @{}

try {
  foreach ($package in $plan.packages) {
    $packageDirectory = Join-Path $PSScriptRoot $package.relativePath
    $packageJsonPath = Join-Path $packageDirectory 'package.json'

    if (-not (Test-Path -LiteralPath $packageJsonPath)) {
      throw "package.json not found for planned package: $packageJsonPath"
    }

    $packageJson = Read-PackageJson -PackageJsonPath $packageJsonPath
    if ($packageJson.version -ne $package.newVersion) {
      throw "Version mismatch for $($package.name): expected $($package.newVersion) but found $($packageJson.version)"
    }

    Step "Installing $($package.name)"
    $installArguments = @('install', '--workspaces=false', '--no-package-lock')
    if (-not [string]::IsNullOrWhiteSpace($InstallRegistry)) {
      $installArguments += @('--registry', $InstallRegistry)
    }
    Invoke-Npm -WorkingDirectory $packageDirectory -Arguments $installArguments

    $overlayTarballs = New-Object System.Collections.Generic.List[string]
    foreach ($section in $DependencySections) {
      if ($packageJson.PSObject.Properties.Name -notcontains $section) {
        continue
      }

      $dependencySection = $packageJson.PSObject.Properties[$section].Value
      if ($null -eq $dependencySection) {
        continue
      }

      foreach ($dependencyProperty in $dependencySection.PSObject.Properties) {
        $dependencyName = $dependencyProperty.Name
        if ($localTarballs.ContainsKey($dependencyName)) {
          $overlayTarballs.Add($localTarballs[$dependencyName])
        }
      }
    }

    if ($overlayTarballs.Count -gt 0) {
      Step "Overlaying local dependencies for $($package.name)"
      $overlayArguments = @('install', '--workspaces=false', '--no-package-lock', '--no-save') + @($overlayTarballs | Select-Object -Unique)
      Invoke-Npm -WorkingDirectory $packageDirectory -Arguments $overlayArguments
    }

    Step "Rebuilding $($package.name)"
    Invoke-Npm -WorkingDirectory $packageDirectory -Arguments @('run', 'rebuild', '--workspaces=false')

    Step "Packing $($package.name)"
    $tarballPath = Get-PackedTarballPath -WorkingDirectory $packageDirectory -DestinationDirectory $temporaryTarballDirectory
    $localTarballs[$package.name] = $tarballPath

    Step "Publishing $($package.name)@$($package.newVersion)"
    $access = if (-not [string]::IsNullOrWhiteSpace($packageJson.publishConfig.access)) { $packageJson.publishConfig.access } else { $DefaultAccess }
    $publishArguments = @('publish', '--workspaces=false', $tarballPath, '--access', $access)
    if ($DryRun) {
      $publishArguments += '--dry-run'
    }
    if (-not [string]::IsNullOrWhiteSpace($Registry)) {
      $publishArguments += @('--registry', $Registry)
    }

    Invoke-Npm -WorkingDirectory $packageDirectory -Arguments $publishArguments
  }
}
finally {
  if (Test-Path -LiteralPath $temporaryTarballDirectory) {
    Remove-Item -LiteralPath $temporaryTarballDirectory -Recurse -Force
  }
}

Write-Host ''
Write-Host "Published $($plan.packages.Count) package(s) from $PlanPath" -ForegroundColor Green