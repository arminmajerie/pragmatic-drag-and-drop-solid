import type { CleanupFn } from '@arminmajerie/pragmatic-drag-and-drop/types';

export const dataAttribute = 'data-auto-scrollable';
export const selector = `[${dataAttribute}="true"]`;

export function addScrollableAttribute(element: Element): CleanupFn {
	element.setAttribute(dataAttribute, 'true');
	return () => element.removeAttribute(dataAttribute);
}
