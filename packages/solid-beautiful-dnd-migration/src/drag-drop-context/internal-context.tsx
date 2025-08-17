// packages/solid-beautiful-dnd-migration/src/drag-drop-context/internal-context.tsx
import { createContext, useContext, type JSX } from 'solid-js';

import type { DroppableRegistry } from './droppable-registry';
import { rbdInvariant } from './rbd-invariant';
import type { DragState, StartKeyboardDrag } from './types';

type DragDropContextValue = {
  /**
   * A string used to uniquely identify each context instance.
   * Matches the original rbd approach.
   */
  contextId: string;

  /** Lazily returns the current drag state. */
  getDragState(): DragState;

  startKeyboardDrag: StartKeyboardDrag;

  droppableRegistry: DroppableRegistry;
};

const DragDropContext = createContext<DragDropContextValue | undefined>(undefined);

export function useDragDropContext(): DragDropContextValue {
  const value = useContext(DragDropContext);
  rbdInvariant(value !== undefined, 'Unable to find DragDropContext context');
  return value!;
}

export function DragDropContextProvider(props: {
  children: JSX.Element;
  contextId: string;
  getDragState(): DragState;
  startKeyboardDrag: StartKeyboardDrag;
  droppableRegistry: DroppableRegistry;
}) {
  // Values are stable for the lifetime of a drag-drop context.
  const value: DragDropContextValue = {
    contextId: props.contextId,
    getDragState: props.getDragState,
    startKeyboardDrag: props.startKeyboardDrag,
    droppableRegistry: props.droppableRegistry,
  };

  return (
    <DragDropContext.Provider value={value}>
      {props.children}
    </DragDropContext.Provider>
  );
}
