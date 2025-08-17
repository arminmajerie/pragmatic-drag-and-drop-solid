// packages/solid-drop-indicator/src/internal/border.tsx
import { splitProps, createMemo, type JSX } from 'solid-js';
import type { CSSColor, CSSSize } from '../internal-types';
import { presetStrokeColors, presetStrokeWidth } from '../presets';

type BorderProps = {
  strokeColor?: CSSColor;
  borderRadius?: CSSSize;
  strokeWidth?: CSSSize;
  indent?: string;
} & JSX.HTMLAttributes<HTMLDivElement>;

export function Border(allProps: BorderProps) {
  const [props, rest] = splitProps(allProps, [
    'strokeColor',
    'strokeWidth',
    'borderRadius',
    'indent',
    'style',
  ]);

  const baseStyle: JSX.CSSProperties = {
    position: 'absolute',
    'inset-block-start': '0',
    'inset-block-end': '0',
    'inset-inline-end': '0',
    'inset-inline-start': 'var(--indent)',

    // avoid extra dragenter events
    'pointer-events': 'none',

    border: 'var(--stroke-width) solid var(--stroke-color)',
    'border-radius': 'var(--border-radius)',
  };

  const style = createMemo<JSX.CSSProperties>(() => {
    const strokeColor = props.strokeColor ?? presetStrokeColors.default;
    const strokeWidth = props.strokeWidth ?? presetStrokeWidth;
    const borderRadius = props.borderRadius ?? '3px'; // TODO: switch to token 4px later
    const indent = props.indent ?? '0px';

    return {
      ...baseStyle,
      '--stroke-color': strokeColor,
      '--stroke-width': strokeWidth,
      '--border-radius': borderRadius,
      '--indent': indent,
      ...(props.style as JSX.CSSProperties | undefined),
    };
  });

  return <div style={style()} {...rest} />;
}

export default Border;
