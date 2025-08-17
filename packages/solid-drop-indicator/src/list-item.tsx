// packages/solid-drop-indicator/src/list-item.tsx
import type { ComponentProps, JSX } from 'solid-js';

import type { Instruction } from '@arminmajerie/pragmatic-drag-and-drop-hitbox/list-item';
// re-export for consumer convenience
export {
  type Instruction,
  type Operation,
} from '@arminmajerie/pragmatic-drag-and-drop-hitbox/list-item';

import { DropIndicator as Border } from './border';
import { DropIndicator as Line } from './box';

const axisLookup = {
  vertical: {
    start: 'top',
    end: 'bottom',
  },
  horizontal: {
    start: 'left',
    end: 'right',
  },
} as const;

type LineProps = ComponentProps<typeof Line>;

export function DropIndicator(props: {
  instruction: Instruction;
  lineGap?: LineProps['gap'];
  lineType?: LineProps['type'];
}): JSX.Element | null {
  const { instruction, lineGap, lineType } = props;

  const appearance = instruction.blocked ? 'warning' : 'default';
  const axis = axisLookup[instruction.axis];

  if (instruction.operation === 'combine') {
    return <Border appearance={appearance} />;
  }

  if (instruction.operation === 'reorder-before') {
    return <Line edge={axis.start} appearance={appearance} gap={lineGap} type={lineType} />;
  }
  if (instruction.operation === 'reorder-after') {
    return <Line edge={axis.end} appearance={appearance} gap={lineGap} type={lineType} />;
  }

  return null;
}
