// packages/solid-beautiful-dnd-migration/src/drag-drop-context/droppable-registry.ts
import { onCleanup } from 'solid-js';

import type {
  Direction,
  DroppableId,
  DroppableMode,
} from '@arminmajerie/pragmatic-drag-and-drop/types';

import type { CleanupFn } from '../internal-types';

export type DroppableRegistryEntry = {
  droppableId: DroppableId;
  isDropDisabled: boolean;
  parentDroppableId: DroppableId | null;
  type: string;
  element: HTMLElement;
  direction: Direction;
  mode: DroppableMode;
};

type Register = (entry: DroppableRegistryEntry) => CleanupFn;

export type GetEntry = (args: { droppableId: DroppableId }) => DroppableRegistryEntry | null;

type UpdateListener = (entry: DroppableRegistryEntry) => void;
type SetUpdateListener = (updateListener: UpdateListener) => void;

export type DroppableRegistry = {
  getEntry: GetEntry;
  register: Register;
  setUpdateListener: SetUpdateListener;
};

function createDroppableRegistry(): DroppableRegistry {
  const droppableMap = new Map<DroppableId, DroppableRegistryEntry>();

  const getEntry: GetEntry = ({ droppableId }) => droppableMap.get(droppableId) ?? null;

  let updateListener: UpdateListener | null = null;
  const setUpdateListener: SetUpdateListener = (listener) => {
    updateListener = listener;
  };

  const register: Register = (entry) => {
    droppableMap.set(entry.droppableId, entry);
    updateListener?.(entry);

    return () => {
      droppableMap.delete(entry.droppableId);
    };
  };

  return { getEntry, register, setUpdateListener };
}

export function useDroppableRegistry(): DroppableRegistry {
  const registry = createDroppableRegistry();

  // tidy up on owner disposal
  onCleanup(() => {
    // clear references (optional but nice)
    (registry as any)._clear?.() ?? null; // if you later add an internal clear
    // or directly clear via closure if you expose it; not strictly needed
  });

  return registry;
}
