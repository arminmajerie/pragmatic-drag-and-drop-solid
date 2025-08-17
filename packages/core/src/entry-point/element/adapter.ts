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
  monitorForElements as _monitorForElements,
} from '../../adapter/element-adapter';

export const draggable = _draggable;
export const dropTargetForElements = _dropTargetForElements;
export const monitorForElements = _monitorForElements;

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
} from '../../adapter/element-adapter';
