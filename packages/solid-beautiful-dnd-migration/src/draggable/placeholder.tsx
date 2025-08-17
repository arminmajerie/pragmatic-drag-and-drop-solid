// packages/solid-beautiful-dnd-migration/src/draggable/placeholder.tsx
import { splitProps, createMemo, type JSX } from 'solid-js';
import { useDragDropContext } from '../drag-drop-context/internal-context';
import { useDraggableDimensions } from '../hooks/use-captured-dimensions';
import { attributes } from '../utils/attributes';

// Small helper: supports either a value or an accessor
type Accessor<T> = () => T;
type MaybeAccessor<T> = T | Accessor<T>;

function read<T>(v: MaybeAccessor<T>): T {
  return typeof v === 'function' ? (v as Accessor<T>)() : v;
}

type PlaceholderProps = {
  style?: JSX.CSSProperties;
  ref?: (el: HTMLDivElement) => void;
} & JSX.HTMLAttributes<HTMLDivElement>;

export function Placeholder(allProps: PlaceholderProps) {
  const [props, rest] = splitProps(allProps, ['style', 'ref']);

  // Normalize to MaybeAccessor so we can read() it safely
  type RawDims = ReturnType<typeof useDraggableDimensions>;
  type Dims = RawDims extends Accessor<infer U> ? U : RawDims;
  const dimensions = useDraggableDimensions() as MaybeAccessor<Dims | null | undefined>;

  const { contextId } = useDragDropContext();
  const dataAttributes: Record<string, string> = {
    [attributes.placeholder.contextId]: contextId,
  };

  const style = createMemo<JSX.CSSProperties | undefined>(() => {
    const d = read(dimensions); // works whether it's an accessor or a plain value
    if (!d) return props.style;

    // If your hook has explicit types, replace `any` below with that type
    const { margin, rect } = d as any;

    return {
      boxSizing: 'border-box',
      width: rect.width,
      height: rect.height,
      // margin shorthand can be string or number(s)
      margin: margin as unknown as JSX.CSSProperties['margin'],
      ...(props.style ?? {}),
    };
  });

  return <div ref={props.ref} style={style()} {...rest} {...dataAttributes} />;
}
