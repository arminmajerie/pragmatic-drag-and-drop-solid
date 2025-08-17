// packages/solid-drop-indicator/src/internal/line.tsx
import { splitProps, createMemo, type JSX } from 'solid-js';
import type { Edge } from '@arminmajerie/pragmatic-drag-and-drop-hitbox/types';
import type { CSSColor, CSSSize } from '../internal-types';
import { presetStrokeColors, presetStrokeWidth } from '../presets';

type Orientation = 'horizontal' | 'vertical';
const edgeToOrientationMap: Record<Edge, Orientation> = {
  top: 'horizontal',
  bottom: 'horizontal',
  left: 'vertical',
  right: 'vertical',
};

type LineType = 'terminal' | 'no-terminal' | 'terminal-no-bleed';

const lineStartFrom: { [K in LineType]: (p: { indent: string }) => string } = {
  terminal: ({ indent }) => `calc(var(--terminal-radius) + ${indent})`,
  'terminal-no-bleed': ({ indent }) => `calc(var(--terminal-diameter) + ${indent})`,
  'no-terminal': ({ indent }) => indent,
};

// ---- one-time CSS injection (for ::before etc.) ----
const STYLE_ID = 'solid-drop-indicator-line-styles';
const CSS_ONCE = `
.sdi-line {
  display: block;
  position: absolute;
  z-index: 1;
  pointer-events: none;
  background-color: var(--stroke-color);
}
.sdi-line::before {
  display: var(--terminal-display);
  content: "";
  position: absolute;
  box-sizing: border-box;
  width: var(--terminal-diameter);
  height: var(--terminal-diameter);
  border-width: var(--stroke-width);
  border-style: solid;
  border-color: var(--stroke-color);
  border-radius: 50%;
}

/* orientation */
.sdi-h { height: var(--stroke-width); inset-inline-start: var(--line-main-axis-start); inset-inline-end: 0; }
.sdi-h::before { inset-inline-start: var(--terminal-main-axis-start); }

.sdi-v { width: var(--stroke-width); top: var(--line-main-axis-start); bottom: 0; }
.sdi-v::before { top: var(--terminal-main-axis-start); }

/* edge positioning */
.sdi-edge-top { top: var(--main-axis-offset); }
.sdi-edge-top::before { top: var(--terminal-cross-axis-offset); }

.sdi-edge-right { right: var(--main-axis-offset); }
.sdi-edge-right::before { right: var(--terminal-cross-axis-offset); }

.sdi-edge-bottom { bottom: var(--main-axis-offset); }
.sdi-edge-bottom::before { bottom: var(--terminal-cross-axis-offset); }

.sdi-edge-left { left: var(--main-axis-offset); }
.sdi-edge-left::before { left: var(--terminal-cross-axis-offset); }
`;
function ensureStylesInjected() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS_ONCE;
  document.head.appendChild(el);
}

export type LineProps = {
  edge: Edge;
  indent?: CSSSize;
  gap?: CSSSize;
  strokeColor?: CSSColor;
  strokeWidth?: CSSSize;
  type?: LineType;
} & JSX.HTMLAttributes<HTMLDivElement>;

export function Line(allProps: LineProps) {
  ensureStylesInjected();

  const [props, rest] = splitProps(allProps, [
    'edge',
    'indent',
    'gap',
    'strokeColor',
    'strokeWidth',
    'type',
    'class',
    'classList',
    'style',
  ]);

  const orientation = createMemo<Orientation>(() => edgeToOrientationMap[props.edge]);

  const style = createMemo<JSX.CSSProperties>(() => {
    const strokeColor = props.strokeColor ?? presetStrokeColors.default;
    const strokeWidth = props.strokeWidth ?? presetStrokeWidth;
    const type = props.type ?? 'terminal';
    const indent = (props.indent ?? '0px') as string;
    const gap = (props.gap ?? '0px') as string;

    // Variables first; allow external style to override if needed
    return {
      '--stroke-color': strokeColor,
      '--stroke-width': strokeWidth,
      '--main-axis-offset': `calc(-0.5 * (${gap} + var(--stroke-width)))`,
      '--line-main-axis-start': lineStartFrom[type]({ indent }),
      '--terminal-display': type === 'no-terminal' ? 'none' : 'block',
      '--terminal-diameter': 'calc(var(--stroke-width) * 4)',
      '--terminal-radius': 'calc(var(--terminal-diameter) / 2)',
      '--terminal-main-axis-start': 'calc(-1 * var(--terminal-diameter))',
      '--terminal-cross-axis-offset': 'calc(calc(var(--stroke-width) - var(--terminal-diameter)) / 2)',
      ...(props.style as JSX.CSSProperties | undefined),
    } as JSX.CSSProperties;
  });

  const classes =
    `sdi-line ${orientation() === 'horizontal' ? 'sdi-h' : 'sdi-v'} sdi-edge-${props.edge}`;

  return <div class={`${classes} ${props.class ?? ''}`} style={style()} {...rest} />;
}

export default Line;
