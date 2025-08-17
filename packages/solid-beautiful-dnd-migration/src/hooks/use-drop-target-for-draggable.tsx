// packages/solid-beautiful-dnd-migration/src/hooks/use-drop-target-for-draggable.ts
import { createEffect, onCleanup } from 'solid-js';

import type { Direction } from '@arminmajerie/pragmatic-drag-and-drop/types';
import { attachClosestEdge } from '@arminmajerie/pragmatic-drag-and-drop-hitbox/closest-edge';
import { dropTargetForElements } from '@arminmajerie/pragmatic-drag-and-drop/element/adapter';

import { rbdInvariant } from '../drag-drop-context/rbd-invariant';
import { type DraggableData, isDraggableData } from '../draggable/data';

export function useDropTargetForDraggable({
                                            element,        // accessor returning the current HTMLElement (or null)
                                            data,
                                            direction,
                                            contextId,
                                            isDropDisabled,
                                            type,
                                          }: {
  element: () => HTMLElement | null;
  data: DraggableData;
  direction: Direction;
  contextId: string;
  isDropDisabled: boolean;
  type: string;
}) {
  createEffect(() => {
    const el = element();
    if (!el) return;

    rbdInvariant(el instanceof HTMLElement);

    const stop = dropTargetForElements({
      element: el,
      getIsSticky() {
        return true;
      },
      canDrop({ source }) {
        if (!isDraggableData(source.data)) {
          // not dragging something from the migration layer
          // we should not allow dropping
          return false;
        }
        if (isDropDisabled) return false;
        return source.data.type === type && source.data.contextId === contextId;
      },
      getData({ input }) {
        return attachClosestEdge(data, {
          element: el,
          input,
          allowedEdges: direction === 'vertical' ? ['top', 'bottom'] : ['left', 'right'],
        });
      },
    });

    onCleanup(() => stop());
  });
}
