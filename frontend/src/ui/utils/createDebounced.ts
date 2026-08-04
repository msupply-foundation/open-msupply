import { getOwner, onCleanup } from 'solid-js';

/*
 * A trailing debounce as a Solid primitive. The returned function schedules
 * `fn` to run `ms` after the LAST call — rapid calls (e.g. one per keystroke)
 * collapse into a single trailing invocation with the most recent arguments.
 * `flush` runs any pending call immediately (for save-on-blur /
 * save-before-navigate); `cancel` drops it. Once the owner is cleaned up
 * nothing runs on its behalf again — neither a timer nor a later `flush`.
 *
 * Hand-rolled rather than a dependency (own-the-simple-buy-hard): a trailing
 * debounce is ~15 lines and we need exactly this shape — the buffered field
 * saves in the stocktake side panel call it per keystroke and rely on flush()
 * when the field loses focus.
 *
 * Ownership: the auto-cancel-on-cleanup only works UNDER a reactive owner (a
 * component / createRoot). Created ownerless (a module-level helper, a bare
 * call in a test), there's no owner to hang the cleanup on — so the caller
 * MUST call `cancel()` itself to avoid leaking a pending timer. We skip
 * registering onCleanup in that case (it would be a no-op that also logs a dev
 * warning).
 *
 * `flush()` runs `fn` SYNCHRONOUSLY in the caller's context (e.g. inside a
 * blur handler), and does not catch: if `fn` throws, it propagates to the
 * caller. Our `fn` is a never-throwing save (kdd/state-management), so this
 * doesn't arise; a caller passing a throwing `fn` owns handling it.
 */
export type Debounced<A extends unknown[]> = ((...args: A) => void) & {
  /** Run the pending call now (if any), with its buffered arguments. */
  flush: () => void;
  /** Drop the pending call without running it. */
  cancel: () => void;
};

export const createDebounced = <A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number
): Debounced<A> => {
  let handle: ReturnType<typeof setTimeout> | undefined;
  // The latest buffered arguments, kept so flush() can replay the most recent
  // call.
  let pending: A | undefined;
  /*
   * Set once the owner is gone, so nothing runs on its behalf afterwards —
   * including a flush().
   *
   * Cancelling on cleanup only empties the buffer, and a caller whose flush
   * REFILLS it first (the filter bar's chip: draft in, then flush) would run
   * anyway. That caller's flush comes from the box losing focus, which the
   * browser can report AFTER the chip has been taken off screen — putting back
   * the filter the user just removed. Chrome moves the caret to the button
   * being pressed, so the report arrives early and harmlessly there; Safari and
   * Firefox (and iOS, which the app ships into) leave it where it is.
   */
  let gone = false;

  const clear = () => {
    if (handle !== undefined) {
      clearTimeout(handle);
      handle = undefined;
    }
  };

  const run = () => {
    clear();
    if (gone) return;
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

  // Only auto-cancel on cleanup when there's an owner to register against; an
  // ownerless caller owns disposal via cancel() (see the ownership note above).
  // Guarding avoids Solid's dev warning.
  if (getOwner())
    onCleanup(() => {
      gone = true;
      debounced.cancel();
    });
  return debounced;
};
