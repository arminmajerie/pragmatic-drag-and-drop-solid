import type { DragHandleButtonProps, DragHandleIconProps } from './types';
import { DragHandleButtonBase } from './drag-handle-button-base';

/** Minimal vertical drag-handle icon (uses currentColor). */
function DragHandleVerticalIcon(props: DragHandleIconProps) {
  const size =
    props.size === 'small' ? 16 :
      props.size === 'medium' ? 20 :
        typeof props.size === 'number' ? props.size : 20;

  const dotR = 1.25;
  const colX = size / 2;
  const spacing = 4; // px between dots
  const startY = size / 2 - spacing; // centers 3 dots

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
 * Solid version of the drag handle button.
 * Matches the original API and relies on currentColor. :contentReference[oaicite:3]{index=3}
 */
export function DragHandleButton({ label, ...buttonProps }: DragHandleButtonProps) {
  return (
    <DragHandleButtonBase {...buttonProps}>
      <DragHandleVerticalIcon label={label} size="medium" />
    </DragHandleButtonBase>
  );
}
