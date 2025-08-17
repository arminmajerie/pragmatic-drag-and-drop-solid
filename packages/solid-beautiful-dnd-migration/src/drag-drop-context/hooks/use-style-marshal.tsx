// packages/solid-beautiful-dnd-migration/src/drag-drop-context/hooks/use-style-marshal.ts
import { createEffect, onCleanup } from 'solid-js';

import type { ContextId } from '@arminmajerie/pragmatic-drag-and-drop/types';

import type { CleanupFn } from '../../internal-types';
import { attributes } from '../../utils/attributes';

/**
 * Used to uniquely identify the style element.
 */
const styleContextIdAttribute = 'data-rbd-style-context-id';

/**
 * Returns the CSS string for the rule with the given selector and style declarations.
 */
function getRuleString({
                         selector,
                         styles,
                       }: {
  selector: string;
  styles: Record<string, string | number>;
}) {
  const concatString = Object.entries(styles)
    .map(([property, value]) => `${property}: ${String(value)};`)
    .join(' ');
  return `${selector} { ${concatString} }`;
}

/**
 * Returns the rule string for drag handle styles.
 */
export function getDragHandleRuleString(contextId: ContextId) {
  const selector = `[${attributes.dragHandle.contextId}="${contextId}"]`;
  const styles: Record<string, string | number> = {
    /**
     * Indicates the element is draggable.
     * (The browser will override cursor during drags.)
     */
    cursor: 'grab',
    /**
     * Improves the UX when dragging links on iOS.
     * Without this a preview of the link will open.
     */
    '-webkit-touch-callout': 'none',
  };
  return getRuleString({ selector, styles });
}

type ContextIdAndNonce = {
  contextId: ContextId;
  nonce?: string;
};

function createStyleEl({ contextId, nonce }: ContextIdAndNonce): HTMLStyleElement {
  const el = document.createElement('style');
  if (nonce) {
    el.setAttribute('nonce', nonce);
  }
  el.setAttribute(styleContextIdAttribute, String(contextId));
  document.head.appendChild(el);
  return el;
}

function createStyleManager({ contextId, nonce }: ContextIdAndNonce): CleanupFn {
  const el = createStyleEl({ contextId, nonce });

  // Inject content
  el.textContent = getDragHandleRuleString(contextId);

  return function cleanup() {
    el.remove();
  };
}

/**
 * Solid hook: mounts a style element for the given context and keeps it in sync.
 */
export default function useStyleMarshal({ contextId, nonce }: ContextIdAndNonce) {
  createEffect(() => {
    // create the style element for current values
    const cleanup = createStyleManager({ contextId, nonce });

    // remove/recreate if contextId/nonce change, and on owner dispose
    onCleanup(() => {
      cleanup();
    });
  });
}
