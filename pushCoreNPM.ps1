param(
  [ValidateSet('patch', 'minor', 'major')]
  [string]$Bump = 'patch',

  [string]$Registry,

  [string]$InstallRegistry,

  [ValidateSet('public', 'restricted')]
  [string]$Access = 'public',

  [switch]$DryRun,

  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Step([string]$Message) {
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command([string]$CommandName) {
  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "Required command '$CommandName' was not found in PATH."
  }
}

function Read-PackageJson([string]$PackageJsonPath) {
  return Get-Content -LiteralPath $PackageJsonPath -Raw | ConvertFrom-Json
}

function Invoke-Pnpm([string]$WorkingDirectory, [string[]]$Arguments) {
  Push-Location $WorkingDirectory
  try {
    & pnpm @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "pnpm $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
  }
  finally {
    Pop-Location
  }
}

function Get-WorkspacePackageJsons([string]$WorkspaceRoot) {
  $excludedDirectoryNames = @(
    '.git',
    'coverage',
    'dist',
    'node_modules',
    'out',
    'target',
    'tmp',
    'vendor'
  )

  $directories = New-Object System.Collections.Generic.Queue[string]
  $packageJsons = New-Object System.Collections.Generic.List[System.IO.FileInfo]
  $directories.Enqueue($WorkspaceRoot)

  while ($directories.Count -gt 0) {
    $directory = $directories.Dequeue()

    foreach ($packageFile in Get-ChildItem -LiteralPath $directory -File -Filter 'package.json') {
      $packageJsons.Add($packageFile)
    }

    foreach ($childDirectory in Get-ChildItem -LiteralPath $directory -Directory) {
      if ($excludedDirectoryNames -contains $childDirectory.Name) {
        continue
      }

      $directories.Enqueue($childDirectory.FullName)
    }
  }

  return $packageJsons
}

function Get-DependencyReferences([string]$WorkspaceRoot, [string]$DependencyName) {
  $sections = @('dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies')
  $references = New-Object System.Collections.Generic.List[object]

  foreach ($packageFile in Get-WorkspacePackageJsons -WorkspaceRoot $WorkspaceRoot) {
    $package = Read-PackageJson -PackageJsonPath $packageFile.FullName

    foreach ($section in $sections) {
      $dependencySection = $package.$section
      if ($null -eq $dependencySection) {
        continue
      }

      if ($dependencySection.PSObject.Properties.Name -contains $DependencyName) {
        $references.Add([pscustomobject]@{
          PackageJsonPath = $packageFile.FullName
          PackageDirectory = $packageFile.DirectoryName
          Section = $section
          CurrentVersion = $dependencySection.$DependencyName
        })
      }
    }
  }

  return $references | Sort-Object PackageJsonPath, Section
}

function Get-InstallRoot([string]$StartDirectory, [string]$WorkspaceRoot) {
  $current = [System.IO.Path]::GetFullPath($StartDirectory)
  $workspaceBoundary = [System.IO.Path]::GetFullPath($WorkspaceRoot)

  while ($true) {
    $pnpmLockPath = Join-Path $current 'pnpm-lock.yaml'
    if (Test-Path -LiteralPath $pnpmLockPath) {
      return $current
    }

    $pnpmWorkspacePath = Join-Path $current 'pnpm-workspace.yaml'
    if (Test-Path -LiteralPath $pnpmWorkspacePath) {
      return $current
    }

    $packageLockPath = Join-Path $current 'package-lock.json'
    if (Test-Path -LiteralPath $packageLockPath) {
      return $current
    }

    $packageJsonPath = Join-Path $current 'package.json'
    if (Test-Path -LiteralPath $packageJsonPath) {
      $package = Read-PackageJson -PackageJsonPath $packageJsonPath
      if ($null -ne $package.workspaces) {
        return $current
      }
    }

    if ([string]::Equals($current, $workspaceBoundary, [System.StringComparison]::OrdinalIgnoreCase)) {
      return $null
    }

    $parent = Split-Path -Path $current -Parent
    if ([string]::IsNullOrWhiteSpace($parent) -or [string]::Equals($parent, $current, [System.StringComparison]::OrdinalIgnoreCase)) {
      return $null
    }

    $current = $parent
  }
}

Assert-Command pnpm

$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$corePackageDirectory = Join-Path $PSScriptRoot 'packages\core'
$corePackageJsonPath = Join-Path $corePackageDirectory 'package.json'
$dependencyName = '@arminmajerie/pragmatic-drag-and-drop'

if (-not (Test-Path -LiteralPath $corePackageJsonPath)) {
  throw "package.json not found: $corePackageJsonPath"
}

$corePackage = Read-PackageJson -PackageJsonPath $corePackageJsonPath
if ($corePackage.name -ne $dependencyName) {
  throw "Expected package name '$dependencyName' but found '$($corePackage.name)'"
}

$references = @(Get-DependencyReferences -WorkspaceRoot $workspaceRoot -DependencyName $dependencyName)

Push-Location $corePackageDirectory
try {
  Step "Bumping $dependencyName version ($Bump)"
  & pnpm version $Bump --no-git-tag-version
  if ($LASTEXITCODE -ne 0) {
    throw "pnpm version failed with exit code $LASTEXITCODE"
  }

  $currentCorePackage = Read-PackageJson -PackageJsonPath $corePackageJsonPath
  $newVersion = $currentCorePackage.version

  if ($DryRun) {
    Step "Dry run: packing $dependencyName@$newVersion"
    & pnpm pack
    if ($LASTEXITCODE -ne 0) {
      throw "pnpm pack failed with exit code $LASTEXITCODE"
    }

    Write-Host "[OK] Packed $dependencyName@$newVersion (consumer package.json files were not changed in dry-run mode)" -ForegroundColor Green
    return
  }

  Step "Publishing $dependencyName@$newVersion"
  $publishArgs = @('publish', '--access', $Access)
  if (-not [string]::IsNullOrWhiteSpace($Registry)) {
    $publishArgs += @('--registry', $Registry)
  }

  & pnpm @publishArgs
  if ($LASTEXITCODE -ne 0) {
    throw "pnpm publish failed with exit code $LASTEXITCODE"
  }

  if ($references.Count -gt 0) {
    Step "Updating $($references.Count) consumer dependency entries to $newVersion"
    foreach ($reference in $references) {
      Invoke-Pnpm -WorkingDirectory $reference.PackageDirectory -Arguments @('pkg', 'set', "$($reference.Section).$dependencyName=$newVersion")
      Write-Host "  updated $($reference.PackageJsonPath) [$($reference.Section)]" -ForegroundColor DarkGray
    }
  }
  else {
    Step 'No consumer package.json files reference the core package'
  }

  if (-not $SkipInstall) {
    $installRoots = New-Object System.Collections.Generic.HashSet[string] ([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($reference in $references) {
      $installRoot = Get-InstallRoot -StartDirectory $reference.PackageDirectory -WorkspaceRoot $workspaceRoot
      if (-not [string]::IsNullOrWhiteSpace($installRoot)) {
        [void]$installRoots.Add($installRoot)
      }
    }

    foreach ($installRoot in ($installRoots | Sort-Object)) {
      Step "Refreshing install metadata in $installRoot"
      $installArgs = @('install')
      if (-not [string]::IsNullOrWhiteSpace($InstallRegistry)) {
        $installArgs += @('--registry', $InstallRegistry)
      }

      Invoke-Pnpm -WorkingDirectory $installRoot -Arguments $installArgs
    }
  }

  Write-Host "[OK] Published $dependencyName@$newVersion" -ForegroundColor Green
}
finally {
  Pop-Location
}
