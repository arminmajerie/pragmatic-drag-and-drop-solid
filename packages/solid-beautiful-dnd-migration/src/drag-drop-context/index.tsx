// packages/solid-beautiful-dnd-migration/src/drag-drop-context/index.tsx
import type {
  BeforeCapture,
  DraggableLocation,
  DragStart,
  DragUpdate,
  DroppableId,
  DroppableMode,
  DropResult,
  MovementMode,
} from '@arminmajerie/pragmatic-drag-and-drop/types';
import { type JSX, onCleanup } from 'solid-js';

import { getDraggableDimensions } from '../hooks/use-captured-dimensions';
import { useCleanupFn } from '../hooks/use-cleanup-fn';
import { attributes, getAttribute } from '../utils/attributes';
import { findDragHandle } from '../utils/find-drag-handle';
import { getClosestPositionedElement } from '../utils/get-closest-positioned-element';

import { cancelPointerDrag } from './cancel-drag';
import { isSameLocation } from './draggable-location';
import { type DroppableRegistryEntry, useDroppableRegistry } from './droppable-registry';
import { ErrorBoundary } from './error-boundary';
import { getActualDestination } from './get-destination';
import useHiddenTextElement from './hooks/use-hidden-text-element';
import { useKeyboardControls } from './hooks/use-keyboard-controls';
import { usePointerControls } from './hooks/use-pointer-controls';
import useStyleMarshal from './hooks/use-style-marshal';
import { DragDropContextProvider } from './internal-context';
import { LifecycleContextProvider, useLifecycle } from './lifecycle-context';
import { announce } from './live-region';
import { rbdInvariant } from './rbd-invariant';
import { defaultDragHandleUsageInstructions, getProvided } from './screen-reader';
import type { DragController, DragState } from './types';
import { useScheduler } from './use-scheduler';

/**
 * Instance counter for unique context ids (matches original approach).
 */
let instanceCount = 0;

export function resetServerContext() {
  instanceCount = 0;
}

function getContextId() {
  return `${instanceCount++}`;
}

function getOffset(args: { element: HTMLElement; mode: DroppableMode }) {
  const offsetElement = getClosestPositionedElement(args);
  return {
    top: offsetElement.offsetTop,
    left: offsetElement.offsetLeft,
  };
}

type Props = {
  children?: JSX.Element;
  dragHandleUsageInstructions?: string;
  nonce?: string;
  onBeforeCapture?: (before: BeforeCapture) => void;
  onBeforeDragStart?: (start: DragStart) => void;
  onDragStart?: (start: DragStart, provided: ReturnType<typeof getProvided>['provided']) => void;
  onDragUpdate?: (update: DragUpdate, provided: ReturnType<typeof getProvided>['provided']) => void;
  onDragEnd: (result: DropResult, provided: ReturnType<typeof getProvided>['provided']) => void;
};

export function DragDropContext({
                                  children,
                                  dragHandleUsageInstructions = defaultDragHandleUsageInstructions,
                                  nonce,
                                  onBeforeCapture,
                                  onBeforeDragStart,
                                  onDragStart,
                                  onDragUpdate,
                                  onDragEnd,
                                }: Props): JSX.Element {
  // stable per instance
  const contextId = getContextId();

  // hidden text element for screen readers
  useHiddenTextElement({ contextId, text: dragHandleUsageInstructions });

  // lifecycle + scheduler
  const lifecycle = useLifecycle();
  const { schedule, flush } = useScheduler();

  // mutable drag state (no reactivity required)
  const dragStateRef: { current: DragState } = { current: { isDragging: false } };
  const getDragState = () => dragStateRef.current;

  // droppable registry
  const droppableRegistry = useDroppableRegistry();

  const getClosestEnabledDraggableLocation = ({
                                                droppableId,
                                              }: {
    droppableId: DroppableId;
  }): DraggableLocation | null => {
    let droppable = droppableRegistry.getEntry({ droppableId });

    while (droppable !== null && droppable.isDropDisabled) {
      const { parentDroppableId } = droppable;
      droppable = parentDroppableId ? droppableRegistry.getEntry({ droppableId: parentDroppableId }) : null;
    }

    if (droppable === null) {
      return null;
    }
    return { droppableId: droppable.droppableId, index: 0 };
  };

  // cancel any active drag if context is disposed
  onCleanup(() => {
    const { isDragging } = getDragState();
    if (isDragging) {
      cancelPointerDrag();
    }
  });

  const updateDrag: DragController['updateDrag'] = ({
                                                      targetLocation,
                                                      isImmediate = false,
                                                    }: {
    targetLocation: DraggableLocation | null;
    isImmediate?: boolean;
  }) => {
    if (!dragStateRef.current.isDragging) {
      return;
    }

    const { prevDestination, draggableId, type, sourceLocation } = dragStateRef.current;

    const nextDestination = getActualDestination({
      start: sourceLocation,
      target: targetLocation,
    });

    if (isSameLocation(prevDestination, nextDestination)) {
      return;
    }

    Object.assign(dragStateRef.current, {
      prevDestination: nextDestination,
      sourceLocation,
      targetLocation,
    });

    const update: DragUpdate = {
      mode: dragStateRef.current.mode!,
      draggableId,
      type,
      source: sourceLocation,
      destination: nextDestination,
      combine: null, // not supported by migration layer
    };

    const droppable = targetLocation
      ? droppableRegistry.getEntry({ droppableId: targetLocation.droppableId })
      : null;

    // ensure drop indicator updates before drag preview
    lifecycle.dispatch('onPrePendingDragUpdate', { update, targetLocation });
    lifecycle.dispatch('onPendingDragUpdate', {
      update,
      targetLocation,
      droppable,
    });

    const dispatchConsumerLifecycleEvent = () => {
      const { provided, getMessage } = getProvided('onDragUpdate', update);
      onDragUpdate?.(update, provided);
      announce(getMessage());
    };

    if (isImmediate) {
      dispatchConsumerLifecycleEvent();
    } else {
      schedule(dispatchConsumerLifecycleEvent);
    }
  };

  const startDrag: DragController['startDrag'] = ({
                                                    draggableId,
                                                    type,
                                                    getSourceLocation,
                                                    sourceElement,
                                                    mode,
                                                  }: {
    draggableId: string;
    type: string;
    getSourceLocation(): DraggableLocation;
    sourceElement: HTMLElement;
    mode: MovementMode;
  }) => {
    if (dragStateRef.current.isDragging) {
      return;
    }

    const before: BeforeCapture = { draggableId, mode };
    onBeforeCapture?.(before);

    const start: DragStart = {
      mode,
      draggableId,
      type,
      source: getSourceLocation(),
    };

    // Remember the active drag-handle to restore focus after drag
    const { activeElement } = document;
    const dragHandleDraggableId =
      activeElement instanceof HTMLElement &&
      activeElement.hasAttribute(attributes.dragHandle.draggableId)
        ? getAttribute(activeElement, attributes.dragHandle.draggableId)
        : null;

    const { droppableId } = start.source;
    const droppable = droppableRegistry.getEntry({ droppableId });
    rbdInvariant(droppable, `should have entry for droppable '${droppableId}'`);

    dragStateRef.current = {
      isDragging: true,
      mode,
      draggableDimensions: getDraggableDimensions(sourceElement),
      restoreFocusTo: dragHandleDraggableId,
      draggableId,
      type,
      prevDestination: start.source,
      sourceLocation: start.source,
      targetLocation: start.source,
      draggableInitialOffsetInSourceDroppable: getOffset({
        element: sourceElement,
        mode: droppable.mode,
      }),
    };

    onBeforeDragStart?.(start);

    // Synchronous: notify Draggable/Droppable to update state
    lifecycle.dispatch('onPendingDragStart', { start, droppable });

    // rbd onDragStart is next tick
    schedule(() => {
      const startAgain: DragStart = {
        mode,
        draggableId,
        type,
        source: getSourceLocation(),
      };

      const { provided, getMessage } = getProvided('onDragStart', startAgain);
      onDragStart?.(startAgain, provided);
      announce(getMessage());

      // If source droppable is disabled, publish immediate update to a valid destination
      schedule(() => {
        const { droppableId } = startAgain.source;
        const drop = droppableRegistry.getEntry({ droppableId });

        if (drop?.isDropDisabled) {
          const targetLocation = getClosestEnabledDraggableLocation({ droppableId });
          updateDrag({ targetLocation: targetLocation, isImmediate: true });
        }
      });
    });
  };

  const keyboardCleanupManager = useCleanupFn();

  const stopDrag: DragController['stopDrag'] = ({ reason }) => {
    if (!dragStateRef.current.isDragging) {
      return;
    }

    keyboardCleanupManager.runCleanupFn();

    // For CANCEL, normalize to an update with null destination (standardizes mouse/keyboard)
    if (reason === 'CANCEL') {
      updateDrag({ targetLocation: null });
    }

    const { mode, restoreFocusTo, sourceLocation, targetLocation, type, draggableId } =
      dragStateRef.current;

    dragStateRef.current = { isDragging: false };

    flush();

    const destination = getActualDestination({
      start: sourceLocation!,
      target: targetLocation!,
    });

    const result: DropResult = {
      // All null-destination drops count as CANCEL
      reason: destination === null ? 'CANCEL' : 'DROP',
      type: type!,
      source: sourceLocation!,
      destination,
      mode: mode!,
      draggableId: draggableId!,
      combine: null, // not supported by migration layer
    };

    // tell Draggable to cleanup
    lifecycle.dispatch('onBeforeDragEnd', { draggableId: draggableId! });

    const { provided, getMessage } = getProvided('onDragEnd', result);
    onDragEnd(result, provided);
    announce(getMessage());

    if (restoreFocusTo) {
      // wait a frame to let DOM/state settle, then re-focus original drag handle
      requestAnimationFrame(() => {
        const dragHandle = findDragHandle({ contextId, draggableId: restoreFocusTo });
        if (!dragHandle) return;
        dragHandle.focus();
      });
    }
  };

  const dragController: DragController = {
    getDragState,
    startDrag,
    updateDrag,
    stopDrag,
  };

  // pointer + keyboard controls
  usePointerControls({ dragController, contextId });

  const { startKeyboardDrag } = useKeyboardControls({
    dragController,
    droppableRegistry,
    contextId,
    setKeyboardCleanupFn: keyboardCleanupManager.setCleanupFn,
  });

  // If a droppable becomes disabled during a drag, find next destination
  const onDroppableUpdate = (entry: DroppableRegistryEntry) => {
    const dragState = dragStateRef.current;
    if (!dragState.isDragging) return;
    if (!entry.isDropDisabled) return;
    if (entry.droppableId !== dragState.targetLocation?.droppableId) return;

    const targetLocation = getClosestEnabledDraggableLocation({
      droppableId: entry.droppableId,
    });
    updateDrag({ targetLocation });
  };

  droppableRegistry.setUpdateListener(onDroppableUpdate);

  // style marshal for drag handle cursor / iOS link behavior
  useStyleMarshal({ contextId, nonce });

  return (
    <ErrorBoundary contextId={contextId} dragController={dragController}>
      <LifecycleContextProvider lifecycle={lifecycle}>
        <DragDropContextProvider
          contextId={contextId}
          getDragState={getDragState}
          startKeyboardDrag={startKeyboardDrag}
          droppableRegistry={droppableRegistry}
        >
          {children}
        </DragDropContextProvider>
      </LifecycleContextProvider>
    </ErrorBoundary>
  );
}
