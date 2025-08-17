// packages/solid-beautiful-dnd-migration/src/drag-drop-context/hooks/use-hidden-text-element.ts
import { createEffect, onCleanup } from 'solid-js';
import type { ContextId } from '@arminmajerie/pragmatic-drag-and-drop/types';

export function getHiddenTextElementId(contextId: string) {
  return `rbd-lift-instruction-${contextId}`;
}

type UseHiddenTextElementArgs = {
  contextId: ContextId;
  text: string;
};

export default function useHiddenTextElement({ contextId, text }: UseHiddenTextElementArgs) {
  createEffect(() => {
    const id = getHiddenTextElementId(String(contextId));

    // create a fresh element each run; previous run's cleanup removes its node
    const el = document.createElement('div');
    el.id = id;
    el.textContent = text;

    // keep it out of the accessibility tree except when referenced
    Object.assign(el.style, { display: 'none' });

    document.body.appendChild(el);

    onCleanup(() => {
      el.remove();
    });
  });
}
