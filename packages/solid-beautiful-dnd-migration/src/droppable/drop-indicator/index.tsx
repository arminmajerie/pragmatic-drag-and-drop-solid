import { createSignal, createMemo, onMount, onCleanup, createRenderEffect, type JSX } from 'solid-js';
import type {
  Direction,
  DraggableLocation,
  DroppableMode,
} from '@arminmajerie/pragmatic-drag-and-drop/types';

import { isSameLocation } from '../../drag-drop-context/draggable-location';
import { getActualDestination } from '../../drag-drop-context/get-destination';
import { useDragDropContext } from '../../drag-drop-context/internal-context';
import { useMonitorForLifecycle } from '../../drag-drop-context/lifecycle-context';
import { rbdInvariant } from '../../drag-drop-context/rbd-invariant';
import { customAttributes } from '../../utils/attributes';

import { directionMapping, lineOffset, lineThickness } from './constants';
import { getIndicatorSizeAndOffset } from './get-dimensions';
import type { IndicatorSizeAndOffset } from './types';

type DropIndicatorProps = {
  direction: Direction;
  mode: DroppableMode;
};

const scrollMarginTop = lineThickness + 2 * lineOffset;
const dropIndicatorData = { [customAttributes.dropIndicator]: '' } as const;

function getDynamicStyles(args: {
  direction: Direction;
  dimensions: IndicatorSizeAndOffset | null;
  indicatorOffset: number;
}): JSX.CSSProperties {
  const { direction, dimensions, indicatorOffset } = args;

  if (dimensions === null) {
    // hide visually until we have dimensions
    return { opacity: 0 };
  }

  const { mainAxis, crossAxis } = directionMapping[direction];

  return {
    transform: `${mainAxis.style.transform}(${dimensions.mainAxis.offset - indicatorOffset}px)`,
    [crossAxis.style.length]: dimensions.crossAxis.length as unknown as string, // Solid accepts number too
    [crossAxis.style.offset]: dimensions.crossAxis.offset as unknown as string,
  } as unknown as JSX.CSSProperties;
}

export function DropIndicator(props: DropIndicatorProps) {
  const { contextId, getDragState } = useDragDropContext();
  const monitorForLifecycle = useMonitorForLifecycle();

  let ref: HTMLDivElement | undefined;

  const [dimensions, setDimensions] = createSignal<IndicatorSizeAndOffset | null>(null);
  const [isHidden, setIsHidden] = createSignal(false);

  const updateIndicator = ({
                             targetLocation,
                             source,
                             destination,
                           }: {
    targetLocation: DraggableLocation | null;
    source: DraggableLocation;
    destination: DraggableLocation | null;
  }) => {
    if (!targetLocation) {
      setDimensions(null);
      return;
    }

    const isInHomeLocation = isSameLocation(source, destination);
    setIsHidden(isInHomeLocation);

    setDimensions(
      getIndicatorSizeAndOffset({
        targetLocation,
        isInHomeLocation,
        direction: props.direction,
        mode: props.mode,
        contextId,
      }),
    );
  };

  // Immediate placement on mount (for cross-axis when indicator first appears)
  onMount(() => {
    const dragState = getDragState();
    if (dragState.isDragging) {
      const { targetLocation, sourceLocation } = dragState;
      const destination = getActualDestination({ start: sourceLocation, target: targetLocation });
      updateIndicator({ targetLocation, destination, source: sourceLocation });
    }

    const stop = monitorForLifecycle({
      onPrePendingDragUpdate: ({ update, targetLocation }) => {
        const { destination = null, source } = update;
        updateIndicator({ targetLocation, source, destination });
      },
    });

    onCleanup(stop);
  });

  // Scroll into view during keyboard (SNAP) drags
  createRenderEffect(() => {
    const d = dimensions();
    if (!d) return;

    const dragState = getDragState();
    if (!dragState.isDragging || dragState.mode !== 'SNAP') return;

    const el = ref;
    rbdInvariant(el instanceof HTMLElement, 'DropIndicator ref should be an element');
    el.scrollIntoView({ block: 'nearest' });
  });

  const indicatorOffset = createMemo(() => {
    const mainAxis = directionMapping[props.direction].mainAxis;
    // reading live from the element; recalculated when dimensions change
    return ref ? (ref as any)[mainAxis.offset] ?? 0 : 0;
  });

  const dynamicStyles = createMemo(() =>
    getDynamicStyles({
      direction: props.direction,
      dimensions: dimensions(),
      indicatorOffset: indicatorOffset(),
    }),
  );

  const isVirtual = () => props.mode === 'virtual';

  const px = (n: number | string) => `${n}px`;

// base style (camelCase + px)
  const baseStyle: JSX.CSSProperties = {
    background: 'var(--pddd-color-border-brand, #0C66E4)',
    'scroll-margin-top': px(scrollMarginTop),
    'scroll-margin-bottom': px(scrollMarginTop + lineOffset),
    opacity: isHidden() ? 0 : undefined,
    position: isVirtual() ? 'absolute' : undefined,
    top: isVirtual() ? '0' : undefined,
    left: isVirtual() ? '0' : undefined,
  };

// direction-specific (camelCase + px)
  const directionStyle: JSX.CSSProperties =
    props.direction === 'horizontal'
      ? {
        width: px(lineThickness),
        height: '100%',
        'margin-left': px(-lineThickness),
      }
      : {
        width: '100%',
        height: px(lineThickness),
        'margin-top': px(-lineThickness),
      };

// dynamic styles — ensure lengths are px strings
  function getDynamicStyles({
                              direction,
                              dimensions,
                              indicatorOffset,
                            }: {
    direction: Direction;
    dimensions: IndicatorSizeAndOffset | null;
    indicatorOffset: number;
  }): JSX.CSSProperties {
    if (dimensions === null) return { opacity: 0 };

    const { mainAxis, crossAxis } = directionMapping[direction];
    return {
      transform: `${mainAxis.style.transform}(${px(dimensions.mainAxis.offset - indicatorOffset)})`,
      [crossAxis.style.length]: px(dimensions.crossAxis.length) as unknown as string,
      [crossAxis.style.offset]: px(dimensions.crossAxis.offset) as unknown as string,
    } as unknown as JSX.CSSProperties;
  }

  return (
    <div
      ref={(el) => (ref = el)}
      style={{ ...baseStyle, ...directionStyle, ...dynamicStyles() }}
      {...dropIndicatorData}
    />
  );
}

export default DropIndicator;

