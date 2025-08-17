import type { DragHandleButtonProps } from './types';
import { DragHandleButtonBase } from './drag-handle-button-base';
import { JSX } from 'solid-js';

// Re-use the icon from the main file
import { /* type */ DragHandleIconProps } from './types';

function SmallIcon(props: DragHandleIconProps) {
  // reuse the same SVG, but with small size
  const size = 16;
  const dotR = 1.1;
  const colX = size / 2;
  const spacing = 3.2;
  const startY = size / 2 - spacing;

  return (
    <svg
      role="img"
      aria-label={props.label}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'inline-block', 'vertical-align': 'middle' }}
    >
      <g fill="currentColor">
        <circle cx={colX} cy={startY - spacing} r={dotR} />
        <circle cx={colX} cy={startY} r={dotR} />
        <circle cx={colX} cy={startY + spacing} r={dotR} />
        <circle cx={colX} cy={startY + 2 * spacing} r={dotR} />
        <circle cx={colX} cy={startY + 3 * spacing} r={dotR} />
        <circle cx={colX} cy={startY + 4 * spacing} r={dotR} />
      </g>
    </svg>
  );
}

/**
 * Small variant, preserving the “Box/xcss + feature flag” intent by just
 * applying compact inline layout. :contentReference[oaicite:4]{index=4}
 */
export function DragHandleButtonSmall({ label, ...buttonProps }: DragHandleButtonProps) {
  return (
    <DragHandleButtonBase {...buttonProps}>
      <span style={{ display: 'inline-flex', 'margin-inline': '-2px' }}>
        <SmallIcon label={label} />
      </span>
    </DragHandleButtonBase>
  );
}
