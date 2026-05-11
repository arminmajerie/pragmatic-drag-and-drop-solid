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
  'packages/solid-beautiful-dnd-autoscroll',
];

const mode = process.argv[2] === 'build' ? 'build' : 'rebuild';
const tempDirectory = mkdtempSync(path.join(tmpdir(), 'pragmatic-dnd-build-'));
const localTarballs = new Map();

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

function getInternalDependencyTarballs(packageJson) {
  const dependencySections = [
    packageJson.dependencies ?? {},
    packageJson.devDependencies ?? {},
  ];

  const tarballs = [];
  for (const section of dependencySections) {
    for (const dependencyName of Object.keys(section)) {
      const tarball = localTarballs.get(dependencyName);
      if (tarball) {
        tarballs.push(tarball);
      }
    }
  }

  return [...new Set(tarballs)];
}

try {
  for (const relativeDirectory of packageDirectories) {
    const packageDirectory = path.join(__dirname, relativeDirectory);
    const packageJson = readPackageJson(packageDirectory);

    logStep(`Installing ${packageJson.name}`);
    run(
      npmCommand,
      ['install', '--workspaces=false', '--no-package-lock'],
      packageDirectory,
      `npm install for ${packageJson.name}`,
    );

    const internalTarballs = getInternalDependencyTarballs(packageJson);
    if (internalTarballs.length > 0) {
      logStep(`Overlaying local dependencies for ${packageJson.name}`);
      run(
        npmCommand,
        ['install', '--workspaces=false', '--no-package-lock', '--no-save', ...internalTarballs],
        packageDirectory,
        `npm install local tarballs for ${packageJson.name}`,
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