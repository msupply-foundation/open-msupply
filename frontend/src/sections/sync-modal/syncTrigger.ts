import { createSignal } from 'solid-js';
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
 * a session fact, not any component's. `active` is DERIVED at read rather than
 * advanced by an effect — advanceTriggerState is pure over (armed, status), so
 * a stored advance would only duplicate what the two signals already say.
 */
const [trigger, setTrigger] = createSignal<TriggerState>(IDLE_TRIGGER);

/** A manual run is in flight, held from the click until the run's signature
 * moves on — even when it fails before any in-progress frame arrives. */
export const triggerActive = (): boolean =>
  advanceTriggerState(trigger(), syncStatus()).active;

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
