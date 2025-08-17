// packages/solid-beautiful-dnd-migration/src/drag-drop-context/hooks/use-keyboard-controls.ts
import { bindAll, type Binding } from 'bind-event-listener';
import type { Direction } from '@arminmajerie/pragmatic-drag-and-drop/types';

import type { CleanupFn } from '../../internal-types';
import { attributes, customAttributes, getAttribute } from '../../utils/attributes';
import { findClosestScrollContainer } from '../../utils/find-closest-scroll-container';
import { getElement } from '../../utils/find-element';
import { getBestCrossAxisDroppable } from '../../utils/get-best-cross-axis-droppable';
import { getElementByDraggableLocation } from '../../utils/get-element-by-draggable-location';
import { isSameLocation } from '../draggable-location';
import type { DroppableRegistry } from '../droppable-registry';
import { getActualDestination } from '../get-destination';
import { rbdInvariant } from '../rbd-invariant';
import type { DragController, StartKeyboardDrag } from '../types';

type KeyHandlerData = {
  dragController: DragController;
  droppableRegistry: DroppableRegistry;
  contextId: string;
};

type KeyHandler = (event: KeyboardEvent, data: KeyHandlerData) => void;

/**
 * Finds the element's scroll container and scrolls it to the top.
 * Used for cross-axis drags to provide a consistent starting point in the list.
 */
function scrollToTop(element: HTMLElement): void {
  const scrollContainer = findClosestScrollContainer(element);
  if (!scrollContainer) return;
  scrollContainer.scrollTo(0, 0);
}

const moveHandlers: Record<'mainAxis' | 'crossAxis', Record<'prev' | 'next', KeyHandler>> = {
  mainAxis: {
    prev(event: KeyboardEvent, { dragController }: KeyHandlerData) {
      // stop page scroll from arrow keys
      event.preventDefault();

      const dragState = dragController.getDragState();
      rbdInvariant(dragState.isDragging);

      const { sourceLocation, targetLocation } = dragState;
      if (!targetLocation) return;
      if (targetLocation.index === 0) return;

      const nextLocation = { ...targetLocation, index: targetLocation.index - 1 };

      const nextDestination = getActualDestination({
        start: sourceLocation,
        target: nextLocation,
      });

      // Collapse the two equivalent target indexes around the source location
      if (isSameLocation(sourceLocation, nextDestination)) {
        nextLocation.index = targetLocation.index - 2;
      }

      dragController.updateDrag({ targetLocation: nextLocation });
    },
    next(event: KeyboardEvent, { dragController, contextId }: KeyHandlerData) {
      event.preventDefault();

      const dragState = dragController.getDragState();
      rbdInvariant(dragState.isDragging);

      const { sourceLocation, targetLocation } = dragState;
      if (!targetLocation) return;

      // If there is already a draggable with the current index, it's a valid target.
      const element = getElementByDraggableLocation(contextId, targetLocation);

      // For virtual lists: the element may be unmounted during drag.
      const isSame = isSameLocation(sourceLocation, targetLocation);
      if (!isSame && !element) return;

      const nextLocation = { ...targetLocation, index: targetLocation.index + 1 };

      const nextDestination = getActualDestination({
        start: sourceLocation,
        target: nextLocation,
      });

      // Collapse over the source location
      if (isSameLocation(sourceLocation, nextDestination)) {
        nextLocation.index = targetLocation.index + 2;
      }

      dragController.updateDrag({ targetLocation: nextLocation });
    },
  },
  crossAxis: {
    prev(event: KeyboardEvent, { dragController, droppableRegistry, contextId }: KeyHandlerData) {
      event.preventDefault();

      const dragState = dragController.getDragState();
      rbdInvariant(dragState.isDragging);

      const { targetLocation, type } = dragState;
      if (!targetLocation) return;

      const before = getBestCrossAxisDroppable({
        droppableId: targetLocation.droppableId,
        type,
        isMovingForward: false,
        contextId,
        droppableRegistry,
      });
      if (!before) return;

      scrollToTop(before);

      const nextLocation = {
        droppableId: getAttribute(before, attributes.droppable.id),
        index: 0,
      };

      dragController.updateDrag({ targetLocation: nextLocation });
    },
    next(event: KeyboardEvent, { dragController, droppableRegistry, contextId }: KeyHandlerData) {
      event.preventDefault();

      const dragState = dragController.getDragState();
      rbdInvariant(dragState.isDragging);

      const { targetLocation, type } = dragState;
      if (!targetLocation) return;

      const after = getBestCrossAxisDroppable({
        droppableId: targetLocation.droppableId,
        type,
        isMovingForward: true,
        contextId,
        droppableRegistry,
      });
      if (!after) return;

      scrollToTop(after);

      const nextLocation = {
        droppableId: getAttribute(after, attributes.droppable.id),
        index: 0,
      };

      dragController.updateDrag({ targetLocation: nextLocation });
    },
  },
};

function preventDefault(event: Event) {
  event.preventDefault();
}

/**
 * Keys with default behavior mostly prevented (to stop scrolling / focus moves).
 */
const commonKeyHandlers = {
  PageUp: preventDefault,
  PageDown: preventDefault,
  Home: preventDefault,
  End: preventDefault,
  Enter: preventDefault,
  Tab: preventDefault,
};

/**
 * Map actions to keys per axis direction.
 */
const keyHandlers: Record<Direction, Record<string, KeyHandler>> = {
  vertical: {
    ...commonKeyHandlers,
    ArrowUp: moveHandlers.mainAxis.prev,
    ArrowDown: moveHandlers.mainAxis.next,
    ArrowLeft: moveHandlers.crossAxis.prev,
    ArrowRight: moveHandlers.crossAxis.next,
  },
  horizontal: {
    ...commonKeyHandlers,
    ArrowUp: moveHandlers.crossAxis.prev,
    ArrowDown: moveHandlers.crossAxis.next,
    ArrowLeft: moveHandlers.mainAxis.prev,
    ArrowRight: moveHandlers.mainAxis.next,
  },
};

export function useKeyboardControls({
                                      dragController,
                                      droppableRegistry,
                                      contextId,
                                      setKeyboardCleanupFn,
                                    }: {
  dragController: DragController;
  droppableRegistry: DroppableRegistry;
  contextId: string;
  /**
   * Sets the cleanup function that should run whenever:
   * - A user drops
   * - A user cancels a drag
   * - There is an error, cancelling a drag
   *
   * Because this hook has no visibility of when a drag is cancelled due to
   * an error, the cleanup is handled at the level above.
   */
  setKeyboardCleanupFn: (cleanupFn: CleanupFn) => void;
}): { startKeyboardDrag: StartKeyboardDrag } {
  // Solid: just define a function; no need for useCallback
  const startKeyboardDrag: StartKeyboardDrag = ({
                                                  event: startEvent,
                                                  draggableId,
                                                  type,
                                                  getSourceLocation,
                                                  sourceElement,
                                                }) => {
    dragController.startDrag({
      draggableId,
      type,
      getSourceLocation,
      sourceElement,
      mode: 'SNAP',
    });

    const sourceLocation = getSourceLocation();

    const droppable = getElement({
      attribute: attributes.droppable.id,
      value: sourceLocation.droppableId,
    });

    const direction = getAttribute(droppable, customAttributes.droppable.direction);
    rbdInvariant(direction === 'vertical' || direction === 'horizontal');

    function cancelDrag() {
      dragController.stopDrag({ reason: 'CANCEL' });
    }

    // Events that should cancel the drag (ported from rbd)
    const cancelBindings: Binding[] = [
      'mousedown',
      'mouseup',
      'click',
      'touchstart',
      'resize',
      'wheel',
      'visibilitychange',
    ].map((type) => ({ type, listener: cancelDrag }));

    const cleanupFn = bindAll(window, [
      {
        type: 'keydown',
        listener(event: KeyboardEvent) {
          // Ignore the keydown that triggered drag start
          if (event === startEvent) return;

          const { isDragging } = dragController.getDragState();
          if (!isDragging) return;

          if (event.key === ' ') {
            event.preventDefault();
            dragController.stopDrag({ reason: 'DROP' });
            return;
          }

          if (event.key === 'Escape') {
            event.preventDefault();
            dragController.stopDrag({ reason: 'CANCEL' });
            return;
          }

          keyHandlers[direction][event.key]?.(event, {
            dragController,
            droppableRegistry,
            contextId,
          });
        },
      },
      ...cancelBindings,
    ]);

    setKeyboardCleanupFn(cleanupFn);
  };

  return { startKeyboardDrag };
}
