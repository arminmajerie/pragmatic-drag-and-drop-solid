// packages/solid-beautiful-dnd-migration/src/droppable/droppable-context.tsx
import { createContext, useContext, type ParentProps } from 'solid-js';
import type { Direction, DroppableMode } from '@arminmajerie/pragmatic-drag-and-drop/types';
import { rbdInvariant } from '../drag-drop-context/rbd-invariant';

export type DroppableContextProps = {
  direction: Direction;
  droppableId: string;
  shouldRenderCloneWhileDragging: boolean;
  isDropDisabled: boolean;
  type: string;
  mode: DroppableMode;
};

const DroppableContext = createContext<DroppableContextProps | null>(null);

// Solid-friendly Provider wrapper (so JSX sees a valid Solid component)
export function DroppableContextProvider(
  props: ParentProps<{ value: DroppableContextProps }>
) {
  return (
    <DroppableContext.Provider value={props.value}>
      {props.children}
    </DroppableContext.Provider>
  );
}

/**
 * Intended for use by `<Draggable>` instances.
 */
export function useDroppableContext(): DroppableContextProps {
  const value = useContext(DroppableContext);
  rbdInvariant(!!value, 'Missing <Droppable /> parent');
  return value!;
}

/**
 * Returns the `droppableId` of the parent droppable, if there is one.
 *
 * Intended for use only by `<Droppable>` instances.
 */
export function useParentDroppableId(): string | null {
  const parent = useContext(DroppableContext);
  return parent ? parent.droppableId : null;
}
