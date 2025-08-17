// packages/solid-beautiful-dnd-migration/src/drag-drop-context/use-pointer-controls.ts
import { onMount, onCleanup } from 'solid-js';

import { monitorForElements } from '@arminmajerie/pragmatic-drag-and-drop/element/adapter';
import { preventUnhandled } from '@arminmajerie/pragmatic-drag-and-drop/prevent-unhandled';
import type { DragLocationHistory } from '@arminmajerie/pragmatic-drag-and-drop/types';

import { isDraggableData } from '../../draggable/data';
import { isDroppableData } from '../../droppable/data';
import { getDraggableLocation } from '../draggable-location';
import { rbdInvariant } from '../rbd-invariant';
import type { DragController } from '../types';

/**
 * Sets up listeners for pointer dragging (Solid.js).
 * Auto-scroll is driven by the core scheduler via monitors.
 * Register scroll containers separately (e.g., in Droppable components) with:
 *   import { autoScrollForElements } from '@arminmajerie/pragmatic-drag-and-drop-auto-scroll';
 *   onMount(() => autoScrollForElements({ element: el }));
 */
export function usePointerControls(props: {
  dragController: DragController;
  contextId: string;
}) {
  const updatePointerDrag = (location: DragLocationHistory) => {
    props.dragController.updateDrag({
      targetLocation: getDraggableLocation(location.current),
    });
  };

  onMount(() => {
    const stopMonitoring = monitorForElements({
      canMonitor({ initial, source }) {
        if (!isDraggableData(source.data)) {
          // Not dragging something from the migration layer
          return false;
        }

        if (source.data.contextId !== props.contextId) {
          return false;
        }

        const droppable = initial.dropTargets.find((t) => isDroppableData(t.data));
        if (!droppable) {
          // There may be no droppable if it is disabled — still valid.
          return true;
        }
        return droppable.data.contextId === props.contextId;
      },

      onDragStart({ location, source }) {
        // Using a custom drag preview
        preventUnhandled.start();

        const { data } = source;
        rbdInvariant(isDraggableData(data));
        const { draggableId, droppableId, getIndex, type } = data;

        props.dragController.startDrag({
          draggableId,
          type,
          getSourceLocation() {
            return { droppableId, index: getIndex() };
          },
          sourceElement: source.element,
          mode: 'FLUID',
        });
      },

      onDrag({ location }) {
        updatePointerDrag(location);
      },

      onDropTargetChange({ location }) {
        updatePointerDrag(location);
      },

      onDrop() {
        preventUnhandled.stop();
        props.dragController.stopDrag({ reason: 'DROP' });
      },
    });

    onCleanup(() => {
      try {
        stopMonitoring?.();
      } finally {
        // Defensive: ensure preventUnhandled is stopped even if unmounted mid-drag
        preventUnhandled.stop();
      }
    });
  });
}
