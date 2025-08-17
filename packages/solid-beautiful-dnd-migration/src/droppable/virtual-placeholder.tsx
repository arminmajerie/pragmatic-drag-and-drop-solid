// packages/solid-beautiful-dnd-migration/src/droppable/virtual-placeholder.tsx
import { createMemo, type JSX } from 'solid-js';
import type { Direction, DraggableId, DroppableId } from '@arminmajerie/pragmatic-drag-and-drop/types';

import { useDragDropContext } from '../drag-drop-context/internal-context';
import { rbdInvariant } from '../drag-drop-context/rbd-invariant';
import { useDraggableData } from '../draggable/data';
import { Placeholder } from '../draggable/placeholder';
import { useDropTargetForDraggable } from '../hooks/use-drop-target-for-draggable';

type VirtualPlaceholderProps = {
  draggableId: DraggableId;
  droppableId: DroppableId;
  type: string;
  direction: Direction;
  isDropDisabled: boolean;
};

// Helper to narrow the union type at compile time
function expectDragging<T>(s: T & { isDragging: boolean }): asserts s is T & { isDragging: true } {
  rbdInvariant(s.isDragging, 'The virtual placeholder should only be rendered during a drag');
}

export function VirtualPlaceholder(props: VirtualPlaceholderProps) {
  let el: HTMLDivElement | null = null;

  const { contextId, getDragState } = useDragDropContext();

  // Narrow to the "dragging" branch once, safely
  const dragging = createMemo(() => {
    const s = getDragState();
    expectDragging(s);
    return s;
  });

  const getIndex = () => dragging().sourceLocation.index;

  const data = useDraggableData({
    draggableId: props.draggableId,
    droppableId: props.droppableId,
    getIndex,
    contextId,
    type: props.type,
  });

  // Your Solid hook expects an accessor `element: () => HTMLElement | null`
  useDropTargetForDraggable({
    element: () => el,
    data,
    direction: props.direction,
    contextId,
    isDropDisabled: props.isDropDisabled,
    type: props.type,
  });

  const style = createMemo<JSX.CSSProperties>(() => {
    const s = dragging();
    return {
      position: 'absolute',
      top: `${s.draggableInitialOffsetInSourceDroppable.top}px`,
      left: `${s.draggableInitialOffsetInSourceDroppable.left}px`,
      margin: 0,
    };
  });


  return <Placeholder ref={(node) => (el = node)} style={style()} />;
}
