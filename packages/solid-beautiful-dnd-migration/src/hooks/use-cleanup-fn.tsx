// packages/solid-beautiful-dnd-migration/src/hooks/use-cleanup-fn.ts
import { onCleanup } from 'solid-js';
import type { CleanupFn } from '../internal-types';

const noop: CleanupFn = () => {};

function createCleanupManager() {
  let cleanupFn: CleanupFn = noop;

  const setCleanupFn = (next: CleanupFn) => {
    cleanupFn = next || noop;
  };

  const runCleanupFn = () => {
    try {
      cleanupFn();
    } finally {
      cleanupFn = noop;
    }
  };

  return { setCleanupFn, runCleanupFn };
}

/**
 * Solid hook that returns a small manager:
 * - setCleanupFn(fn): register a cleanup function
 * - runCleanupFn(): run it now (and clear)
 * The cleanup is also run automatically on component unmount.
 */
export function useCleanupFn() {
  const cleanupManager = createCleanupManager();

  // run cleanup on unmount
  onCleanup(() => cleanupManager.runCleanupFn());

  return cleanupManager;
}
