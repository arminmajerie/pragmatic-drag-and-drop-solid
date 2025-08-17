import type { Appearance, CSSSize } from './internal-types';
import { Border as InternalBorder } from './internal/border';
import { presetStrokeColors } from './presets';

export type BorderDropIndicatorProps = {
  appearance?: Appearance;
  indent?: CSSSize;
};

export function DropIndicator(props: BorderDropIndicatorProps) {
  const color =
    presetStrokeColors[props.appearance ?? 'default'] ?? presetStrokeColors.default;
  return <InternalBorder strokeColor={color} indent={props.indent} />;
}
