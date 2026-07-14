import { onCleanup } from 'solid-js';

/*
 * A trailing debounce as a Solid primitive. The returned function schedules `fn` to run `ms`
 * after the LAST call — rapid calls (e.g. one per keystroke) collapse into a single trailing
 * invocation with the most recent arguments. `flush` runs any pending call immediately (for
 * save-on-blur / save-before-navigate); `cancel` drops it. The timer is cleared on cleanup so a
 * pending save never fires against a disposed owner.
 *
 * Hand-rolled rather than a dependency (own-the-simple-buy-hard): a trailing debounce is ~15
 * lines and we need exactly this shape — the buffered field saves in the stocktake side panel
 * call it per keystroke and rely on flush() when the field loses focus.
 */
export type Debounced<A extends unknown[]> = ((...args: A) => void) & {
  /** Run the pending call now (if any), with its buffered arguments. */
  flush: () => void;
  /** Drop the pending call without running it. */
  cancel: () => void;
};

export const createDebounced = <A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): Debounced<A> => {
  let handle: ReturnType<typeof setTimeout> | undefined;
  // The latest buffered arguments, kept so flush() can replay the most recent call.
  let pending: A | undefined;

  const clear = () => {
    if (handle !== undefined) {
      clearTimeout(handle);
      handle = undefined;
    }
  };

  const run = () => {
    clear();
    if (pending !== undefined) {
      const args = pending;
      pending = undefined;
      fn(...args);
    }
  };

  const debounced = ((...args: A) => {
    pending = args;
    clear();
    handle = setTimeout(run, ms);
  }) as Debounced<A>;

  debounced.flush = run;
  debounced.cancel = () => {
    clear();
    pending = undefined;
  };

  onCleanup(() => debounced.cancel());
  return debounced;
};
