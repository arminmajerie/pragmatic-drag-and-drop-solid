declare module 'raf-schd' {
  /**
   * Wraps a function so calls are batched to the next requestAnimationFrame.
   * Latest args win. Returned fn has cancel/flush helpers.
   */
  export default function rafSchd<T extends (...args: any[]) => void>(
    fn: T
  ): ((...args: Parameters<T>) => void) & {
    /**
     * Cancel a scheduled call (if any).
     */
    cancel: () => void;
    /**
     * Immediately invoke with the most recent args (if any) and clear schedule.
     */
    flush: () => void;
  };
}
