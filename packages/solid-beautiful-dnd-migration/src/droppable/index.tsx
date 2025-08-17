import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type JSX,
} from 'solid-js';
import { Portal } from 'solid-js/web';

import type {
  Direction,
  DroppableId,
  DroppableMode,
} from '@arminmajerie/pragmatic-drag-and-drop/types';

import { attachClosestEdge } from '@arminmajerie/pragmatic-drag-and-drop-hitbox/closest-edge';
import { combine } from '@arminmajerie/pragmatic-drag-and-drop/combine';
import { dropTargetForElements } from '@arminmajerie/pragmatic-drag-and-drop/element/adapter';

import { useDragDropContext } from '../drag-drop-context/internal-context';
import { useMonitorForLifecycle } from '../drag-drop-context/lifecycle-context';
import { isDraggableData } from '../draggable/data';
import { attributes, customAttributes, setAttributes } from '../utils/attributes';
import { useStable } from '../utils/use-stable';

import { useDroppableData } from './data';
import { DraggableClone } from './draggable-clone';
import { DropIndicator } from './drop-indicator';
import {
  type DroppableContextProps,
  DroppableContextProvider,
  useParentDroppableId,
} from './droppable-context';
import { idleState, reducer } from './state';
import { VirtualPlaceholder } from './virtual-placeholder';

// -----------------------------
// Local migration-layer types
// -----------------------------
type MigrationDroppableProvided = {
  innerRef: (el: HTMLElement | null) => void;
  droppableProps: {
    [attributes.droppable.contextId]: string;
    [attributes.droppable.id]: string;
  };
  // In standard mode the placeholder is provided inline; in virtual mode we portal it.
  placeholder: JSX.Element | null;
};

type MigrationDroppableStateSnapshot = {
  draggingFromThisWith: string | null;
  draggingOverWith: string | null;
  isDraggingOver: boolean;
  isUsingPlaceholder: boolean;
};

type MigrationDraggableChildrenFn = (
  provided: {
    // see draggable-clone.tsx for details
    draggableProps: {
      [attributes.draggable.contextId]: string;
      [attributes.draggable.id]: string;
      style: any;
    };
    dragHandleProps: any;
    innerRef: (el: HTMLElement | null) => void;
  },
  snapshot: any,
  rubric: { draggableId: string; type: string; source: { droppableId: DroppableId; index: number } },
) => JSX.Element;

type MigrationDroppableProps = {
  children: (provided: MigrationDroppableProvided, snapshot: MigrationDroppableStateSnapshot) => JSX.Element;
  droppableId: DroppableId;
  type?: string; // default 'DEFAULT'
  direction?: Direction; // default 'vertical'
  mode?: DroppableMode; // default 'standard'
  renderClone?: MigrationDraggableChildrenFn;
  getContainerForClone?: () => HTMLElement;
  isDropDisabled?: boolean;
};

// -----------------------------

export function Droppable(props: MigrationDroppableProps) {
  const type = props.type ?? 'DEFAULT';
  const direction = props.direction ?? 'vertical';
  const mode = props.mode ?? 'standard';
  const isDropDisabledProp = props.isDropDisabled ?? false;

  const getIsDropDisabled = useStable(isDropDisabledProp);

  const { contextId, droppableRegistry } = useDragDropContext();

  const data = useDroppableData({
    contextId,
    droppableId: props.droppableId,
    getIsDropDisabled,
  });

  // element ref as a signal (so effects react to it)
  const [element, setElementSignal] = createSignal<HTMLElement | null>(null);
  const setElement = (el: HTMLElement | null) => {
    if (el) {
      setAttributes(el, {
        [customAttributes.droppable.type]: type,
        [customAttributes.droppable.direction]: direction,
        // easier to apply here than via render props for virtual lists
        [attributes.droppable.id]: props.droppableId,
        [attributes.droppable.contextId]: contextId,
      });
    }
    setElementSignal(el);
  };

  // reducer -> signal wrapper
  const [state, setState] = createSignal(idleState);
  const dispatch = (action: any) => setState((prev) => reducer(prev, action));

  const draggingFromThisWith = createMemo(() => state().draggingFromThisWith);
  const draggingOverWith = createMemo(() => state().draggingOverWith);
  const isDraggingOver = createMemo(() => state().isDraggingOver);

  const parentDroppableId = useParentDroppableId();

  // Register with registry & element drop target
  createEffect(() => {
    const el = element();
    if (!el) return;

    const clean = combine(
      droppableRegistry.register({
        droppableId: props.droppableId,
        type,
        isDropDisabled: isDropDisabledProp,
        parentDroppableId,
        element: el,
        direction,
        mode,
      }),
      dropTargetForElements({
        element: el,
        getData({ input }) {
          return attachClosestEdge(data, {
            element: el,
            input,
            allowedEdges: direction === 'vertical' ? ['top', 'bottom'] : ['left', 'right'],
          });
        },
        canDrop({ source }) {
          if (!isDraggableData(source.data)) {
            return false;
          }
          if (isDropDisabledProp) return false;
          return source.data.contextId === contextId && source.data.type === type;
        },
        onDragLeave() {
          dispatch({ type: 'DRAG_CLEAR' });
        },
      }),
    );

    onCleanup(() => clean());
  });

  // Lifecycle monitoring (enter/leave)
  const monitorForLifecycle = useMonitorForLifecycle();
  createEffect(() => {
    function isEventRelevant(data: {
      destination: { droppableId: DroppableId } | undefined | null;
      type: string;
    }) {
      const isSameType = data.type === type;
      const overNow = data.destination?.droppableId === props.droppableId;
      const enter = !isDraggingOver() && overNow;
      const leave = isDraggingOver() && !overNow;
      return isSameType && (enter || leave);
    }

    const stop = monitorForLifecycle({
      onPendingDragStart: ({ start }) => {
        if (!isEventRelevant({ destination: start.source, type: start.type })) return;
        dispatch({ type: 'DRAG_START', payload: { droppableId: props.droppableId, start } });
      },
      onPendingDragUpdate: ({ update }) => {
        if (!isEventRelevant(update)) return;
        dispatch({ type: 'DRAG_UPDATE', payload: { droppableId: props.droppableId, update } });
      },
      onBeforeDragEnd: () => {
        // safe optimistic clear
        dispatch({ type: 'DRAG_CLEAR' });
      },
    });

    onCleanup(() => stop());
  });

  // Inline drop indicator for standard lists
  const dropIndicator = createMemo(() => {
    if (!isDraggingOver()) return null;
    return <DropIndicator direction={direction} mode={mode} />;
  });

  // provided + snapshot
  const provided = createMemo<MigrationDroppableProvided>(() => ({
    innerRef: setElement,
    droppableProps: {
      [attributes.droppable.contextId]: contextId,
      [attributes.droppable.id]: props.droppableId,
    },
    placeholder: mode === 'standard' ? dropIndicator() : null,
  }));

  const snapshot = createMemo<MigrationDroppableStateSnapshot>(() => ({
    draggingFromThisWith: draggingFromThisWith(),
    draggingOverWith: draggingOverWith(),
    isDraggingOver: isDraggingOver(),
    isUsingPlaceholder: isDraggingOver(),
  }));

  // Portal drop indicator when virtual
  const portalIndicatorMount = createMemo(() =>
    isDraggingOver() && mode === 'virtual' ? element() : null,
  );

  // Ensure virtual container has positioning for absolutely-positioned indicator
  createEffect(() => {
    const el = portalIndicatorMount();
    if (!el) return;

    const computed = window.getComputedStyle(el);
    if (computed.position !== 'static') return;

    const prev = el.style.position;
    el.style.position = 'relative';
    onCleanup(() => {
      el.style.position = prev;
    });
  });

  // Disable dragging style for the real draggable when we have a clone
  const shouldRenderCloneWhileDragging = !!props.renderClone;

  const contextValue = createMemo<DroppableContextProps>(() => ({
    direction,
    droppableId: props.droppableId,
    shouldRenderCloneWhileDragging,
    isDropDisabled: isDropDisabledProp,
    type,
    mode,
  }));

  // Portal a placeholder for virtual lists (dragging from this list)
  const portalPlaceholderMount = createMemo(() =>
    draggingFromThisWith() && mode === 'virtual' ? element() : null,
  );

  return (
    <DroppableContextProvider value={contextValue()}>
      {props.children(provided(), snapshot())}

      {portalIndicatorMount() && (
        <Portal mount={portalIndicatorMount()!}>{dropIndicator()}</Portal>
      )}

      {portalPlaceholderMount() && (
        <Portal mount={portalPlaceholderMount()!}>
          <VirtualPlaceholder
            droppableId={props.droppableId}
            draggableId={draggingFromThisWith()!}
            type={type}
            direction={direction}
            isDropDisabled={isDropDisabledProp}
          />
        </Portal>
      )}

      {props.renderClone && (
        <DraggableClone
          droppableId={props.droppableId}
          type={type}
          getContainerForClone={props.getContainerForClone}
        >
          {props.renderClone}
        </DraggableClone>
      )}
    </DroppableContextProvider>
  );
}
