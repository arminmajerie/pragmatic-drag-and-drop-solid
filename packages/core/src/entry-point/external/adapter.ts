// packages/core/src/external/adapter.ts
export * from '../external/adapter';
export * from '../external/file';
export * from '../external/html';
export * from '../external/text';
export * from '../external/url';
export * from '../external/some';

export { monitorForExternal, dropTargetForExternal } from '../../adapter/external-adapter';

// The data that is being dragged
export type { NativeMediaType, ExternalDragPayload } from '../../internal-types';

export type {
	// Base events
	ExternalEventBasePayload,
	ExternalEventPayloadMap,
	// Drop target events
	ExternalDropTargetEventBasePayload,
	ExternalDropTargetEventPayloadMap,
	// Feedback types
	ExternalMonitorGetFeedbackArgs,
	ExternalDropTargetGetFeedbackArgs,
} from '../../adapter/external-adapter';
