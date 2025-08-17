// packages/hitbox/src/closest-edge.ts
import type { Input, Position } from '@arminmajerie/pragmatic-drag-and-drop/types';
import type { Edge as EdgeRaw } from './types';
export type Edge = EdgeRaw;

const getDistanceToEdge: {
  [TKey in Edge]: (rect: DOMRect, client: Position) => number;
} = {
  top: (rect, client) => Math.abs(client.y - rect.top),
  right: (rect, client) => Math.abs(rect.right - client.x),
  bottom: (rect, client) => Math.abs(rect.bottom - client.y),
  left: (rect, client) => Math.abs(client.x - rect.left),
};

// unique symbol key so we don’t collide with consumer keys
const uniqueKey = Symbol('closestEdge');

/**
 * Adds a unique `Symbol` to the `userData` object. Use with `extractClosestEdge()` for type-safe lookups.
 */
export function attachClosestEdge(
  userData: Record<string | symbol, unknown>,
  {
    element,
    input,
    allowedEdges = ['top', 'right', 'bottom', 'left'],
  }: {
    element: Element;
    input: Input;
    allowedEdges?: Edge[];
  },
): Record<string | symbol, unknown> {
  const client: Position = { x: input.clientX, y: input.clientY };
  const rect: DOMRect = (element as HTMLElement).getBoundingClientRect();

  const entries = allowedEdges.map((edge) => ({
    edge,
    value: getDistanceToEdge[edge](rect, client),
  }));

  const addClosestEdge: Edge | null = entries.sort((a, b) => a.value - b.value)[0]?.edge ?? null;

  return {
    ...userData,
    [uniqueKey]: addClosestEdge,
  };
}

/**
 * Returns the value added by `attachClosestEdge()` to the `userData` object. Returns `null` if not present.
 */
export function extractClosestEdge(userData: Record<string | symbol, unknown>): Edge | null {
  return (userData[uniqueKey] as Edge) ?? null;
}
