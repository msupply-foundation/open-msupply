import { createSignal, Show, Switch, Match, type Component } from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CheckIcon, TrashIcon, XCircleIcon } from '../../../../ui/icons';
import { DeleteInternalOrderLines } from '../edit-modal/internalOrderLineEdit.generated';

export interface DeleteLinesActionProps {
  storeId: string;
  /** The currently-selected line ids. */
  selectedIds: () => string[];
  /**
   * Whether the order's lines may be deleted (Draft + supplier-store enabled).
   * The button stays clickable regardless; when this is false the click
   * surfaces the "only Draft orders" explanation instead of a confirmation and
   * nothing is submitted (AC-LN16). Program orders never reach here — their
   * item set is fixed, so the detail table offers no selection at all (D32).
   */
  canDelete: () => boolean;
  /**
   * Deletion succeeded — the detail clears its selection and refetches the page
   * so the removed rows disappear.
   */
  onDeleted: () => void;
}

// The internal-order detail line delete (spec AC-LN15/LN16): a footer button +
// a blocked | confirm → deleting → success | error dialog. Mirrors the list's
// DeleteInternalOrdersAction (same atomic batch, same active-and-explaining
// treatment of a blocked selection): on a read-only order the click opens the
// dialog already explaining why it can't proceed (AC-LN16), never a silently
// dead click; the server enforces the same guard regardless. The batch is
// ATOMIC — any member error rolls the whole batch back and nothing is removed,
// so on error we show the server's reason with just a Close, keeping the
// selection. Success shows the count deleted, then hands back to the detail.
type Phase = 'blocked' | 'confirm' | 'deleting' | 'success' | 'error';

export const DeleteLinesAction: Component<DeleteLinesActionProps> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="danger"
        icon={<TrashIcon />}
        data-testid="delete-lines-button"
        onClick={() => setOpen(true)}
      >
        {t('button.delete-lines')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (props: DeleteLinesActionProps & { onClose: () => void }) => {
  // Body mounts once per open, so the opening state is snapshotted here:
  // whether the selection is deletable picks the initial phase (blocked vs
  // confirm), and the count freezes so the confirm/success message can't shift
  // if the selection changes behind the dialog.
  const [phase, setPhase] = createSignal<Phase>(
    props.canDelete() ? 'confirm' : 'blocked'
  );
  const [errorMessage, setErrorMessage] = createSignal<string>();
  const count = props.selectedIds().length;

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('deleting');
    const result = await graphqlFetch(DeleteInternalOrderLines, {
      storeId: props.storeId,
      ids: props.selectedIds().map(id => ({ id })),
    });
    if (result.kind !== 'success') {
      // transport/unexpected → the global error modal already surfaced it; drop
      // back to confirm so the dialog isn't left stuck loading.
      setPhase('confirm');
      return;
    }
    const items =
      result.data.batchRequestRequisition.deleteRequestRequisitionLines ?? [];
    // Judge the batch by whether ANY member errored — a validating member still
    // reports DeleteResponse on a rolled-back batch (contract › deletion wire
    // trap), so a per-member "success" is not proof.
    const firstError = items.find(
      i => i.response.__typename === 'DeleteRequestRequisitionLineError'
    );
    if (
      firstError &&
      firstError.response.__typename === 'DeleteRequestRequisitionLineError'
    ) {
      setErrorMessage(firstError.response.error.description);
      setPhase('error');
      return;
    }
    setPhase('success');
  };

  // Success dismissal: close first, then hand back to the detail. onDeleted
  // clears the selection, which unmounts the selection-gated footer this dialog
  // lives in — so it must come last, after the dialog is closed.
  const finishSuccess = () => {
    props.onClose();
    props.onDeleted();
  };

  return (
    <Dialog
      open
      // Blocking while the mutation is in flight — no click-outside / Escape
      // exit until it resolves.
      dismissable={phase() !== 'deleting'}
      onClose={props.onClose}
      icon={<TrashIcon />}
      testId="confirmation-modal"
      title={t('heading.are-you-sure')}
      description={
        <Switch
          fallback={tPlural('messages.confirm-delete-requisition-lines', count)}
        >
          {/* Blocked: a read-only order — explain why, and never submit
              (AC-LN16). */}
          <Match when={phase() === 'blocked'}>
            <Alert severity="warning">
              {t('label.cant-delete-disabled-internal-order')}
            </Alert>
          </Match>
          <Match when={phase() === 'success'}>
            {tPlural('messages.deleted-lines', count)}
          </Match>
          <Match when={phase() === 'error'}>
            <Alert severity="error">{errorMessage()}</Alert>
          </Match>
        </Switch>
      }
      actions={
        <Switch
          fallback={
            // confirm / deleting: Cancel (hidden while deleting) + the loading
            // Delete.
            <>
              <Show when={phase() === 'confirm'}>
                <Button
                  variant="secondary"
                  icon={<XCircleIcon />}
                  confirms="cancel"
                  data-testid="dialog-button-cancel"
                  onClick={props.onClose}
                >
                  {t('button.cancel')}
                </Button>
              </Show>
              <Button
                variant="secondary"
                icon={<TrashIcon />}
                loading={phase() === 'deleting'}
                confirms="plain"
                data-testid="confirmation-modal-ok"
                onClick={() => void run()}
              >
                {t('button.delete-lines')}
              </Button>
            </>
          }
        >
          {/* Success: a single OK that closes and refetches. */}
          <Match when={phase() === 'success'}>
            <Button
              variant="secondary"
              icon={<CheckIcon />}
              confirms="plain"
              data-testid="dialog-button-ok"
              onClick={finishSuccess}
            >
              {t('button.ok')}
            </Button>
          </Match>
          {/* Blocked / error: nothing to submit — a single Close. */}
          <Match when={phase() === 'blocked' || phase() === 'error'}>
            <Button
              variant="secondary"
              icon={<XCircleIcon />}
              confirms="plain"
              onClick={props.onClose}
            >
              {t('button.close')}
            </Button>
          </Match>
        </Switch>
      }
    />
  );
};
