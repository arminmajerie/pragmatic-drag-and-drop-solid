// packages/solid-beautiful-dnd-migration/src/drag-drop-context/error-boundary.tsx
import { onMount, onCleanup, ErrorBoundary as SolidErrorBoundary, type JSX } from 'solid-js';
import { bind } from 'bind-event-listener';

import { combine } from '@arminmajerie/pragmatic-drag-and-drop/combine';
import { monitorForElements } from '@arminmajerie/pragmatic-drag-and-drop/element/adapter';

import { error, warning } from '../dev-warning';
import { cancelPointerDrag } from './cancel-drag';
import { RbdInvariant } from './rbd-invariant';
import type { DragController } from './types';

type ErrorBoundaryProps = {
  children: JSX.Element;
  contextId: string;              // kept to match original API (unused here)
  dragController: DragController;
};

/**
 * Core logic: sets up monitor + window error handler.
 * Returns children unchanged; side-effects are lifecycle-based.
 */
function ErrorBoundaryInner(props: ErrorBoundaryProps) {
  // kept for parity with original impl (not used elsewhere)
  let isDragging = false;

  const handleWindowError = (event: ErrorEvent) => {
    const dragState = props.dragController.getDragState();
    if (!dragState.isDragging) return;

    if (dragState.mode === 'FLUID') {
      cancelPointerDrag();
    }
    if (dragState.mode === 'SNAP') {
      props.dragController.stopDrag({ reason: 'CANCEL' });
    }

    if (process.env.NODE_ENV !== 'production') {
      warning(`
        An error was caught by our window 'error' event listener while a drag was occurring.
        The active drag has been aborted.
      `);
    }

    const err: unknown = event.error;

    if (err instanceof RbdInvariant) {
      // prevent "uncaught" noise in console
      event.preventDefault();
      if (process.env.NODE_ENV !== 'production') {
        error(err.message);
      }
    }
  };

  onMount(() => {
    const stop = combine(
      monitorForElements({
        onDragStart() {
          isDragging = true;
        },
        onDrop() {
          isDragging = false;
        },
      }),
      // @ts-expect-error: bind's typings are broad; listener narrows at runtime
      bind(window, { type: 'error', listener: handleWindowError }),
    );

    onCleanup(() => {
      stop();
      isDragging = false;
    });
  });

  return props.children;
}

/**
 * Public Solid component: catches errors from children.
 * - RbdInvariant -> log in dev and swallow
 * - anything else -> rethrow to parent boundaries
 */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return (
    <SolidErrorBoundary
      fallback={(err) => {
        if (err instanceof RbdInvariant) {
          if (process.env.NODE_ENV !== 'production') {
            error(err.message);
          }
          return null; // swallow
        }
        // propagate to outer boundaries
        throw err;
      }}
    >
      <ErrorBoundaryInner
        contextId={props.contextId}
        dragController={props.dragController}
      >
        {props.children}
      </ErrorBoundaryInner>
    </SolidErrorBoundary>
  );
}

export default ErrorBoundary;
