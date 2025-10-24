// BEFORE
// export {
//  draggable,
//  dropTargetForElements,
//  monitorForElements,
// } from '../../adapter/element-adapter';

// AFTER
import {
  draggable as _draggable,
  dropTargetForElements as _dropTargetForElements,
  dropTargetWithPolicy as _dropTargetWithPolicy,
  monitorForElements as _monitorForElements,
  draggableWithPolicy as _draggableWithPolicy,
} from '../../adapter/element-adapter';

export const draggable = _draggable;
export const dropTargetForElements = _dropTargetForElements;
export const monitorForElements = _monitorForElements;
export const dropTargetWithPolicy =_dropTargetWithPolicy;
export const draggableWithPolicy = _draggableWithPolicy;

// Payload for the draggable being dragged
export type { ElementDragPayload } from '../../internal-types';

export type {
  ElementEventBasePayload,
  ElementEventPayloadMap,
  ElementDropTargetEventBasePayload,
  ElementDropTargetEventPayloadMap,
  ElementGetFeedbackArgs,
  ElementDropTargetGetFeedbackArgs,
  ElementMonitorGetFeedbackArgs,
  Edge,
  DragMeta,
  CanvasCaps,
  CanvasChildren,
  PolicyContext,
  CanStartArgs,
  DraggableWithPolicyOptions,
  DestContext,
  DropTargetWithPolicyOptions,
  DropPolicy,
  SourcePolicy,
  PerformArgs,
  XMLConfigurationAPI,
  ProposedPlacement,
  PerformResult,
  DestSnapshot
} from '../../adapter/element-adapter';
