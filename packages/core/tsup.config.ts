// packages/core/tsup.config.ts
import { defineConfig } from 'tsup';

const runtimeEntries = {
  // root
  index: 'src/index.ts',

  // element
  'element/adapter': 'src/entry-point/element/adapter.ts',
  'element/set-custom-native-drag-preview': 'src/entry-point/element/set-custom-native-drag-preview.ts',
  'element/pointer-outside-of-preview': 'src/entry-point/element/pointer-outside-of-preview.ts',
  'element/center-under-pointer': 'src/entry-point/element/center-under-pointer.ts',
  'element/preserve-offset-on-source': 'src/entry-point/element/preserve-offset-on-source.ts',
  'element/disable-native-drag-preview': 'src/entry-point/element/disable-native-drag-preview.ts',
  'element/scroll-just-enough-into-view': 'src/entry-point/element/scroll-just-enough-into-view.ts',
  'element/format-urls-for-external': 'src/entry-point/element/format-urls-for-external.ts',
  'element/block-dragging-to-iframes': 'src/entry-point/element/block-dragging-to-iframes.ts',

  // external
  'external/adapter': 'src/entry-point/external/adapter.ts',
  'external/file': 'src/entry-point/external/file.ts',
  'external/html': 'src/entry-point/external/html.ts',
  'external/text': 'src/entry-point/external/text.ts',
  'external/url': 'src/entry-point/external/url.ts',
  'external/some': 'src/entry-point/external/some.ts',

  // private
  'private/get-element-from-point-without-honey-pot':
    'src/entry-point/private/get-element-from-point-without-honey-pot.ts',

  // text-selection
  'text-selection/adapter': 'src/entry-point/text-selection/adapter.ts',

  // other entry points
  combine: 'src/entry-point/combine.ts',
  once: 'src/entry-point/once.ts',
  reorder: 'src/entry-point/reorder.ts',
  'prevent-unhandled': 'src/entry-point/prevent-unhandled.ts',
};

// DTS-only entries for type-only subpaths (no JS chunks generated)
const dtsOnlyEntries = {
  types: 'src/entry-point/types.ts',
  'entry-point/types': 'src/entry-point/types.ts',
};

export default defineConfig({
  entry: {
    ...runtimeEntries,
    // NOTE: do NOT include 'types' / 'entry-point/types' here to avoid empty runtime chunks
  },
  dts: {
    // Emit .d.ts for ALL runtime entries + extra DTS-only subpaths
    entry: {
      ...runtimeEntries,
      ...dtsOnlyEntries,
    },
  },
  format: ['esm', 'cjs'],
  target: 'es2019',
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: false,
});
