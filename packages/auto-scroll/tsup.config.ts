// packages/auto-scroll/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    // root
    index: 'src/index.ts',

    // sub-entries (mirror your exports)
    'entry-point/element': 'src/entry-point/element.ts',
    'entry-point/external': 'src/entry-point/external.ts',
    'entry-point/text-selection': 'src/entry-point/text-selection.ts',
    'entry-point/unsafe-overflow/element': 'src/entry-point/unsafe-overflow/element.ts',
    'entry-point/unsafe-overflow/external': 'src/entry-point/unsafe-overflow/external.ts',
    'entry-point/unsafe-overflow/text-selection': 'src/entry-point/unsafe-overflow/text-selection.ts',
  },
  format: ['esm', 'cjs'],   // emit both .js and .cjs like core
  dts: true,                // emit .d.ts per entry (in the same dist/)
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,         // stable filenames (index.js / index.cjs, etc.)
  target: 'es2019',
  platform: 'browser',
  minify: false,
});
