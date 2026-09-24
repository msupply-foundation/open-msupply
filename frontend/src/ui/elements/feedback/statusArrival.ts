import { createEffect, createSignal, on, type Accessor } from 'solid-js';

export interface StatusArrival {
  /** The stage just moved onto, until `clear()`; otherwise undefined. */
  arrived: Accessor<number | undefined>;
  /** The arrival has played — drop it so no later render replays it. */
  clear: () => void;
}

/*
 * Which stage of a status strip has JUST become current — the one a status
 * change moved the record onto while the strip was on screen — as opposed to
 * the stage that simply IS current. `current` alone can't tell those apart;
 * its history can, so this watches it change under a mounted strip rather
 * than asking every footer to report its own successes (every status change
 * reaches the strip the same way, whichever action made it).
 *
 * - The first value is the status the record opened at: not an arrival.
 * - Only a forward move arrives. A step back lands on a stage already
 *   reached, so there is no grey → accent change for the motion to carry.
 * - Any other change of `current` drops a pending arrival, so the motion never
 *   plays on a stage that is no longer current.
 * - The SAME value again is no change at all. `current` is usually a prop
 *   computed from the record, so it re-evaluates whenever the view replaces
 *   the record (a refetch straight after the save) and `on` runs again with
 *   next === previous. Treated as a move, that dropped the arrival a frame in.
 *
 * The caller clears it once the motion has played (StatusIndicator does so on
 * `animationend`), which is what makes it one-shot.
 *
 * Not `on(..., { defer: true })`: a deferred first run skips recording the
 * previous value, so the first real change would see it as undefined and be
 * missed.
 */
export const createStatusArrival = (
  current: Accessor<number>
): StatusArrival => {
  const [arrived, setArrived] = createSignal<number>();
  createEffect(
    on(current, (next, previous) => {
      if (next === previous) return;
      if (previous !== undefined && next > previous) setArrived(next);
      else setArrived(undefined);
    })
  );
  return { arrived, clear: () => setArrived(undefined) };
};
