import { announceDelay } from './constants';
import { onCleanup } from 'solid-js';

let node: HTMLElement | null = null;
const size = '1px';

const visuallyHiddenStyles: Partial<CSSStyleDeclaration> = {
  // Standard visually hidden styles (kept from original).
  width: size,
  height: size,
  padding: '0',
  position: 'absolute',
  border: '0',
  clip: `rect(${size}, ${size}, ${size}, ${size})`,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  marginTop: `-${size}`, // prevent page growth in 100% height layouts
  pointerEvents: 'none',
};

const isBrowser =
  typeof document !== 'undefined' && typeof window !== 'undefined';

/**
 * Creates a live region node, appends it to the body, and returns it.
 * Uses role="status" so announcements are queued and read when able
 * (matching original behavior). :contentReference[oaicite:1]{index=1}
 */
function createNode(): HTMLElement {
  // This should never run on the server due to guards in public APIs.
  if (!isBrowser) {
    // Defensive: avoid returning a fake element that could confuse consumers.
    throw new Error('live-region: createNode called on the server');
  }
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  Object.assign(el.style, visuallyHiddenStyles);
  document.body.append(el);
  return el;
}

/** Returns the live region node, creating one if necessary. */
function getNode(): HTMLElement {
  if (node === null) {
    node = createNode();
  }
  return node;
}

let timerId: ReturnType<typeof setTimeout> | null = null;

function tryClearTimer() {
  if (timerId !== null) {
    clearTimeout(timerId);
  }
  timerId = null;
}

/**
 * Announces the provided message to assistive technology.
 * Matches the original timing model to avoid interruption
 * during immediate focus changes. :contentReference[oaicite:2]{index=2}
 */
export function announce(message: string): void {
  if (!isBrowser) return;

  // Ensure node exists and is parsed/exposed in the a11y tree before we set text.
  getNode();

  // Debounce to avoid being skipped by subsequent focus changes.
  tryClearTimer();
  timerId = setTimeout(() => {
    timerId = null;
    const el = getNode();
    el.textContent = message;
  }, announceDelay);
}

/** Removes the created live region. No-op on server. */
export function cleanup(): void {
  if (!isBrowser) return;
  tryClearTimer();
  node?.remove();
  node = null;
}

/**
 * Solid helper: returns `announce` and auto-cleans up when owner disposes.
 * Usage:
 *   const announce = createLiveRegionAnnouncer();
 *   announce('Moved item to position 3');
 */
export function createLiveRegionAnnouncer() {
  onCleanup(cleanup);
  return announce;
}
