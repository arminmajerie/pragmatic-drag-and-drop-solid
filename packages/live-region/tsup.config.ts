// packages/live-region/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: { entry: 'src/index.ts' },
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,          // single entry, keep filenames stable
  target: 'es2019',
  platform: 'browser',
  external: ['solid-js'],    // don’t bundle peer
  minify: false
});
