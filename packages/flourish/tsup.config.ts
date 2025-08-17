import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'trigger-post-move-flash': 'src/trigger-post-move-flash.ts' // or .tsx if you kept JSX
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  treeshake: true,
  clean: true,
  outDir: 'dist',
  minify: false
});
