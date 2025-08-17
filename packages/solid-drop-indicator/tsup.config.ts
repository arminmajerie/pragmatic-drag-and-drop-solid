import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    border: 'src/border.tsx',
    box: 'src/box.tsx',
    group: 'src/group.tsx',
    'list-item': 'src/list-item.tsx',
    types: 'src/types.ts',
    'tree-item': 'src/tree-item.tsx'
  },
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
