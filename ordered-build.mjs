import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageDirectories = [
  'packages/core',
  'packages/hitbox',
  'packages/auto-scroll',
  'packages/solid-drop-indicator',
  'packages/flourish',
  'packages/live-region',
  'packages/solid-accessibility',
];

const supportedModes = new Set(['clean', 'build', 'rebuild']);
const requestedMode = process.argv[2];
const mode = supportedModes.has(requestedMode) ? requestedMode : 'rebuild';
const tempDirectory = mkdtempSync(path.join(tmpdir(), 'pragmatic-dnd-build-'));
const localTarballs = new Map();
const dependencySections = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

function logStep(message) {
  process.stdout.write(`\n==> ${message}\n`);
}

function readPackageJson(packageDirectory) {
  const packageJsonPath = path.join(packageDirectory, 'package.json');
  return JSON.parse(readFileSync(packageJsonPath, 'utf8'));
}

function run(command, args, cwd, label) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0 || result.error) {
    const detail = result.error ? ` (${result.error.message})` : '';
    throw new Error(`${label} failed with exit code ${result.status ?? 'unknown'}${detail}`);
  }
}

function packPackage(cwd) {
  const result = spawnSync(
    npmCommand,
    ['pack', '--workspaces=false', '--json', '--pack-destination', tempDirectory],
    {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
      shell: process.platform === 'win32',
    },
  );

  if (result.status !== 0 || result.error) {
    const detail = result.error ? ` (${result.error.message})` : '';
    throw new Error(`npm pack failed in ${cwd} with exit code ${result.status ?? 'unknown'}${detail}`);
  }

  const packed = JSON.parse(result.stdout);
  if (!Array.isArray(packed) || packed.length === 0 || !packed[0].filename) {
    throw new Error(`npm pack did not return a tarball filename for ${cwd}`);
  }

  return path.join(tempDirectory, packed[0].filename);
}

function getDependencyEntries(packageJson) {
  const entries = [];
  for (const sectionName of dependencySections) {
    const section = packageJson[sectionName] ?? {};
    for (const [dependencyName, dependencyVersion] of Object.entries(section)) {
      entries.push({
        sectionName,
        dependencyName,
        dependencyVersion,
      });
    }
  }

  return entries;
}

function getExternalDependencySpecs(packageJson, internalPackageNames) {
  const specs = [];
  for (const { dependencyName, dependencyVersion } of getDependencyEntries(packageJson)) {
    if (internalPackageNames.has(dependencyName)) {
      continue;
    }

    specs.push(`${dependencyName}@${dependencyVersion}`);
  }

  return [...new Set(specs)];
}

function getInternalDependencyTarballs(packageJson, internalPackageNames) {
  const tarballs = [];
  for (const { dependencyName } of getDependencyEntries(packageJson)) {
    if (!internalPackageNames.has(dependencyName)) {
      continue;
    }

    const tarball = localTarballs.get(dependencyName);
    if (!tarball) {
      throw new Error(`Internal dependency ${dependencyName} is not available as a local tarball yet.`);
    }

    tarballs.push(tarball);
  }

  return [...new Set(tarballs)];
}

function resetInstallState(packageDirectory) {
  rmSync(path.join(packageDirectory, 'node_modules'), { recursive: true, force: true });
  rmSync(path.join(packageDirectory, 'package-lock.json'), { force: true });
}

const internalPackageNames = new Set(
  packageDirectories.map((relativeDirectory) => {
    const packageDirectory = path.join(__dirname, relativeDirectory);
    return readPackageJson(packageDirectory).name;
  }),
);

try {
  for (const relativeDirectory of packageDirectories) {
    const packageDirectory = path.join(__dirname, relativeDirectory);
    const packageJson = readPackageJson(packageDirectory);

    if (mode === 'clean') {
      logStep(`Cleaning ${packageJson.name}`);
      run(
        npmCommand,
        ['run', 'clean', '--workspaces=false'],
        packageDirectory,
        `npm run clean for ${packageJson.name}`,
      );
      continue;
    }

    resetInstallState(packageDirectory);

    const externalDependencySpecs = getExternalDependencySpecs(packageJson, internalPackageNames);
    const internalTarballs = getInternalDependencyTarballs(packageJson, internalPackageNames);
    const installSpecs = [...externalDependencySpecs, ...internalTarballs];

    if (installSpecs.length > 0) {
      logStep(`Installing dependencies for ${packageJson.name}`);
      run(
        npmCommand,
        ['install', '--workspaces=false', '--no-package-lock', '--no-save', '--no-audit', '--no-fund', ...installSpecs],
        packageDirectory,
        `npm install dependencies for ${packageJson.name}`,
      );
    }

    logStep(`${mode === 'rebuild' ? 'Rebuilding' : 'Building'} ${packageJson.name}`);
    run(
      npmCommand,
      ['run', mode, '--workspaces=false'],
      packageDirectory,
      `npm run ${mode} for ${packageJson.name}`,
    );

    logStep(`Packing ${packageJson.name}`);
    const tarballPath = packPackage(packageDirectory);
    localTarballs.set(packageJson.name, tarballPath);
  }
}
finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}