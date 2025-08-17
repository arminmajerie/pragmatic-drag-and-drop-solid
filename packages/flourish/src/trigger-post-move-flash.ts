// packages/flourish/src/trigger-post-move-flash.ts
// Zero-dep utility + Solid directive
import { createRenderEffect } from 'solid-js';

type TokenName = 'color.background.selected';

const DEFAULT_TOKENS: Record<TokenName, string> = {
  // nice, subtle blue highlight
  'color.background.selected': 'rgba(38,132,255,0.28)',
};

/**
 * Read CSS variable like:
 *   :root { --pddd-color-background-selected: rgba(38,132,255,0.28); }
 * SSR-safe: returns undefined on the server.
 */
function readCssToken(name: TokenName): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const cssVar = `--pddd-${name.replace(/\./g, '-')}`;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim();
  return value || undefined;
}

function token(name: TokenName, fallback?: string): string {
  return readCssToken(name) ?? fallback ?? DEFAULT_TOKENS[name];
}

// Motion durations (ms)
const durations = {
  large: 300 as const,
};

export interface FlashOptions {
  color?: string;
  duration?: number;
  easing?: string;
  iterations?: number;
}

/**
 * Imperative: runs a flash animation on the element’s background to
 * indicate its new position after a reorder.
 */
export function triggerPostMoveFlash(element: HTMLElement, opts: FlashOptions = {}): void {
  const color = opts.color ?? token('color.background.selected');
  const duration = opts.duration ?? durations.large;
  const easing = opts.easing ?? 'cubic-bezier(0.25, 0.1, 0.25, 1.0)';
  const iterations = opts.iterations ?? 1;

  // Web Animations API (widely supported)
  try {
    element.animate([{ 'background-color': color }, {}], { duration, easing, iterations });
  } catch {
    // Fallback: CSS transition
    const prev = element.style.transition;
    const original =
      typeof getComputedStyle === 'function'
        ? getComputedStyle(element).backgroundColor
        : element.style.backgroundColor;

    element.style.transition = `background-color ${duration}ms ${easing}`;
    element.style.backgroundColor = color;

    // Defer to next frame so the style change commits
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        element.style.backgroundColor = original;
        setTimeout(() => (element.style.transition = prev), duration + 50);
      });
    } else {
      // Last-ditch fallback
      element.style.backgroundColor = original;
      setTimeout(() => (element.style.transition = prev), duration + 50);
    }
  }
}

/**
 * Solid directive: `use:postMoveFlash={opts}`.
 * Triggers whenever the accessor returns a truthy object (new identity).
 *
 * Example:
 *   const [flash, setFlash] = createSignal<FlashOptions | undefined>();
 *   // after a reorder:
 *   setFlash({}); // new object => triggers
 *   <div use:postMoveFlash={flash()} />
 */
export type PostMoveFlashDirectiveValue = FlashOptions | undefined | null | false;

export function postMoveFlash(
  el: HTMLElement,
  accessor: () => PostMoveFlashDirectiveValue
) {
  createRenderEffect(() => {
    const opts = accessor();
    if (!opts) return;

    // Run at end of frame so layout/position changes settle first
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => triggerPostMoveFlash(el, opts));
    } else {
      triggerPostMoveFlash(el, opts);
    }
  });
}
