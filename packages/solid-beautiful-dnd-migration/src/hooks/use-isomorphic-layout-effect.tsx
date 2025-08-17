// packages/solid-beautiful-dnd-migration/src/hooks/use-isomorphic-layout-effect.ts
/**
 * Solid version of an "isomorphic layout effect".
 * - On the client: runs as a layout effect (createRenderEffect)
 * - On the server: runs as a normal effect (createEffect), avoiding SSR warnings
 */

import { createEffect, createRenderEffect, onCleanup } from 'solid-js';
import { isServer } from 'solid-js/web';

type EffectCallback = () => void | (() => void);

export function useLayoutEffect(fn: EffectCallback) {
  const run = isServer ? createEffect : createRenderEffect;
  run(() => {
    const dispose = fn();
    if (typeof dispose === 'function') onCleanup(dispose);
  });
}
