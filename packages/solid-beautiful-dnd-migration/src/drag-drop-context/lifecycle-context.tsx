// packages/solid-beautiful-dnd-migration/src/drag-drop-context/lifecycle-context.tsx
/**
 * The lifecycle methods owned by this provider are used to align internal
 * timings with those of the rbd lifecycle.
 *
 * The events are intentionally distinct to those exposed by rbd to avoid
 * any confusion around whether events are fired internally or externally first.
 */

import { createContext, useContext, batch, type JSX } from 'solid-js';

import type {
  DraggableId,
  DraggableLocation,
  DragStart,
  DragUpdate,
} from '@arminmajerie/pragmatic-drag-and-drop/types';

import { combine } from '@arminmajerie/pragmatic-drag-and-drop/combine';

import type { CleanupFn } from '../internal-types';
import type { DroppableRegistryEntry } from './droppable-registry';
import { rbdInvariant } from './rbd-invariant';

/**
 * The data associated with each type of lifecycle event.
 */
type DispatchData = {
  onPendingDragStart: {
    start: DragStart;
    droppable: DroppableRegistryEntry;
  };
  onPrePendingDragUpdate: {
    update: DragUpdate;
    targetLocation: DraggableLocation | null;
  };
  onPendingDragUpdate: DispatchData['onPrePendingDragUpdate'] & {
    droppable: DroppableRegistryEntry | null;
  };
  onBeforeDragEnd: {
    draggableId: DraggableId;
  };
};

type LifecycleResponders = {
  [Key in keyof DispatchData]: (args: DispatchData[Key]) => void;
};

type LifecycleEvent = keyof LifecycleResponders;

type Registry = {
  [Key in keyof LifecycleResponders]: LifecycleResponders[Key][];
};

type AddResponder = <Event extends LifecycleEvent>(
  event: Event,
  responder: LifecycleResponders[Event],
) => CleanupFn;

type Dispatch = <Event extends LifecycleEvent>(event: Event, data: DispatchData[Event]) => void;

export type LifecycleManager = {
  addResponder: AddResponder;
  dispatch: Dispatch;
};

function createRegistry(): Registry {
  return {
    onPendingDragStart: [],
    onPrePendingDragUpdate: [],
    onPendingDragUpdate: [],
    onBeforeDragEnd: [],
  };
}

function createLifecycleManager(): LifecycleManager {
  const registry = createRegistry();

  const addResponder: AddResponder = (event, responder) => {
    registry[event].push(responder);
    return () => {
      // remove the responder
      // @ts-expect-error: index signature narrowing is awkward with generics here
      registry[event] = registry[event].filter((fn) => fn !== responder);
    };
  };

  const dispatch: Dispatch = (event, data) => {
    // mirror React 16 batching intent using Solid's batch
    batch(() => {
      for (const responder of registry[event]) {
        responder(data as never);
      }
    });
  };

  return { addResponder, dispatch };
}

/**
 * Creates a new lifecycle manager instance for the caller.
 */
export function useLifecycle(): LifecycleManager {
  // in Solid, just create once per owner
  const lifecycleManager = createLifecycleManager();
  return lifecycleManager;
}

type MonitorForLifecycle = (args: Partial<LifecycleResponders>) => CleanupFn;

const LifecycleContext = createContext<MonitorForLifecycle | undefined>(undefined);

export function LifecycleContextProvider(props: {
  children: JSX.Element;
  lifecycle: LifecycleManager;
}) {
  /**
   * Allows Draggable/Droppable instances to know about lifecycle timings.
   * API mirrors the pdnd monitors.
   */
  const monitorForLifecycle: MonitorForLifecycle = (responders) => {
    const cleanupFns: CleanupFn[] = [];

    for (const [event, responder] of Object.entries(responders)) {
      if (!responder) continue;
      // TS: Event is keyof LifecycleResponders; cast is safe due to guard above
      cleanupFns.push(
        props.lifecycle.addResponder(
          event as keyof LifecycleResponders,
          responder as LifecycleResponders[keyof LifecycleResponders],
        ),
      );
    }

    return combine(...cleanupFns);
  };

  return (
    <LifecycleContext.Provider value={monitorForLifecycle}>
      {props.children}
    </LifecycleContext.Provider>
  );
}

export function useMonitorForLifecycle(): MonitorForLifecycle {
  const monitorForLifecycle = useContext(LifecycleContext);
  rbdInvariant(
    monitorForLifecycle !== undefined,
    'useLifecycle() should only be called inside of a <DragDropContext />',
  );
  return monitorForLifecycle!;
}
