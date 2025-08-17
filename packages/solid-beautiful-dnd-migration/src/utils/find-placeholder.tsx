import type { ContextId } from '@arminmajerie/pragmatic-drag-and-drop/types';

import { attributes } from './attributes';
import { findElement } from './find-element';

export function findPlaceholder(contextId: ContextId) {
	return findElement({
		attribute: attributes.placeholder.contextId,
		value: contextId,
	});
}
