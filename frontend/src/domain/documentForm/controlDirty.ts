import { onCleanup } from 'solid-js';
import type { FormParticipation } from '../../plugin-sdk/types';

/*
 * A control's share of its form's dirty flag (`form.setDirty`), for a control
 * that holds something of its own which the save will write, outside the
 * draft (the prescription control's units). Called in the control's
 * component: when the control leaves the form, what it held goes with it, so
 * the flag it set is cleared. It clears the flag only when it set it, so it
 * never clears one it did not set.
 */
export const createControlDirty = (
  form: FormParticipation
): ((dirty: boolean) => void) => {
  let marked = false;
  const mark = (dirty: boolean) => {
    if (!dirty && !marked) return;
    marked = dirty;
    form.setDirty(dirty);
  };
  onCleanup(() => mark(false));
  return mark;
};
