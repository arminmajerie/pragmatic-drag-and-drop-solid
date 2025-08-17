// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'drag-handle-button': 'src/drag-handle-button.tsx',
    'drag-handle-button-small': 'src/drag-handle-button-small.tsx',
    styles: 'src/styles.css',          // <— add this
  },
  format: ['esm', 'cjs'],
  dts: true,
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  target: 'es2019',
  platform: 'browser',
  external: ['solid-js'],
  loader: { '.css': 'copy' },          // <— copy CSS as a file
});
