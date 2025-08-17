// packages/solid-beautiful-dnd-migration/src/drag-drop-context/types.ts
import type {
  DraggableId,
  DraggableLocation,
  MovementMode,
} from '@arminmajerie/pragmatic-drag-and-drop/types';

import type { DraggableDimensions } from '../hooks/use-captured-dimensions';

export type DragState =
  | { isDragging: false }
  | {
  isDragging: true;
  mode: MovementMode;
  draggableDimensions: DraggableDimensions;
  prevDestination: DraggableLocation | null;
  restoreFocusTo: DraggableId | null;

  draggableId: DraggableId;
  type: string;
  sourceLocation: DraggableLocation;
  targetLocation: DraggableLocation | null;

  /**
   * Used for positioning placeholders in virtual lists.
   */
  draggableInitialOffsetInSourceDroppable: { top: number; left: number };
};

/**
 * Abstraction both pointer and keyboard dragging use to control state.
 */
export type DragController = {
  getDragState(): DragState;

  startDrag(args: {
    draggableId: string;
    type: string;
    getSourceLocation(): DraggableLocation;
    sourceElement: HTMLElement;
    mode: MovementMode;
  }): void;

  // ✅ allow immediate publish path
  updateDrag(args: {
    targetLocation: DraggableLocation | null;
    isImmediate?: boolean;
  }): void;

  stopDrag(args: { reason: 'CANCEL' | 'DROP' }): void;
};

export type StartKeyboardDrag = (args: {
  /**
   * The event that caused `startKeyboardDrag()` to be called.
   */
  event: KeyboardEvent;
  draggableId: string;
  type: string;
  getSourceLocation(): DraggableLocation;
  sourceElement: HTMLElement;
}) => void;
