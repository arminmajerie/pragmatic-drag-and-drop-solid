// packages/solid-beautiful-dnd-migration/src/droppable/data.ts
import type { DroppableId } from '@arminmajerie/pragmatic-drag-and-drop/types';

/**
 * Private symbol that is intentionally not exported from this file.
 */
const privateKey: unique symbol = Symbol('DroppableData');

/**
 * Data that is attached to drags.
 */
export type DroppableData = {
  /**
   * Indicates this data is for a `<Droppable>` instance.
   */
  [privateKey]: true;

  /**
   * The `droppableId` of the `<Droppable>` instance.
   */
  droppableId: DroppableId;

  /**
   * Lazily returns whether the droppable is disabled.
   */
  getIsDropDisabled(): boolean;

  contextId: string;
};

/**
 * Checks if the passed data satisfies `DroppableData` using the private symbol.
 */
export function isDroppableData(data: Record<string | symbol, unknown>): data is DroppableData {
  return data[privateKey] === true;
}

/**
 * Adds the private symbol to the passed data.
 *
 * The symbol allows us to quickly check if an object satisfies `DroppableData`.
 */
export function useDroppableData({
                                   contextId,
                                   droppableId,
                                   getIsDropDisabled,
                                 }: Omit<DroppableData, typeof privateKey>): DroppableData {
  // In Solid, this function runs once per owner; returning a plain object is stable.
  return {
    [privateKey]: true,
    contextId,
    droppableId,
    getIsDropDisabled,
  };
}
