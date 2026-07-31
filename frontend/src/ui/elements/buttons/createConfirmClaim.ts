import { onCleanup, onMount } from 'solid-js';
import {
  useDialogConfirm,
  type ConfirmClaim,
  type ConfirmRole,
} from '../feedback/dialogConfirm';

/*
 * A footer button declaring its role to the surrounding <Dialog>
 * (spec/keyboard KB-E2). Used only by the StandardButtons — the four wrappers
 * whose whole purpose is to fix an action's identity, which is exactly the fact
 * the dialog needs.
 *
 * Outside a Dialog there is no provider and this does nothing, so the same
 * SaveButton works in a page toolbar untouched.
 */

export interface ConfirmClaimProps {
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Returns a ref callback to put on the button. Claiming needs the ELEMENT, not
 * the props, because activation goes through a real `.click()` (see
 * ConfirmClaim.activate).
 *
 * `role` is an accessor only so `Button` can pass its prop without reading it at
 * setup and tripping the reactivity lint; the value is READ ONCE, since a button
 * does not change its footer role at runtime. A `role` of `undefined` (the
 * common case — most buttons are not dialog confirms) claims nothing.
 */
export const createConfirmClaim = (
  role: () => ConfirmRole | undefined,
  props: ConfirmClaimProps
): {
  ref: (el: HTMLButtonElement) => void;
  /**
   * Whether this button actually holds a footer role — a role WAS declared and
   * there is a `<Dialog>` to hold it. The button's derived binding hangs off
   * this: a CancelButton in a page toolbar must not tell assistive technology
   * `aria-keyshortcuts="Escape"`, or show an Escape badge, for a key that
   * cancels nothing there.
   */
  claimed: boolean;
} => {
  const slots = useDialogConfirm();
  const declared = role();
  let element: HTMLButtonElement | undefined;

  // Stable identity, so release() can check it still holds THIS claim — a
  // <Show> swap can mount the replacement before the old one's cleanup runs,
  // and an unchecked release would then clear the new claim and leave the slot
  // empty.
  const claim: ConfirmClaim = {
    activate: () => element?.click(),
    // Button collapses `disabled || loading` onto the element, so the claim has
    // to read both or Enter re-fires an in-flight confirm (AC-KB26).
    disabled: () => props.disabled === true || props.loading === true,
  };

  const claimed = slots !== undefined && declared !== undefined;
  if (slots !== undefined && declared !== undefined) {
    onMount(() => slots.claim(declared, claim));
    onCleanup(() => slots.release(declared, claim));
  }

  return {
    ref: el => {
      element = el;
    },
    claimed,
  };
};
