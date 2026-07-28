import { Match, Show, Switch, type JSX } from 'solid-js';
import { HelpIcon } from '../../icons';
import { Button } from '../buttons/Button';
import {
  CancelButton,
  DialogSaveButton,
  OkButton,
} from '../buttons/StandardButtons';
import { Dialog } from './Dialog';

export interface ConfirmDialogProps {
  open: boolean;
  /** Every close path — Cancel, scrim, Escape. OK runs onConfirm first. */
  onClose: () => void;
  title?: string;
  message: JSX.Element;
  /**
   * Which STANDARD button confirms: `'ok'` (default) or `'save'` — the library's
   * pre-composed OkButton / DialogSaveButton, so a save confirmation is the same
   * control as a modal footer's Save rather than a look-alike (Carl 2026-07-28).
   * For a confirm verb the library has no standard button for — Discard, Delete
   * — pass {@link confirmLabel} instead; it wins over this.
   */
  confirmAction?: 'ok' | 'save';
  /**
   * A bespoke confirm verb (Discard, Delete) for an action that isn't an OK or a
   * Save. Rendered in the same primary tone as the standard buttons. Omit to get
   * the standard button named by {@link confirmAction}.
   */
  confirmLabel?: string;
  /** A bespoke dismiss verb. Omit for the standard, translated Cancel. */
  cancelLabel?: string;
  onConfirm: () => void;
}

/*
 * Confirmation preset built on <Dialog> — the standard "Are you sure?"
 * Cancel/confirm pattern. The owning component keeps `open` state, renders this,
 * and handles onConfirm. Ported from the RnD prototype's ConfirmDialog.
 *
 * The footer is the library's standard buttons (StandardButtons), not
 * look-alikes: CancelButton beside OkButton / DialogSaveButton. So the labels
 * are translated by default, and a save confirmation is literally the same
 * control as a modal footer's Save. The CONFIRM slot is always the dialog's
 * PRIMARY action — including a bespoke verb (Discard, Delete) — while Cancel
 * stays secondary (Carl 2026-07-28; the same "footer actions are the standard
 * icon-less buttons" decision as spec D55).
 *
 * Gated by <Show> on `open` so the <dialog testid="confirmation-modal"> isn't
 * in the DOM at all while closed — a closed-but-mounted confirm coexists with
 * other actions' confirms under the same testid, which trips the shared e2e
 * suite's strict-mode locator (and needlessly keeps a hidden dialog live). The
 * owner keeps the `open` state, so unmounting loses nothing.
 */
export const ConfirmDialog = (props: ConfirmDialogProps) => {
  const confirm = () => {
    props.onConfirm();
    props.onClose();
  };

  return (
    <Show when={props.open}>
      <Dialog
        open
        onClose={props.onClose}
        icon={<HelpIcon />}
        testId="confirmation-modal"
        title={props.title ?? 'Are you sure?'}
        description={props.message}
        actions={
          <>
            <Show
              when={props.cancelLabel}
              fallback={
                <CancelButton
                  data-testid="dialog-button-cancel"
                  onClick={props.onClose}
                />
              }
            >
              {label => (
                <Button
                  variant="secondary"
                  data-testid="dialog-button-cancel"
                  onClick={props.onClose}
                >
                  {label()}
                </Button>
              )}
            </Show>
            {/* Branch order: a bespoke label wins, else the named standard
                button. A <Switch> (not a nested ternary in JSX) so the button is
                only re-created when the BRANCH changes, never on an unrelated
                prop read — a re-created button would drop keyboard focus
                mid-dialog (kdd/solid-reactivity-pitfalls). */}
            <Switch
              fallback={
                <OkButton
                  data-testid="confirmation-modal-ok"
                  onClick={confirm}
                />
              }
            >
              <Match when={props.confirmLabel}>
                {label => (
                  <Button
                    variant="primary"
                    data-testid="confirmation-modal-ok"
                    onClick={confirm}
                  >
                    {label()}
                  </Button>
                )}
              </Match>
              <Match when={props.confirmAction === 'save'}>
                <DialogSaveButton
                  data-testid="confirmation-modal-ok"
                  onClick={confirm}
                />
              </Match>
            </Switch>
          </>
        }
      />
    </Show>
  );
};
