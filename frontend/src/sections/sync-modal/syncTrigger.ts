import { createEffect, createRoot, createSignal } from 'solid-js';
import { syncStatus, triggerSync } from '../../api/syncStore';
import {
  advanceTriggerState,
  armTrigger,
  IDLE_TRIGGER,
  type TriggerState,
} from './syncStatus';

/*
 * SYNC-03.25's busy machine, shared by BOTH ways a manual run starts — the
 * modal's Sync-now button and the bottom bar's status line (spec/chrome § sync
 * status). One machine, not one per surface: the two read the same substrate
 * run, and with separate machines a run armed in the modal never reads as
 * in-flight in the footer — for a fast-failing run (no isSyncing frame to
 * observe) the cell would sit on "Synced … ago" while the modal beside it
 * showed the run, exactly the disagreement OMS-REG-FTR-03.19 forbids.
 *
 * Module-scope state, like the substrate store's own signals: the armed run is
 * a session fact, not any component's.
 *
 * The advance is STORED, not derived at read. advanceTriggerState is pure over
 * (armed, status), but it is not idempotent over a REPLAYED status: its
 * `!prev.active` guard is what makes release one-way, and that guard only bites
 * on a state that was written back. Derived at read, the stored arm would keep
 * its pre-run signature for the whole session, so any later frame carrying that
 * same signature — and syncRunSignature exists precisely so "a stale pre-run
 * redelivery" hashes identically — would read as armed again, wedging the cell
 * on "Syncing…" with syncNow() a no-op until the next status frame.
 *
 * The effect needs an owner and there is no component to own it (both surfaces
 * share this one machine), so it gets a root of its own — never disposed, which
 * is correct: it lives exactly as long as the store signals it reads.
 */
const [trigger, setTrigger] = createSignal<TriggerState>(IDLE_TRIGGER);

createRoot(() => {
  createEffect(() => {
    const status = syncStatus();
    setTrigger(prev => advanceTriggerState(prev, status));
  });
});

/** A manual run is in flight, held from the click until the run's signature
 * moves on — even when it fails before any in-progress frame arrives. */
export const triggerActive = (): boolean => trigger().active;

/** Start a manual sync. A no-op while a run is already in flight (the status
 * line is aria-disabled, not disabled, so activation still reaches here; the
 * keyboard binding has no gate of its own at all). */
export const syncNow = (): void => {
  if (triggerActive() || syncStatus()?.isSyncing) return;
  setTrigger(armTrigger(syncStatus()));
  // Fire-and-forget; a request that itself fails releases the busy state (the
  // failure surfaces through the global unexpected-error handling).
  void triggerSync().then(ok => {
    if (!ok) setTrigger(IDLE_TRIGGER);
  });
};
