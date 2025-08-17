// packages/solid-drop-indicator/src/group.tsx
import { splitProps, type JSX } from 'solid-js';
import { token } from '@atlaskit/tokens';

type GroupDropIndicatorProps = {
  children: JSX.Element;
  isActive: boolean;
  testId?: string;
  ref?: (el: HTMLDivElement) => void;
} & JSX.HTMLAttributes<HTMLDivElement>;

export function GroupDropIndicator(allProps: GroupDropIndicatorProps) {
  const [props, rest] = splitProps(allProps, ['children', 'isActive', 'testId', 'ref', 'style']);

  const activeStyle: JSX.CSSProperties = {
    'background-color': token('color.background.information'),
    'border-radius': token('border.radius.050'),
    'outline-offset': token('space.075'),
    'outline-width': token('border.width.outline'),
    'outline-style': 'solid',
    'outline-color': token('color.border.selected'),
  };

  // apply active styles when active; allow caller `style` to also participate
  const style = props.isActive
    ? { ...(props.style as JSX.CSSProperties | undefined), ...activeStyle }
    : (props.style as JSX.CSSProperties | undefined);

  return (
    <div ref={props.ref} data-testid={props.testId} style={style} {...rest}>
      {props.children}
    </div>
  );
}

