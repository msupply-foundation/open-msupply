import {
  createEffect,
  createMemo,
  on,
  onCleanup,
  type Accessor,
} from 'solid-js';
import { createFlash } from './createFlash';

/*
 * A create's confirmation, carried across the navigation it causes
 * (spec/ui-standards/controls.md § action feedback, issue #1555). A create that
 * opens its new record can't flash the chip itself: the dialog is gone and the
 * page it was on is about to unmount. So it leaves the message here, keyed to
 * the new record's id, and the record's screen takes it when that record
 * loads, flashing it in its own content footer.
 *
 * One slot, not router state: history state survives a reload and comes back
 * on back/forward, and the notice is for the arrival the create caused, once.
 * Taking the message empties the slot, and a later create overwrites it. A
 * message nobody took (the user left before the record loaded) expires, so
 * opening that record later in the session doesn't confirm a create the user
 * has long moved on from.
 */
let pending: { recordId: string; message: string; at: number } | undefined;

/** How long a message waits for its record's screen. */
export const ARRIVAL_EXPIRY_MS = 15_000;

/** Leave `message` for the screen about to open the record `recordId`. */
export const flashOnArrival = (recordId: string, message: string) => {
  pending = { recordId, message, at: Date.now() };
};

/**
 * How long after the record loads the message is shown. The footer's message
 * slot is a polite live region, and a screen reader only announces a change
 * to a region that was already in the page: the footer mounts as the record
 * loads, so a message shown in the same moment arrives WITH its region and is
 * never read. The beat lets the empty region land first.
 */
export const ARRIVAL_DELAY_MS = 500;

/**
 * The message left for this screen's record, flashed once the record has
 * loaded: `loadedId` is the id of the record on screen, undefined while it
 * loads. Pass the value to ContentFooterMessage's `message`.
 */
export const createArrivalFlash = (
  loadedId: Accessor<string | undefined>
): Accessor<string | undefined> => {
  const flash = createFlash<string>();
  // Through a memo: the caller reads the id off its record, so a bare accessor
  // re-runs whenever the record is re-read with the id unchanged, and that
  // re-run would cancel the pending message without showing it.
  const id = createMemo(loadedId);
  createEffect(
    on(id, loaded => {
      if (loaded === undefined || pending?.recordId !== loaded) return;
      const { message, at } = pending;
      pending = undefined;
      if (Date.now() - at > ARRIVAL_EXPIRY_MS) return;
      const handle = setTimeout(() => flash.show(message), ARRIVAL_DELAY_MS);
      onCleanup(() => clearTimeout(handle));
    })
  );
  return flash.value;
};
