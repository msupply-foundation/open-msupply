import { createContext, useContext } from 'solid-js';

/*
 * How a <Dialog> learns which of its footer buttons confirms it
 * (spec/keyboard KB-E2, kdd/keyboard-layer decision 8).
 *
 * KB-E2: "In a dialog, Enter activates the dialog's confirming action from
 * anywhere in its form — the user need not tab to the button. Which action it
 * activates follows the footer: where a continuing action (Save & next) is
 * present and enabled, Enter activates THAT; otherwise it activates the plain
 * confirming action."
 *
 * `Dialog` takes `actions` as opaque JSX and must stay layout-only
 * (kdd/explicit-composition), so it cannot inspect its footer. Instead it
 * provides this context and each StandardButton CLAIMS ITS ROLE. The button
 * declares its role in the footer; the Dialog reads that role, not a behaviour.
 *
 * ROLE-KEYED SLOTS, not a list, so ordering is deterministic regardless of mount
 * order — SaveAndNextButton is <Show>-gated in several line editors, so a list
 * would put it first or last depending on when the gate flipped.
 *
 * Rejected alternatives (kdd/keyboard-layer): `<Dialog confirm={…}>` at each
 * call site (duplicates the button's disabled state across ~57 dialogs), and
 * `<Button confirms="plain">` (one more thing every future dialog must remember,
 * failing silently when forgotten).
 *
 * CONSEQUENCE: a dialog whose confirm is a bare <Button> gets no Enter. That is
 * intended and documented — the same enforcement shape as check-page-css.
 */

export type ConfirmRole =
  /** OK / Save — the plain confirming action. */
  | 'plain'
  /** Save & next — the continuing confirm, which wins when enabled. */
  | 'continuing'
  /** Cancel. Claimed for its Escape badge and its palette entry, not for Enter. */
  | 'cancel';

export interface ConfirmClaim {
  /**
   * Run the button's action.
   *
   * Implemented by clicking the real element, never by calling `onClick`: native
   * activation fires exactly once, respects `disabled`, and cannot diverge from
   * what a mouse does. That is KB-E4's "a button already activates on Enter;
   * nothing may re-fire it on top of that" — we route through the one activation
   * path rather than adding a second.
   */
  activate: () => void;
  /**
   * Whether the button is currently inert. An ACCESSOR, read at keypress time,
   * so there is no subscription and no remount risk — and it must fold in
   * `loading`, because Button collapses `disabled || loading` and Enter would
   * otherwise re-fire a pending confirm (AC-KB26).
   */
  disabled: () => boolean;
}

export interface DialogConfirmSlots {
  /** Claim a role. Identity-checked on release, so a <Show> swap is safe. */
  claim: (role: ConfirmRole, claim: ConfirmClaim) => void;
  release: (role: ConfirmRole, claim: ConfirmClaim) => void;
  get: (role: ConfirmRole) => ConfirmClaim | undefined;
}

export const DialogConfirmContext = createContext<DialogConfirmSlots>();

/**
 * The claim surface for a footer button. `undefined` outside a `<Dialog>` — a
 * SaveButton in a page toolbar claims nothing.
 */
export const useDialogConfirm = () => useContext(DialogConfirmContext);
