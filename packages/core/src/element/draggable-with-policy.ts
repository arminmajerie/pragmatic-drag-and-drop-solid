// packages/core/src/element/draggable-with-policy.ts
// Thin wrapper around pragmatic's `draggable` that lets a source policy
// decide if a drag can start and standardizes the DragMeta payload.
// Policies are injected via options so this package stays decoupled.

import type { CleanupFn, Input } from '../internal-types';
import { draggable } from '../adapter/element-adapter';
import type { DragMeta, SourcePolicy } from './drop-target-with-policy';

export type CanStartArgs = {
  element: HTMLElement;
  dragHandle: Element | null;
  input: Input;
};

export interface DraggableWithPolicyOptions {
  element: HTMLElement;
  dragHandle?: Element;

  /** Build DragMeta consistently for your app (id, tagName, componentType, etc.) */
  buildDragMeta(args: { element: HTMLElement; dragHandle: Element | null; input: Input }): DragMeta;

  /** Resolve a source policy for this element tagName (injected from your app registry) */
  getSourcePolicy: (tagName: string) => (SourcePolicy & { canStart?(args: CanStartArgs): boolean }) | undefined;

  /** Pass-through handlers (optional) – forwarded to underlying `draggable` */
  canDragOverride?: (args: CanStartArgs) => boolean; // runs before policy.canStart if provided
  onGenerateDragPreview?: (args: any) => void;
  onDragStart?: (args: any) => void;
  onDrag?: (args: any) => void;
  onDrop?: (args: any) => void;
}

/**
 * Use in components instead of calling `draggable` directly when you want
 * policy-aware drag start gating and a standardized DragMeta payload.
 */
export function draggableWithPolicy(opts: DraggableWithPolicyOptions): CleanupFn {
  const {
    element,
    dragHandle,
    buildDragMeta,
    getSourcePolicy,
    canDragOverride,
    onGenerateDragPreview,
    onDragStart,
    onDrag,
    onDrop,
  } = opts;

  return draggable({
    element,
    dragHandle,

    canDrag: ({ element, dragHandle, input }) => {
      // Optional local override first
      if (canDragOverride && !canDragOverride({ element, dragHandle, input })) {
        return false;
      }
      // Policy-based gate
      const meta = buildDragMeta({ element, dragHandle, input });
      const sp = getSourcePolicy(meta.tagName);
      if (sp?.canStart) {
        return !!sp.canStart({ element, dragHandle, input });
      }
      return true;
    },

    getInitialData: ({ element, dragHandle, input }) => {
      // Standardized DragMeta travels as source.data
      const meta = buildDragMeta({ element, dragHandle, input });
      return meta as unknown as Record<string, unknown>;
    },

    // Pass-through events unchanged
    onGenerateDragPreview,
    onDragStart,
    onDrag,
    onDrop,
  });
}
