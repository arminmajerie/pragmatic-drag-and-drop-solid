import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const [relativePackagePath, ...npmArgs] = process.argv.slice(2);

if (!relativePackagePath || npmArgs.length === 0) {
  process.stderr.write('Usage: node ./run-package-npm.mjs <package-path> <npm args...>\n');
  process.exit(1);
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npmExecPath = process.env.npm_execpath;
const npmRunner = npmExecPath ? process.execPath : npmCommand;
const npmPrefixArgs = npmExecPath ? [npmExecPath] : [];
const packageDirectory = path.resolve(__dirname, relativePackagePath);

const result = spawnSync(npmRunner, [...npmPrefixArgs, ...npmArgs], {
  cwd: packageDirectory,
  stdio: 'inherit',
  shell: !npmExecPath && process.platform === 'win32',
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);