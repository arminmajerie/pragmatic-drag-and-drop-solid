import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' }, // TSX entry (Solid later)
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  treeshake: true,
  clean: true,
  outDir: 'dist',
  minify: false,
  esbuildOptions(options) {
    options.jsx = 'automatic';
    options.jsxImportSource = 'solid-js';
  }
});
