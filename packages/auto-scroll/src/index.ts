// packages/auto-scroll/src/index.ts
// Safe auto-scroll entry points
export {
  autoScrollForElements,
  autoScrollWindowForElements,
} from './entry-point/element';

export {
  autoScrollForExternal,
  autoScrollWindowForExternal,
} from './entry-point/external';

export {
  autoScrollForTextSelection,
  autoScrollWindowForTextSelection,
} from './entry-point/text-selection';

// Unsafe overflow variants (you already had these)
export {
  unsafeOverflowAutoScrollForElements,
} from './entry-point/unsafe-overflow/element';

export {
  unsafeOverflowAutoScrollForExternal,
} from './entry-point/unsafe-overflow/external';

export {
  unsafeOverflowAutoScrollForTextSelection,
} from './entry-point/unsafe-overflow/text-selection';

