import { monitorForTextSelection } from '@arminmajerie/pragmatic-drag-and-drop/text-selection/adapter';

import { makeApi } from '../over-element/make-api';

const api = makeApi({ monitor: monitorForTextSelection });

export const autoScrollForTextSelection = api.autoScroll;
export const autoScrollWindowForTextSelection = api.autoScrollWindow;
