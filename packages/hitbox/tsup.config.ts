import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    // root barrel
    index: 'src/index.ts',

    // public subpaths (match package.json "exports")
    types: 'src/types.ts',
    'closest-edge': 'src/closest-edge.ts',
    'list-item': 'src/list-item.ts',
    'tree-item': 'src/tree-item.ts',

    // util/* — source files live at repo root, not src/util/*
    'util/reorder-with-edge': 'src/reorder-with-edge.ts',
    'util/get-reorder-destination-index': 'src/get-reorder-destination-index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,           // .d.ts per entry
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,    // stable filenames: .js/.cjs alongside .d.ts
  target: 'es2019',
  platform: 'browser',
  minify: false,
});
