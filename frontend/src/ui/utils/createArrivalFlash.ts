import { createEffect, on, type Accessor } from 'solid-js';
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
 * Taking the message empties the slot, and a later create overwrites it.
 */
let pending: { recordId: string; message: string } | undefined;

/** Leave `message` for the screen about to open the record `recordId`. */
export const flashOnArrival = (recordId: string, message: string) => {
  pending = { recordId, message };
};

/**
 * The message left for this screen's record, flashed once the record has
 * loaded: `loadedId` is the id of the record on screen, undefined while it
 * loads. Pass the value to ContentFooterMessage's `message`.
 */
export const createArrivalFlash = (
  loadedId: Accessor<string | undefined>
): Accessor<string | undefined> => {
  const flash = createFlash<string>();
  createEffect(
    on(loadedId, id => {
      if (id === undefined || pending?.recordId !== id) return;
      const { message } = pending;
      pending = undefined;
      flash.show(message);
    })
  );
  return flash.value;
};
