// packages/solid-beautiful-dnd-migration/src/droppable/draggable-clone.tsx
import { createMemo, onCleanup, onMount, type JSX } from 'solid-js';
import { Portal } from 'solid-js/web';

import type {
  DraggingStyle,
  NotDraggingStyle,
  DroppableId,
  MovementMode,
} from '@arminmajerie/pragmatic-drag-and-drop/types';

import { combine } from '@arminmajerie/pragmatic-drag-and-drop/combine';
import { monitorForElements } from '@arminmajerie/pragmatic-drag-and-drop/element/adapter';

import { getHiddenTextElementId } from '../drag-drop-context/hooks/use-hidden-text-element';
import { useDragDropContext } from '../drag-drop-context/internal-context';
import { useMonitorForLifecycle } from '../drag-drop-context/lifecycle-context';
import { rbdInvariant } from '../drag-drop-context/rbd-invariant';
import { isDraggableData } from '../draggable/data';
import { getDraggableProvidedStyle } from '../draggable/get-draggable-provided-style';
import { idleState, reducer } from '../draggable/state';
import { useDraggableStateSnapshot } from '../draggable/use-draggable-state-snapshot';
import { useDraggableDimensions } from '../hooks/use-captured-dimensions';
import { attributes } from '../utils/attributes';
import { findDragHandle } from '../utils/find-drag-handle';
import { findDropIndicator } from '../utils/find-drop-indicator';
import { findPlaceholder } from '../utils/find-placeholder';

// -----------------------------
// Local migration-layer types
// -----------------------------
type MigrationDraggableProvided = {
  draggableProps: {
    [attributes.draggable.contextId]: string;
    [attributes.draggable.id]: string;
    style: DraggingStyle | NotDraggingStyle;
  };
  dragHandleProps: any;
  innerRef: (el: HTMLElement | null) => void;
};

type MigrationDraggableChildrenFn = (
  provided: MigrationDraggableProvided,
  snapshot: ReturnType<typeof useDraggableStateSnapshot> extends infer X ? X : never,
  rubric: {
    draggableId: string;
    type: string;
    source: { droppableId: DroppableId; index: number };
  },
) => JSX.Element;

// -----------------------------

function getBody() {
  return document.body;
}

/**
 * Only rendered during drags (portaled).
 */
function DraggableCloneInner(props: {
  children: MigrationDraggableChildrenFn;
  droppableId: DroppableId;
  type: string;
  draggableId: string;
  index: number;
  draggingOver: DroppableId | null;
  style: DraggingStyle | NotDraggingStyle;
  getContainerForClone?: () => HTMLElement;
  mode: MovementMode;
}) {
  const { contextId } = useDragDropContext();
  const getContainerForClone = props.getContainerForClone ?? getBody;

  const focusDragHandle = (element: HTMLElement | null) => {
    if (!element) return;
    const handle = findDragHandle({ contextId, draggableId: props.draggableId });
    handle?.focus();
  };

  const provided = createMemo<MigrationDraggableProvided>(() => ({
    innerRef: focusDragHandle,
    draggableProps: {
      [attributes.draggable.contextId]: contextId,
      [attributes.draggable.id]: props.draggableId,
      style: props.style,
    },
    dragHandleProps: {
      role: 'button',
      'aria-describedby': getHiddenTextElementId(contextId),
      [attributes.dragHandle.contextId]: contextId,
      [attributes.dragHandle.draggableId]: props.draggableId,
      tabIndex: 0,
      draggable: false,
      onDragStart: () => {},
    } as any,
  }));

  const snapshot = useDraggableStateSnapshot({
    draggingOver: props.draggingOver,
    isClone: true,
    isDragging: true,
    mode: props.mode,
  });

  const rubric = createMemo(() => ({
    draggableId: props.draggableId,
    type: props.type,
    source: { droppableId: props.droppableId, index: props.index },
  }));

  return (
    <Portal mount={getContainerForClone()}>
      {props.children(provided(), snapshot, rubric())}
    </Portal>
  );
}

/**
 * Wrapper that is always rendered if there is a `renderClone` function.
 * Sets up monitors and observes the full lifecycle.
 */
export function DraggableClone(props: {
  children: MigrationDraggableChildrenFn;
  droppableId: DroppableId;
  type: string;
  getContainerForClone?: () => HTMLElement;
}) {
  const { contextId, getDragState } = useDragDropContext();
  const draggableDimensions = useDraggableDimensions();
  const monitorForLifecycle = useMonitorForLifecycle();

  // Minimal reducer wrapper (Solid doesn't have useReducer)
  let state = idleState;
  const dispatch = (action: any) => {
    state = reducer(state, action);
  };

  onMount(() => {
    const stop = combine(
      monitorForLifecycle({
        onPendingDragStart({ start, droppable }) {
          if (props.droppableId !== start.source.droppableId) return;

          if (start.mode === 'FLUID') {
            dispatch({ type: 'START_POINTER_DRAG', payload: { start } });
            return;
          }

          if (start.mode === 'SNAP') {
            const dragState = getDragState();
            rbdInvariant(dragState.isDragging && dragState.draggableDimensions);
            dispatch({
              type: 'START_KEYBOARD_DRAG',
              payload: {
                start,
                draggableDimensions: dragState.draggableDimensions,
                droppable,
              },
            });
          }
        },

        onPendingDragUpdate({ update, droppable }) {
          if (state.type !== 'dragging') return;
          if (state.draggableId !== update.draggableId) return;

          dispatch({ type: 'UPDATE_DRAG', payload: { update } });

          if (update.mode === 'SNAP') {
            // microtask to ensure indicator/placeholder updates are in place
            queueMicrotask(() => {
              const dragState = getDragState();
              if (!dragState.isDragging) return;

              const placeholder = findPlaceholder(contextId);
              const placeholderRect = placeholder ? placeholder.getBoundingClientRect() : null;

              const dropIndicator = findDropIndicator();
              const dropIndicatorRect = dropIndicator ? dropIndicator.getBoundingClientRect() : null;

              dispatch({
                type: 'UPDATE_KEYBOARD_PREVIEW',
                payload: {
                  update,
                  draggableDimensions,
                  droppable,
                  placeholderRect,
                  dropIndicatorRect,
                },
              });
            });
          }
        },

        onBeforeDragEnd({ draggableId }) {
          if (state.type !== 'dragging') return;
          if (draggableId !== state.draggableId) return;

          dispatch({ type: 'DROP' });
        },
      }),
      monitorForElements({
        canMonitor({ source }) {
          if (!isDraggableData(source.data)) return false;
          return source.data.contextId === contextId && source.data.droppableId === props.droppableId;
        },
        onDrag({ location }) {
          dispatch({
            type: 'UPDATE_POINTER_PREVIEW',
            payload: { pointerLocation: location },
          });
        },
      }),
    );

    onCleanup(() => stop());
  });

  if (state.type !== 'dragging') return null;

  const style = getDraggableProvidedStyle({
    draggableDimensions,
    draggableState: state,
  });

  return (
    <DraggableCloneInner
      droppableId={props.droppableId}
      type={props.type}
      draggableId={state.draggableId}
      index={state.start.index}
      draggingOver={state.draggingOver}
      mode={state.mode}
      style={style}
      getContainerForClone={props.getContainerForClone}
    >
      {props.children}
    </DraggableCloneInner>
  );
}
