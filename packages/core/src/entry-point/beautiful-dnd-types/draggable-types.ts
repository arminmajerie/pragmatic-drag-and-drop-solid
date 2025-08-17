// @flow
import {JSX} from 'solid-js'

import {
  DraggableRubric, State, Rect, Spacing, Position,
  MovementMode, DraggableId, DroppableId, Id, TypeId, ContextId, ElementId,
  BoxModel, DraggableDimension
} from './beautiful-dnd-types';



export const dropAnimationFinished = (): DropAnimationFinishedAction => ({
  type: 'DROP_ANIMATION_FINISHED',
  payload: null,
});

export type DropAnimationFinishedAction = {
  type: 'DROP_ANIMATION_FINISHED',
  payload: null,
  };

export type DraggingStyle = {
  position: 'fixed',
  top: number,
  left: number,
  boxSizing: 'border-box',
  width: number,
  height: number,
  transition: string,
  transform: string | null | undefined,
  zIndex: number,

  // for combining
  opacity: number | null | undefined,

  // Avoiding any processing of mouse events.
  // This is already applied by the shared styles during a drag.
  // During a drop it prevents a draggable from being dragged.
  // canStartDrag() will prevent drags in some cases for non primary draggable.
  // It is also a minor performance optimisation
  pointerEvents: 'none',
  };

export type NotDraggingStyle = {
  transform: string | null | undefined,
  // null: use the global animation style
  // none: skip animation (used in certain displacement situations)
  transition: null | 'none',
  };

export type DraggableStyle = DraggingStyle | NotDraggingStyle;

export type ZIndexOptions = {
  dragging: number,
  dropAnimating: number,
  };

// Props that can be spread onto the element directly
export type DraggableProps = PublicOwnProps&{
  // inline style
  style: DraggableStyle | null | undefined,
  // used for shared global styles
  'data-rbd-draggable-context-id': ContextId,
  // used for lookups
  'data-rbd-draggable-id': DraggableId,
  // used to know when a transition ends
  onTransitionEnd: (event: TransitionEvent | null | undefined) => void,
  };

export type DragHandleProps = {
  // what draggable the handle belongs to
  'data-rbd-drag-handle-draggable-id': DraggableId,

  // What DragDropContext the drag handle is in
  'data-rbd-drag-handle-context-id': ContextId,

  // We need a drag handle to be a widget in order to correctly set accessibility properties
  // Note: JAWS and VoiceOver don't need the element to be a 'widget' to read the accessibility properties, but NVDA does
  // Using `role="button"` but leaving the public API as a string to allow for changing without a major
  role: string,

  // Overriding default role to have a more descriptive text ("Draggable item")
  // Sadly we cannot use this right now due an issue with lighthouse
  // https://github.com/atlassian/react-beautiful-dnd/issues/1742
  // 'aria-roledescription': string,

  // Using the description property of the drag handle to provide usage instructions
  'aria-describedby': ElementId,

  // Allow tabbing to this element
  // Adding a tab index marks the element as interactive content: https://www.w3.org/TR/html51/dom.html#kinds-of-content-interactive-content
  tabIndex: number,

  // Opting out of html5 drag and drop
  draggable: boolean,
  onDragStart: (event: DragEvent) => void,
  };

export type Provided = {
  draggableProps: DraggableProps,
  // will be null if the draggable is disabled
  dragHandleProps: DragHandleProps | null | undefined,
  // The following props will be removed once we move to react 16
  innerRef: (el: HTMLElement | null | undefined) => void;
  };

// to easily enable patching of styles
export type DropAnimation = {
  duration: number,
  curve: string,
  moveTo: Position,
  opacity: number | null | undefined,
  scale: number | null | undefined,
  };

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

export type DispatchProps = {
  dropAnimationFinished: typeof dropAnimationFinished,
  };

export type DraggingMapProps = {
  type: 'DRAGGING',
  offset: Position,
  mode: MovementMode,
  dropping: DropAnimation | null | undefined,
  draggingOver: DraggableId | null | undefined,
  combineWith: DraggableId | null | undefined,
  dimension: DraggableDimension,
  forceShouldAnimate: boolean | null | undefined,
  snapshot: StateSnapshot,
  };

export type SecondaryMapProps = {
  type: 'SECONDARY',
  offset: Position,
  combineTargetFor: DraggableId | null | undefined,
  shouldAnimateDisplacement: boolean,
  snapshot: StateSnapshot,
  };

export type MappedProps = DraggingMapProps | SecondaryMapProps;

export type MapProps = {
  // when an item is being displaced by a dragging item,
  // we need to know if that movement should be animated
  mapped: MappedProps,
  // dragging: DraggingMapProps | null | undefined,
  // secondary: SecondaryMapProps | null | undefined,
};



export type ChildrenFn = (
  provided: Provided,
  snapshot: StateSnapshot,
  rubric: DraggableRubric,
) => JSX.Element | null;

export type PublicOwnProps = {
  draggableId: DraggableId,
  index: number,
  children: ChildrenFn,

  // optional own props
  isDragDisabled?: boolean,
  disableInteractiveElementBlocking?: boolean,
  shouldRespectForcePress?: boolean,
  };

export type PrivateOwnProps = PublicOwnProps & {
  isClone: boolean,
  // no longer optional
  isEnabled: boolean,
  canDragInteractiveElements: boolean,
  shouldRespectForcePress: boolean,
  };

export type OwnProps = PrivateOwnProps ;
export type Props = MapProps & DispatchProps & OwnProps;

export type Selector = (state: State, ownProps: OwnProps) => MapProps;
