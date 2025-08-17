const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', 'src', 'styles.css');
const outDir = path.resolve(__dirname, '..', 'dist');
const dest = path.join(outDir, 'styles.css');

if (fs.existsSync(src)) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log('Copied styles.css -> dist/styles.css');
} else {
  console.log('styles.css not found, skipping copy.');
}
