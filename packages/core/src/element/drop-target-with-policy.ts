// packages/core/src/element/drop-target-with-policy.ts
// Wrapper around pragmatic's dropTargetForElements that evaluates policy from the drag source
// and (optionally) the destination. This file is library-local and does not import app paths.
// Policies are injected via options so the library stays decoupled.

import { dropTargetForElements } from '../entry-point/element/adapter';

// ----- Edge types: horizontal + vertical (axis-aware) -----
type HorizontalEdge = 'left' | 'right' ;
type VerticalEdge = 'top' | 'bottom' ;
export type Edge = HorizontalEdge | VerticalEdge;
type AllowedEdges = Edge[];

/**
 * Metadata describing the current drag source.
 *
 * These fields are produced by the draggable adapter and carried through the DnD pipeline.
 * Policies should treat this as *read-only*.
 */
export interface DragMeta {
  /** Unique identifier of the dragged item (application-level id). */
  id: string;

  /** Semantic tag / type of the dragged item (e.g. 'MainFlow', 'BranchBox', 'Scheduler'). */
  tagName: string;

  /** The DOM element associated with the dragged item, if applicable. */
  element?: Element;

  /**
   * Logical level of the item in your domain model (e.g., 1 for Level1, 2 for Level2).
   * Can be a single number or array for multi-level components (e.g., [2, 5] for RaiseError).
   * Optional; present only if your app emits it.
   */
  level?: number[] | null;

  /**
   * Whether this drag originates from a palette/new item rather than an existing canvas item.
   * If omitted, treat as false.
   */
  isNew?: boolean;

  /**
   * Identifier of the source canvas this item came from, if any.
   * Null if not applicable (e.g., palette) or unknown.
   */
  SourceCanvasId?: string | null;

  /**
   * Optional variant/subtype hint (e.g., 'header', 'palette', 'error').
   * Use for policy nuance without branching on tagName.
   */
  variant?: string;

  /**
   * bubbleToFirst: will bubble up to the first eligible drop target in the DOM tree.
   * topmostOnly: will only consider the topmost target under the pointer.
   */
  dropStrategy?: 'bubbleToFirst' | 'topmostOnly';


  /**
   * Extension slot for additional app-specific metadata.
   * Keep values JSON-serializable where possible.
   */
  [k: string]: unknown;
}

/**
 * Declared capabilities of a destination canvas/zone.
 * Policies use this to quickly rule in/out drops without inspecting the DOM.
 */
export interface CanvasCaps {
  /**
   * Logical level for the destination (e.g., 1 for Level1/Root, 2 for Level2).
   * Use consistent numbering across the app.
   */
  level: number;

  /**
   * Capability flags describing the destination (ordered, free-form).
   * Examples: ['HorizontalCanvas','MainCanvas','MainFlow'] or ['VerticalCanvas','Choice'].
   */
  caps: string[];
}


/**
 * Snapshot of current children within a destination zone, in DOM order.
 * This allows policies to reason about relative placement, duplicates, etc.
 */
export interface CanvasChildren {
  /** Child element ids, in exact DOM paint order. */
  ids: string[];

  /** Matching tag names for each child id (same length and order as `ids`). */
  tagNames: string[];
}

/**
 * The minimal, library-facing context passed to policy pre-checks during hover.
 * Cheap to compute and stable per animation frame.
 */
export interface PolicyContext {
  /** Metadata about the current drag source (id/type/newness/etc). */
  dragMeta: DragMeta;

  /** Declared capabilities of the destination canvas/zone. */
  destCaps: CanvasCaps;

  /** The destination canvas (or row) DOM element under the pointer. */
  canvasEl: Element;

  /**
   * Current children within the destination (ids/tags in DOM order).
   * Used for quick allow/deny checks and relative insertion rules.
   */
  canvasChildren: CanvasChildren;

  /**
   * If precomputed, the index (0-based) where a drop would go relative to children.
   * Null if not determined at this stage.
   */
  targetIndex: number | null;
}


// ---- Destination context provided by the zone (cheap to compute) ----
/**
 * Lightweight destination snapshot built by the drop zone on each hover step.
 * This is used to produce the `PolicyContext` and inform edge calculations.
 */
export interface DestContext {
  /** Destination canvas (or row) DOM element under consideration. */
  canvasEl: Element;

  /** Declared capabilities for this destination. */
  destCaps: CanvasCaps;

  /** Current children of this destination, in DOM order. */
  canvasChildren: CanvasChildren;

  /**
   * Suggested insertion index relative to `canvasChildren`, if known.
   * Set to `null` if not available or not applicable for this zone.
   */
  targetIndex: number | null;

  /**
   * Axis candidates allowed by this destination (e.g., ['left','right'] or ['top','bottom']).
   * If omitted/empty, candidates will be inferred from destCaps:
   *   includes('VerticalCanvas') -> ['top','bottom']
   *   else -> ['left','right']
   */
  allowedEdgeCandidates?: AllowedEdges | null;
}




export type CanStartArgs = {
  element: Element;
  dragHandle: Element | null;
  // keep input untyped to avoid coupling with the DnD lib
  input: any;
};

export interface DestSnapshot {
  canvasEl: Element;
  /** Destination canvas id (the XML element id that owns <children/>) */
  canvasId: string;
  dropKind: string;
  orientation: 'horizontal' | 'vertical';
  destCaps: { level: number; caps: string[] };
  canvasChildren: { ids: string[]; tagNames: string[] };
}

export interface ProposedPlacement {
  /** Destination parent canvas id (same as DestSnapshot.canvasId; included for convenience) */
  parentId: string;
  /** Anchor element id (or null for empty insert) */
  anchorId: string | null;
  /** Direction relative to anchor (both axes supported) */
  edge: Edge;
}

export type Accessor<T> = () => T;

export interface XMLConfigurationAPI {
  /** Raw DOM doc if a caller really needs to create nodes, etc. */
  readonly xmlDoc: XMLDocument;

  // ---- Lookups / reactive lists ----
  getElementById(id: string): Element | null;
  children$(containerId: string): Accessor<Element[]>;
  getComponentChildren(parentEl: Element | null): Element[];

  // ---- Canvas ancestry helpers (perf-safe) ----
  topCanvasOf(nodeId: string): string | null;

  // ---- Reactivity / persistence knobs ----
  bump(id?: string | null): void;
  batch<T>(fn: () => T): T;
}

export interface PerformResult {
  mutated: boolean;
  newId?: string;
  reason?: string;
}

export interface PerformArgs {
  /** Your XML service façade; left as any to avoid tight coupling */
  xmlCfg: XMLConfigurationAPI;

  /** The actual dragged element from source.data */
  sourceEl: Element;

  /** Parsed metadata about the drag source */
  dragMeta: DragMeta;

  /** Snapshot of destination context */
  dest: DestSnapshot;

  /** Placement proposal computed by the dropzone */
  proposed: ProposedPlacement;

  /** Optional abort signal for cancellation */
  abortSignal?: AbortSignal;
}

export interface SourcePolicy {
  /** Source decides if a drop to a given destination is allowed. */
  canDrop(ctx: PolicyContext): boolean ;

  /** Source suggests allowed edges for highlighting & placement. */
  allowedEdges?(ctx: PolicyContext): Edge[];

  /** Optional: gate drag start (used by draggableWithPolicy). */
  canStart?(args: CanStartArgs): boolean;

  /**
   * Optional: execute the actual drop for this source.
   * Canvas will call this (if defined) after policies pass.
   * If undefined: Canvas does not mutate (no generic fallback).
   */
  perform?(args: PerformArgs): Promise<PerformResult | void> | PerformResult | void;
}

export interface DropPolicy {
  canAccept(ctx: PolicyContext): boolean;
  validateDrop?(
    ctx: PolicyContext,
  ): { ok: true } | { ok: false; code: string; message?: string };
  onDrop?(ctx: PolicyContext): unknown;
}

export interface DropTargetWithPolicyOptions {
  element: Element;
  /** Key for destination policy registry (e.g., 'MainCanvas', 'BranchBoxCanvas') */
  dropKind: string;

  /** Build destination context on demand (keep this cheap). */
  buildDestContext(element: Element): DestContext;

  /**
   * Convert allowed edges to the data blob your UI expects (e.g., attachClosestEdge).
   * This keeps the wrapper generic and UI-agnostic.
   */
  edgeData(args: {
    element: Element;
    input: unknown;
    allowedEdges: AllowedEdges;
    source: any;
  }): Record<string | symbol, unknown>;

  /** Injected policy resolvers from the app (decoupled from library) */
  getSourcePolicy: (tagName: string) => SourcePolicy | undefined;
  getDropPolicy: (kind: string) => DropPolicy | undefined;

  /** Pass-through handlers (optional) */
  onDragEnter?: (args: any) => void;
  onDrag?: (args: any) => void;
  onDragLeave?: (args: any) => void;
  onDropTargetChange?: (args: any) => void;
  onDrop?: (args: any) => void;
  getIsSticky?: (args: any) => boolean;

  /** Enable verbose console logs for decisions */
  debugLog?: boolean;
}

// ---------- internal helpers ----------
function toDragMeta(source: any): DragMeta {
  const srcEl: Element = (source?.data?.element as Element) ?? source?.element;
  const id =
    source?.data?.id ??
    (srcEl && 'id' in srcEl ? (srcEl as HTMLElement).id : '') ??
    '';
  const tagName: string =
    source?.data?.tagName ??
    (srcEl?.tagName ?? '').toString();
  const level: number[] | null =
    source?.data?.level ??
    (srcEl?.getAttribute?.('level') ?? null);
  const isNew: boolean =
    source?.data?.isNew === true ||
    srcEl?.querySelector?.('isNew')?.textContent === 'true';
  const requiresFirstIndex: boolean = source?.data?.requiresFirstIndex === true;
  const parentCanvasId: string | null =
    source?.data?.parentCanvasId ??
    srcEl?.querySelector?.('parentId')?.textContent ??
    null;

  return {
    id,
    tagName,
    level,
    isNew,
    requiresFirstIndex,
    element: srcEl,
    parentCanvasId,
  };
}

function inferCandidatesFromCaps(caps: string[]): AllowedEdges {
  // Default inference based on destination caps
  return caps.includes('VerticalCanvas')
    ? (['top', 'bottom'] as AllowedEdges)
    : (['left', 'right'] as AllowedEdges);
}

function buildPolicyContext(source: any, dest: DestContext): PolicyContext {
  const dragMeta = toDragMeta(source);
  return {
    dragMeta,
    destCaps: dest.destCaps,
    canvasEl: dest.canvasEl,
    canvasChildren: dest.canvasChildren,
    targetIndex: dest.targetIndex,
  };
}

// ---------- main wrapper ----------
export function dropTargetWithPolicy(opts: DropTargetWithPolicyOptions) {
  const {
    element,
    dropKind,
    buildDestContext,
    edgeData,
    getSourcePolicy,
    getDropPolicy,
    onDragEnter,
    onDrag,
    onDragLeave,
    onDropTargetChange,
    onDrop,
    getIsSticky,
    debugLog,
  } = opts;

  let cachedAllowedEdges: AllowedEdges = [];

  return dropTargetForElements({
    element,

    canDrop: ({ source /*, input*/ }: any) => {
      try {
        const dest = buildDestContext(element);
        const ctx = buildPolicyContext(source, dest);

        // Resolve policies (must be synchronous for pragmatic core)
        const sp = getSourcePolicy(ctx.dragMeta.tagName);
        const dp = getDropPolicy(dropKind);

        const spRes = sp ? !!sp.canDrop(ctx) : true;
        const dpRes = dp ? !!dp.canAccept(ctx) : true;

        // Determine destination axis candidates (tri-state)
        // undefined => infer; [] or null => explicitly no edges
        let candidates: AllowedEdges;
        if (dest.allowedEdgeCandidates === undefined) {
          candidates = inferCandidatesFromCaps(dest.destCaps.caps);
        } else if (dest.allowedEdgeCandidates == null || dest.allowedEdgeCandidates.length === 0) {
          candidates = [] as AllowedEdges;
        } else {
          candidates = dest.allowedEdgeCandidates;
        }

        // Cache allowed edges for getData (intersect source edges with destination candidates)
        try {
          if (sp && sp.allowedEdges) {
            const srcEdges = sp.allowedEdges(ctx) ?? [];
            if (candidates.length === 0) {
              // Destination explicitly declared no edges
              cachedAllowedEdges = [] as AllowedEdges;
            } else {
              const intersected = (srcEdges as AllowedEdges).filter((e) => candidates.includes(e));
              cachedAllowedEdges = (intersected.length > 0 ? intersected : candidates) as AllowedEdges;
            }
          } else {
            cachedAllowedEdges = candidates;
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[dropTargetWithPolicy] allowedEdges resolution failed:', err);
          cachedAllowedEdges = candidates;
        }


        const ok = spRes && dpRes;

        if (debugLog) {
          // eslint-disable-next-line no-console
          console.log('[DnD] canDrop decision', {
            srcTag: ctx.dragMeta.tagName,
            dropKind,
            destCaps: ctx.destCaps,
            sp: !!sp,
            dp: !!dp,
            spRes,
            dpRes,
            ok,
            edgeCandidates: candidates,
            edgesUsed: cachedAllowedEdges,
          });
        }
        return ok;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[dropTargetWithPolicy] canDrop error:', err);
        return false;
      }
    },
    getData: ({ input, source }: any): Record<string | symbol, unknown> => {
      try {
        // Honor explicit "no edge" mode. Only infer when dest didn't specify.
        let edges = cachedAllowedEdges;
        if (!edges || edges.length === 0) {
          const destNow = buildDestContext(element);
          if (destNow.allowedEdgeCandidates === undefined) {
            edges = inferCandidatesFromCaps(destNow.destCaps.caps);
          } else if (destNow.allowedEdgeCandidates == null || destNow.allowedEdgeCandidates.length === 0) {
            edges = [] as AllowedEdges; // explicit no-edge
          } else {
            edges = destNow.allowedEdgeCandidates as AllowedEdges;
          }
          cachedAllowedEdges = edges;
        }

        return edgeData({
          element,
          input,
          allowedEdges: edges,
          source,
        }) as Record<string | symbol, unknown>;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[dropTargetWithPolicy] getData error:', err);
        // Fallback: still return a minimal object (no enforced edges)
        return { allowedEdges: Array.isArray(cachedAllowedEdges) ? cachedAllowedEdges : [] } as Record<string | symbol, unknown>;
      }
    },



    onDragEnter,
    onDrag,
    onDragLeave,
    onDropTargetChange,
    onDrop,
    getIsSticky,
  });
}
