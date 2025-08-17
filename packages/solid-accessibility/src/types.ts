import type { JSX } from 'solid-js';

export type DragHandleButtonAppearance = 'default' | 'subtle' | 'selected';

export type DragHandleButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  /**
   * The base styling to apply to the button
   */
  appearance?: DragHandleButtonAppearance;
  /**
   * Text used to describe what the icon is in context
   */
  label: string;
  /**
   * Change the style to indicate the button is selected
   */
  isSelected?: boolean;
  /**
   * A test id that appears as data-testid on the rendered element
   */
  testId?: string;
};

export type DragHandleIconProps = {
  label: string;
  size?: 'small' | 'medium' | number;
};
