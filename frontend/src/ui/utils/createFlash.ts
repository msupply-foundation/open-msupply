import { createSignal, getOwner, onCleanup, type Accessor } from 'solid-js';

/*
 * A self-clearing value as a Solid primitive — the mechanism behind an action
 * reporting its outcome IN PLACE (spec/ui-standards/controls.md § action
 * feedback, never a toast): a control briefly reads "Exported" / "Export
 * failed" / "Copied", then reverts to its resting label.
 *
 * `show(value)` sets it and schedules the revert `ms` later; a second `show`
 * before that fires supersedes the first and restarts the clock, so a rapid
 * second outcome never reverts on the first one's timer. `clear()` drops it
 * now — for a control whose resting label depends on something the user just
 * changed (a split button re-targeted to another option, where a lingering
 * outcome would label the wrong action).
 *
 * Hand-rolled rather than a dependency (own-the-simple-buy-hard), and a
 * primitive rather than a Button/SplitButton prop: WHICH outcome to report is
 * the action's semantics, not the control's. `saveBlob` resolves three ways
 * and the middle one — a dismissed OS save picker, a decline — must report
 * nothing at all, a distinction only the caller can make. The components own
 * the RENDERING of busy and outcome (`loading`, `mainLabel`); this owns the
 * timing.
 *
 * Ownership: matching createDebounced — the auto-clear-on-cleanup only works
 * under a reactive owner (a component / createRoot). Created ownerless, there
 * is no owner to hang the cleanup on, so the caller MUST call `clear()` itself
 * to avoid leaking a pending timer; registering onCleanup there would be a
 * no-op that also logs a dev warning.
 */
export interface Flash<T> {
  /** The current outcome, or `undefined` once it has reverted. */
  value: Accessor<T | undefined>;
  /** Show `value`, reverting after the flash duration. Supersedes any pending. */
  show: (value: T) => void;
  /** Revert now. */
  clear: () => void;
}

/** Long enough to read a short label, short enough not to linger. */
export const FLASH_MS = 2000;

export const createFlash = <T>(ms: number = FLASH_MS): Flash<T> => {
  const [value, setValue] = createSignal<T | undefined>();
  let handle: ReturnType<typeof setTimeout> | undefined;

  const clear = () => {
    if (handle !== undefined) {
      clearTimeout(handle);
      handle = undefined;
    }
    setValue(undefined);
  };

  const show = (next: T) => {
    if (handle !== undefined) clearTimeout(handle);
    // A setter that stores a value may be handed a function — wrap so a T that
    // happens to be callable is stored, not invoked as an updater.
    setValue(() => next);
    handle = setTimeout(() => {
      handle = undefined;
      setValue(undefined);
    }, ms);
  };

  if (getOwner()) onCleanup(clear);
  return { value, show, clear };
};
