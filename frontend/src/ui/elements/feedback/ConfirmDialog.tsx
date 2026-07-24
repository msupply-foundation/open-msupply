import { Show, type JSX } from 'solid-js';
import { HelpIcon } from '../../icons';
import { Button } from '../buttons/Button';
import { Dialog } from './Dialog';

export interface ConfirmDialogProps {
  open: boolean;
  /** Every close path — Cancel, scrim, Escape. OK runs onConfirm first. */
  onClose: () => void;
  title?: string;
  message: JSX.Element;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
}

/*
 * Confirmation preset built on <Dialog> — the standard "Are you sure?"
 * Cancel/OK pattern (secondary-tone buttons, as in the current app's blue
 * dialog actions). The owning component keeps `open` state, renders this, and
 * handles onConfirm. Ported from the RnD prototype's ConfirmDialog.
 *
 * Gated by <Show> on `open` so the <dialog testid="confirmation-modal"> isn't
 * in the DOM at all while closed — a closed-but-mounted confirm coexists with
 * other actions' confirms under the same testid, which trips the shared e2e
 * suite's strict-mode locator (and needlessly keeps a hidden dialog live). The
 * owner keeps the `open` state, so unmounting loses nothing.
 */
export const ConfirmDialog = (props: ConfirmDialogProps) => (
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
          <Button
            variant="secondary"
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          >
            {props.cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            variant="secondary"
            data-testid="confirmation-modal-ok"
            onClick={() => {
              props.onConfirm();
              props.onClose();
            }}
          >
            {props.confirmLabel ?? 'OK'}
          </Button>
        </>
      }
    />
  </Show>
);
