// packages/solid-beautiful-dnd-migration/src/drag-drop-context/get-destination.ts
import type { DraggableLocation } from '@arminmajerie/pragmatic-drag-and-drop/types';

/**
 * Calculates the actual destination of an item based on its start location
 * and target location.
 *
 * The actual destination may not be the same as the target location.
 * An item moving to a higher index in the same list introduces an
 * off-by-one error that this function accounts for.
 */
export function getActualDestination({
                                       start,
                                       target,
                                     }: {
  /** The start location of the draggable. */
  start: DraggableLocation;
  /** Where the drop indicator is being drawn. */
  target: DraggableLocation | null;
}): DraggableLocation | null {
  if (target === null) {
    return null;
  }

  // If moving forward within the same list, subtract 1 to account for the item itself shifting.
  const isSameList = start.droppableId === target.droppableId;
  const isMovingForward = target.index > start.index;
  const shouldAdjust = isSameList && isMovingForward;

  return shouldAdjust ? { ...target, index: target.index - 1 } : { ...target };
}
