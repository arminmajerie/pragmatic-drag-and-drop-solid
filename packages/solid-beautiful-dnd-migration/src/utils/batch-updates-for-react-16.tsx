// packages/<your-pkg>/src/utils/batch-updates.ts
import { batch } from 'solid-js';

/**
 * Solid doesn't auto-batch arbitrary updates across calls like React 18's scheduler.
 * Use `batch` to group updates so computations run once after the callback finishes.
 */
export function batchUpdatesForReact16(callback: () => void) {
  batch(callback);
}
