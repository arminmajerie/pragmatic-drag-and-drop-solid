// @flow


import {
  ContextId, DroppableId, DraggableRubric, DraggableId, DroppableMode, TypeId,
  Direction, MovementMode, Responders, Sensor,
} from './beautiful-dnd-types';
import {  DropAnimation} from './draggable-types';
import { Position } from '../../internal-types';
import { DraggableChildrenFn } from '../types';

export type StateSnapshot = {
  isDragging: boolean,
  isDropAnimating: boolean,
  isClone: boolean,
  dropAnimation: DropAnimation | null | undefined,
  draggingOver: DroppableId | null | undefined,
  combineWith: DraggableId | null | undefined,
  combineTargetFor: DraggableId | null | undefined,
  mode: MovementMode | null | undefined,
};

export type DragDropContextProps = Responders&{

  // We do not technically need any children for this component
  children: Node | null,
  // Read out by screen readers when focusing on a drag handle
  dragHandleUsageInstructions?: string,
  // Used for strict content security policies
  // See our [content security policy guide](/docs/guides/content-security-policy.md)
  nonce?: string,
  // See our [sensor api](/docs/sensors/sensor-api.md)
  sensors?: Sensor[],
  enableDefaultSensors?: boolean | null | undefined,
  };

export type DroppableProps = {
  children: Node | null,
  droppableId:DroppableId,
  mode: DroppableMode,
  type: TypeId,
  isDropDisabled: boolean,
  isCombineEnabled: boolean,
  direction: Direction,
  renderClone: DraggableChildrenFn | null | undefined,
  ignoreContainerClipping: boolean,
  getContainerForClone: () => HTMLElement,
};

export type Provided = {
  innerRef: (el: HTMLElement | null | undefined) => void;
  placeholder: Node  | null | undefined,
  droppableProps: DroppableProps,
  };

export type UseClone = {
  dragging: DraggableRubric,
  render: DraggableChildrenFn,
  };




export type DefaultProps = {
  mode: DroppableMode,
  type: TypeId,
  isDropDisabled: boolean,
  isCombineEnabled: boolean,
  direction: Direction,
  renderClone: DraggableChildrenFn | null | undefined,
  ignoreContainerClipping: boolean,
  getContainerForClone: () => HTMLElement,
};

export type UpdateViewportMaxScrollArgs = {
  maxScroll: Position,
  };

type UpdateViewportMaxScrollAction = {
  type: 'UPDATE_VIEWPORT_MAX_SCROLL',
  payload: UpdateViewportMaxScrollArgs,
};

export const updateViewportMaxScroll = (
  args: UpdateViewportMaxScrollArgs,
): UpdateViewportMaxScrollAction => ({
  type: 'UPDATE_VIEWPORT_MAX_SCROLL',
  payload: args,
});

