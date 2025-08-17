// packages/solid-beautiful-dnd-migration/src/draggable/index.tsx
import { createEffect, createMemo, JSX, onCleanup, Accessor } from 'solid-js';
import { bindAll } from 'bind-event-listener';
import type {
  DraggableProps,
  DraggableProvided,
} from '@arminmajerie/pragmatic-drag-and-drop/types';

import type {
  DraggableRubric,
  DraggableStateSnapshot,
  DraggingStyle,
  NotDraggingStyle,
} from '@arminmajerie/pragmatic-drag-and-drop/types';

import invariant from 'tiny-invariant';

import { combine } from '@arminmajerie/pragmatic-drag-and-drop/combine';
import { draggable, monitorForElements } from '@arminmajerie/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@arminmajerie/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import { getElementFromPointWithoutHoneypot } from '@arminmajerie/pragmatic-drag-and-drop/private/get-element-from-point-without-honey-pot';

import { getHiddenTextElementId } from '../drag-drop-context/hooks/use-hidden-text-element';
import { useDragDropContext } from '../drag-drop-context/internal-context';
import { useMonitorForLifecycle } from '../drag-drop-context/lifecycle-context';
import { rbdInvariant } from '../drag-drop-context/rbd-invariant';
import { useDroppableContext } from '../droppable/droppable-context';
import { useDraggableDimensions } from '../hooks/use-captured-dimensions';
import { useCleanupFn } from '../hooks/use-cleanup-fn';
import { useDropTargetForDraggable } from '../hooks/use-drop-target-for-draggable';
import { useKeyboardContext } from '../hooks/use-keyboard-context';
import { attributes, customAttributes, setAttributes } from '../utils/attributes';
import { findDragHandle } from '../utils/find-drag-handle';
import { findDropIndicator } from '../utils/find-drop-indicator';
import { findPlaceholder } from '../utils/find-placeholder';
import { useStable } from '../utils/use-stable';

import { isDraggableData, useDraggableData } from './data';
import { getDraggableProvidedStyle } from './get-draggable-provided-style';
import isEventInInteractiveElement, { isAnInteractiveElement } from './is-event-in-interactive-element';
import { Placeholder } from './placeholder';
import { idleState, reducer } from './state';
import { useDraggableStateSnapshot } from './use-draggable-state-snapshot';

type MigrationDraggableProvided = {
  draggableProps: {
    [attributes.draggable.contextId]: string;
    [attributes.draggable.id]: string;
    style: DraggingStyle | NotDraggingStyle;
  };
  // use a precise shape if you want; `any` keeps it flexible while porting
  dragHandleProps: any;
  innerRef: (element: HTMLElement | null) => void;
};

type MigrationDraggableProps = {
  draggableId: string;
  index: number;
  isDragDisabled?: boolean;
  disableInteractiveElementBlocking?: boolean;
  children: (
    provided: MigrationDraggableProvided,
    snapshot: DraggableStateSnapshot,
    rubric: DraggableRubric,
  ) => JSX.Element;
};

const noop = () => {};

export function Draggable({
                            children,
                            draggableId,
                            index,
                            isDragDisabled = false,
                            disableInteractiveElementBlocking = false,
                          }: MigrationDraggableProps) {
  const { direction, droppableId, type, mode, shouldRenderCloneWhileDragging, isDropDisabled } =
    useDroppableContext();

  type MigrationDraggableProvided = {
    draggableProps: {
      [attributes.draggable.contextId]: string;
      [attributes.draggable.id]: string;
      style: DraggingStyle | NotDraggingStyle;
    };
    // use a precise shape if you want; `any` keeps it flexible while porting
    dragHandleProps: any;
    innerRef: (element: HTMLElement | null) => void;
  };


  const { contextId, getDragState } = useDragDropContext();

  // React-like ref objects to keep compatibility with hooks expecting .current
  const elementRef: { current: HTMLElement | null } = { current: null };
  const dragHandleRef: { current: HTMLElement | null } = { current: null };

  const { setCleanupFn, runCleanupFn } = useCleanupFn();

  const setElement = (element: HTMLElement | null) => {
    if (elementRef.current) {
      // clean up previous attributes if element changes
      runCleanupFn();
    }

    if (element) {
      // attach data attributes used by the migration layer
      const cleanupFn = setAttributes(element, {
        [customAttributes.draggable.droppableId]: droppableId,
        [customAttributes.draggable.index]: String(index),
      });
      setCleanupFn(cleanupFn);
    }

    elementRef.current = element;
    dragHandleRef.current = findDragHandle({ contextId, draggableId }) ?? null;
  };

  const getIndex = useStable(index);

  // Minimal reducer wrapper
  let state = idleState;
  const setState = (next: typeof state) => {
    state = next;
  };
  const dispatch = (action: any) => {
    setState(reducer(state, action));
  };

  const data = useDraggableData({
    draggableId,
    droppableId,
    getIndex,
    contextId,
    type,
  });

  const isDragging = () => state.type === 'dragging';
  const isHiding = () => state.type === 'hiding';

  const monitorForLifecycle = useMonitorForLifecycle();
  const { startKeyboardDrag } = useKeyboardContext();

  // Bind keydown on drag handle to start keyboard drags
  createEffect(() => {
    if (state.type !== 'idle') return;
    if (isDragDisabled) return;

    const element = elementRef.current;
    invariant(element instanceof HTMLElement);

    const dragHandle = dragHandleRef.current;
    invariant(dragHandle instanceof HTMLElement);

    const stop = bindAll(dragHandle, [
      {
        type: 'keydown',
        listener(event) {
          if (event.key === ' ') {
            if (event.defaultPrevented) return;

            if (!disableInteractiveElementBlocking && isEventInInteractiveElement(element, event)) {
              return;
            }

            // Only prevent default if we are consuming it
            event.preventDefault();

            startKeyboardDrag({
              event,
              draggableId,
              type,
              getSourceLocation() {
                return { droppableId, index: getIndex() };
              },
              sourceElement: element,
            });
          }
        },
      },
    ]);

    onCleanup(() => stop());
  });

  // Set up pdnd draggable
  createEffect(() => {
    if (isHiding()) {
      // Original element unmounts while clone renders; expected.
      return;
    }
    if (isDragDisabled) return;

    const element = elementRef.current;
    rbdInvariant(element instanceof HTMLElement);

    const dragHandle = dragHandleRef.current;
    rbdInvariant(dragHandle instanceof HTMLElement);

    const stop = draggable({
      canDrag({ input }) {
        // block drags with modifier keys (matches rbd)
        if (input.ctrlKey || input.metaKey || input.shiftKey || input.altKey) return false;

        // block interactive elements unless explicitly disabled
        if (!disableInteractiveElementBlocking) {
          const elementUnderPointer = getElementFromPointWithoutHoneypot({
            x: input.clientX,
            y: input.clientY,
          });
          return !isAnInteractiveElement(dragHandle, elementUnderPointer);
        }

        return !isDragging();
      },
      element,
      dragHandle,
      getInitialData() {
        return data;
      },
      onGenerateDragPreview: disableNativeDragPreview,
    });

    onCleanup(() => stop());
  });

  const hasPlaceholder = () => state.type !== 'idle' && mode === 'standard';
  const placeholderRef: { current: HTMLDivElement | null } = { current: null };

  useDropTargetForDraggable({
    // swap drop target to placeholder while clone renders
    element: hasPlaceholder() ? (placeholderRef as any) : elementRef,
    data,
    direction,
    contextId,
    isDropDisabled,
    type,
  });

  // Hide the original element if it re-mounts while being dragged via a clone
  createEffect(() => {
    const dragState = getDragState();

    if (!shouldRenderCloneWhileDragging) return;
    if (!dragState.isDragging) return;
    if (dragState.draggableId !== data.draggableId) return;

    dispatch({ type: 'START_HIDING', payload: { mode: dragState.mode } });
  });

  const draggableDimensions = useDraggableDimensions();

  // Monitor lifecycle + pointer location updates
  createEffect(() => {
    const stop = combine(
      shouldRenderCloneWhileDragging
        ? monitorForLifecycle({
          onPendingDragStart({ start }) {
            if (data.draggableId !== start.draggableId) return;
            dispatch({ type: 'START_HIDING', payload: { mode: start.mode } });
          },
          onBeforeDragEnd({ draggableId: endId }) {
            if (endId !== data.draggableId) return;
            dispatch({ type: 'STOP_HIDING' });
          },
        })
        : monitorForLifecycle({
          onPendingDragStart({ start, droppable }) {
            if (data.draggableId !== start.draggableId) return;

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
            if (data.draggableId !== update.draggableId) return;

            dispatch({ type: 'UPDATE_DRAG', payload: { update } });

            if (update.mode === 'SNAP') {
              // microtask: ensure indicator/placeholder have updated
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

          onBeforeDragEnd({ draggableId: endId }) {
            if (endId !== data.draggableId) return;
            dispatch({ type: 'DROP' });
          },
        }),
      monitorForElements({
        canMonitor({ source }) {
          if (!isDraggableData(source.data)) {
            // not dragging something from the migration layer
            return false;
          }
          return source.data.contextId === data.contextId && source.data.draggableId === data.draggableId;
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

  const provided: Accessor<{
    draggableProps: {
      [attributes.draggable.contextId]: string;
      [attributes.draggable.id]: string;
      style: DraggingStyle | NotDraggingStyle
    };
    dragHandleProps: any;
    innerRef: (element: (HTMLElement | null)) => void
  }> = createMemo(() => ({
    draggableProps: {
      [attributes.draggable.contextId]: contextId,
      [attributes.draggable.id]: draggableId,
      style: getDraggableProvidedStyle({
        draggableDimensions,
        draggableState: state,
      }),
    },
    dragHandleProps: {
      role: 'button',
      'aria-describedby': getHiddenTextElementId(contextId),
      [attributes.dragHandle.contextId]: contextId,
      [attributes.dragHandle.draggableId]: draggableId,
      tabIndex: 0,
      /**
       * Must be false so drags trigger on the draggable element (may be a parent),
       * not the handle itself.
       */
      draggable: false,
      onDragStart: noop,
    } as any,
    innerRef: setElement,
  }));

  const snapshot: DraggableStateSnapshot = useDraggableStateSnapshot({
    draggingOver: state.draggingOver as any,
    isClone: false,
    isDragging: isDragging(),
    mode: isDragging() ? (state as any).mode : null,
  });

  const rubric: DraggableRubric = createMemo(
    () => ({
      draggableId,
      type,
      source: {
        droppableId,
        index,
      },
    }),
  )();

  return (
    <>
      {isHiding() ? null : children(provided(), snapshot, rubric)}
      {hasPlaceholder() && (
        // If your Placeholder component accepts a ref prop, wire it here:
        <Placeholder ref={(el: HTMLDivElement) => (placeholderRef.current = el)} />
      )}
    </>
  );
}
