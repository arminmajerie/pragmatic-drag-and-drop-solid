param(
  [string[]]$Targets = @('@arminmajerie/pragmatic-drag-and-drop'),

  [ValidateSet('patch', 'minor', 'major')]
  [string]$TargetBump = 'patch',

  [ValidateSet('patch', 'minor', 'major')]
  [string]$DependentBump = 'patch',

  [string]$PlanPath = (Join-Path $PSScriptRoot 'npm-release-plan.json'),

  [switch]$ExcludeMigrationPackage,

  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$DependencySections = @('dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies')
$MigrationPackageName = '@arminmajerie/pragmatic-drag-and-drop-react-beautiful-dnd-migration'

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

function Get-BumpedVersion([string]$Version, [string]$BumpKind) {
  $match = [System.Text.RegularExpressions.Regex]::Match($Version, '^(\d+)\.(\d+)\.(\d+)$')
  if (-not $match.Success) {
    throw "Unsupported semantic version '$Version'."
  }

  $major = [int]$match.Groups[1].Value
  $minor = [int]$match.Groups[2].Value
  $patch = [int]$match.Groups[3].Value

  switch ($BumpKind) {
    'major' {
      $major += 1
      $minor = 0
      $patch = 0
      break
    }
    'minor' {
      $minor += 1
      $patch = 0
      break
    }
    'patch' {
      $patch += 1
      break
    }
  }

  return "$major.$minor.$patch"
}

function Get-ReleasePackages([string]$PackagesRoot, [bool]$IncludeMigration) {
  $packagesByName = @{}

  foreach ($packageDirectory in Get-ChildItem -LiteralPath $PackagesRoot -Directory | Sort-Object Name) {
    $packageJsonPath = Join-Path $packageDirectory.FullName 'package.json'
    if (-not (Test-Path -LiteralPath $packageJsonPath)) {
      continue
    }

    $packageJson = Read-PackageJson -PackageJsonPath $packageJsonPath
    if (-not $IncludeMigration -and $packageJson.name -eq $MigrationPackageName) {
      continue
    }

    $packagesByName[$packageJson.name] = [pscustomobject]@{
      Name = $packageJson.name
      Path = $packageDirectory.FullName
      RelativePath = [System.IO.Path]::GetRelativePath($PSScriptRoot, $packageDirectory.FullName)
      PackageJsonPath = $packageJsonPath
      Version = $packageJson.version
      InternalDependencyReferences = (New-Object System.Collections.Generic.List[object])
    }
  }

  foreach ($package in $packagesByName.Values) {
    $packageJson = Read-PackageJson -PackageJsonPath $package.PackageJsonPath
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
        if ($packagesByName.ContainsKey($dependencyName)) {
          $package.InternalDependencyReferences.Add([pscustomobject]@{
            Section = $section
            Name = $dependencyName
            Version = $dependencyProperty.Value
          })
        }
      }
    }
  }

  return $packagesByName
}

function Get-ReverseDependencies($PackagesByName) {
  $reverseDependencies = @{}
  foreach ($packageName in $PackagesByName.Keys) {
    $reverseDependencies[$packageName] = New-Object System.Collections.Generic.List[string]
  }

  foreach ($package in $PackagesByName.Values) {
    foreach ($reference in $package.InternalDependencyReferences) {
      $reverseDependencies[$reference.Name].Add($package.Name)
    }
  }

  return $reverseDependencies
}

function Get-AffectedPackages($ReverseDependencies, [string[]]$TargetNames) {
  $affected = @{}
  $pending = New-Object System.Collections.Generic.Queue[string]

  foreach ($targetName in $TargetNames) {
    if (-not $affected.ContainsKey($targetName)) {
      $affected[$targetName] = $true
      $pending.Enqueue($targetName)
    }
  }

  while ($pending.Count -gt 0) {
    $current = $pending.Dequeue()
    foreach ($dependentName in $ReverseDependencies[$current]) {
      if (-not $affected.ContainsKey($dependentName)) {
        $affected[$dependentName] = $true
        $pending.Enqueue($dependentName)
      }
    }
  }

  return $affected
}

function Get-TopologicalOrder($PackagesByName, $ReverseDependencies, $Affected) {
  $inDegree = @{}
  $ready = New-Object System.Collections.Generic.List[string]
  $ordered = New-Object System.Collections.Generic.List[string]

  foreach ($packageName in $Affected.Keys) {
    $internalDependencies = @(
      $PackagesByName[$packageName].InternalDependencyReferences |
        Where-Object { $Affected.ContainsKey($_.Name) } |
        Select-Object -ExpandProperty Name -Unique
    )

    $inDegree[$packageName] = $internalDependencies.Count
    if ($internalDependencies.Count -eq 0) {
      [void]$ready.Add($packageName)
    }
  }

  while ($ready.Count -gt 0) {
    $current = $ready | Sort-Object | Select-Object -First 1
    [void]$ready.Remove($current)
    [void]$ordered.Add($current)

    foreach ($dependentName in ($ReverseDependencies[$current] | Sort-Object -Unique)) {
      if (-not $Affected.ContainsKey($dependentName)) {
        continue
      }

      $inDegree[$dependentName] -= 1
      if ($inDegree[$dependentName] -eq 0) {
        [void]$ready.Add($dependentName)
      }
    }
  }

  if ($ordered.Count -ne $Affected.Count) {
    throw 'Unable to compute a publish order because the internal package dependency graph contains a cycle.'
  }

  return @($ordered)
}

Require-Command npm

$packagesRoot = Join-Path $PSScriptRoot 'packages'
if (-not (Test-Path -LiteralPath $packagesRoot)) {
  throw "Packages directory not found: $packagesRoot"
}

$packagesByName = Get-ReleasePackages -PackagesRoot $packagesRoot -IncludeMigration (-not [bool]$ExcludeMigrationPackage)
if ($packagesByName.Count -eq 0) {
  throw 'No releasable packages were found.'
}

foreach ($targetName in $Targets) {
  if (-not $packagesByName.ContainsKey($targetName)) {
    throw "Target package '$targetName' was not found in the release graph."
  }
}

$reverseDependencies = Get-ReverseDependencies -PackagesByName $packagesByName
$affected = Get-AffectedPackages -ReverseDependencies $reverseDependencies -TargetNames $Targets
$orderedPackageNames = Get-TopologicalOrder -PackagesByName $packagesByName -ReverseDependencies $reverseDependencies -Affected $affected

$newVersions = @{}
$planPackages = @()

foreach ($packageName in $orderedPackageNames) {
  $package = $packagesByName[$packageName]
  $isTarget = $Targets -contains $packageName
  $bumpKind = if ($isTarget) { $TargetBump } else { $DependentBump }
  $oldVersion = $package.Version

  if ($DryRun) {
    $newVersion = Get-BumpedVersion -Version $oldVersion -BumpKind $bumpKind
  }
  else {
    Step "Bumping $packageName ($bumpKind)"
    Invoke-Npm -WorkingDirectory $package.Path -Arguments @('version', $bumpKind, '--workspaces=false', '--no-git-tag-version')
    $newVersion = (Read-PackageJson -PackageJsonPath $package.PackageJsonPath).version
  }

  $dependencyUpdates = @()
  foreach ($reference in ($package.InternalDependencyReferences | Sort-Object Section, Name)) {
    if (-not $newVersions.ContainsKey($reference.Name)) {
      continue
    }

    $updatedDependencyVersion = $newVersions[$reference.Name]
    if ($reference.Version -eq $updatedDependencyVersion) {
      continue
    }

    if (-not $DryRun) {
      Invoke-Npm -WorkingDirectory $package.Path -Arguments @('pkg', 'set', '--workspaces=false', "$($reference.Section).$($reference.Name)=$updatedDependencyVersion")
    }

    $dependencyUpdates += [pscustomobject]@{
      dependency = $reference.Name
      section = $reference.Section
      from = $reference.Version
      to = $updatedDependencyVersion
    }

    $reference.Version = $updatedDependencyVersion
  }

  $package.Version = $newVersion
  $newVersions[$packageName] = $newVersion

  $planPackages += [pscustomobject]@{
    name = $packageName
    relativePath = $package.RelativePath
    oldVersion = $oldVersion
    newVersion = $newVersion
    bumpType = $bumpKind
    dependencyUpdates = @($dependencyUpdates)
  }
}

$plan = [ordered]@{
  generatedAt = (Get-Date).ToString('o')
  targets = @($Targets)
  targetBump = $TargetBump
  dependentBump = $DependentBump
  includeMigrationPackage = (-not [bool]$ExcludeMigrationPackage)
  packages = @($planPackages)
}

$planJson = $plan | ConvertTo-Json -Depth 10
Set-Content -LiteralPath $PlanPath -Value $planJson -Encoding utf8

Write-Host ''
Write-Host 'Release Plan' -ForegroundColor Green
foreach ($package in $planPackages) {
  Write-Host "  $($package.name): $($package.oldVersion) -> $($package.newVersion) [$($package.bumpType)]"
  foreach ($dependencyUpdate in $package.dependencyUpdates) {
    Write-Host "    updates $($dependencyUpdate.section).$($dependencyUpdate.dependency): $($dependencyUpdate.from) -> $($dependencyUpdate.to)" -ForegroundColor DarkGray
  }
}

Write-Host ''
Write-Host "Plan written to $PlanPath" -ForegroundColor Green
if (-not $DryRun) {
  Write-Host 'Next: commit and push these version changes, then run pushAllNPM.ps1.' -ForegroundColor Yellow
}