// packages/solid-accessibility/src/drag-handle-button-base.tsx
import { splitProps, mergeProps, type JSX } from 'solid-js';
import type { DragHandleButtonProps, DragHandleButtonAppearance } from './types';

const radius = 4; // px border radius fallback

// Returns inline styles using CSS custom properties with sensible fallbacks.
// You can theme via CSS vars like: --pddd-color-background-neutral, etc.
function stylesForAppearance(
  appearance: DragHandleButtonAppearance,
  isSelected: boolean
): JSX.CSSProperties {
  if (isSelected) {
    return {
      'background-color': 'var(--pddd-color-background-selected, #0C66E4)',
      color: 'var(--pddd-color-text-selected, white)',
    };
  }
  switch (appearance) {
    case 'subtle':
      return {
        'background-color': 'var(--pddd-color-background-neutral-subtle, transparent)',
      };
    case 'default':
    default:
      return {
        'background-color': 'var(--pddd-color-background-neutral, #F1F2F4)',
      };
  }
}

/**
 * Native <button> so mousedown is not canceled (important for dragging).
 */
export function DragHandleButtonBase(
  props: Omit<DragHandleButtonProps, 'label'>
) {
  // Defaults + user props
  const merged = mergeProps({ appearance: 'default' as DragHandleButtonAppearance, type: 'button' as const }, props);

  // Pull out the bits we want to control/merge; forward the rest
  const [local, rest] = splitProps(merged, [
    'children',
    'isSelected',
    'testId',
    'appearance',
    'type',
    'ref',
    'class',
    'style',
  ]);

  const baseStyle: JSX.CSSProperties = {
    color: 'var(--pddd-color-text, #172B4D)',
    border: 'none',
    'border-radius': `${radius}px`,
    padding: 0,
    width: 'max-content',
    cursor: 'grab',
    display: 'flex',
    // appearance-dependent
    ...stylesForAppearance(local.appearance as DragHandleButtonAppearance, !!local.isSelected),
  };

  return (
    <button
      class={['pddd-DragHandleButton', local.class].filter(Boolean).join(' ')}
      // Support function refs (recommended in Solid). Variable refs from props
      // are not assignable here, so we invoke function refs if provided.
      ref={(el) => {
        const r = local.ref as unknown;
        if (typeof r === 'function') (r as (el: HTMLButtonElement) => void)(el);
      }}
      {...{ 'data-testid': local.testId }}
      type={local.type}
      style={{ ...baseStyle, ...(local.style as JSX.CSSProperties) }}
      aria-pressed={local.isSelected ?? undefined}
      {...rest}
    >
      {local.children}
    </button>
  );
}
