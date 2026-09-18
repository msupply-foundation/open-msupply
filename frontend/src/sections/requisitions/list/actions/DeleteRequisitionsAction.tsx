import { createSignal, Show, type Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { TrashIcon } from '@/ui/icons';
import { DeleteRequisitions } from '../requisitions.generated';

export interface DeleteRequisitionsActionProps {
  storeId: string;
  /** The currently-selected requisition ids. */
  selectedIds: () => string[];
  /**
   * Deletion succeeded — the list clears its selection and re-queries so the
   * rows disappear.
   */
  onDeleted: () => void;
}

// The requisitions-list bulk delete (OMS-FUN-DIS-01.36/.37, spec S6): footer
// button + a confirm → deleting → error dialog. The client does NOT pre-screen
// the selection ([D23], ui-standards › where validation runs): the batch is
// always submitted, and the server's finalised / transferred / shipment-guard
// rejections come back typed, each surfacing inline in the dialog under its
// own message. The batch is ATOMIC: any member error rolls the whole batch
// back and nothing is removed, so on error we show the mapped reason with just
// a Close, keeping the selection (the footer, and this dialog, stay mounted).
// Success closes the dialog and hands back to the list — closure is the
// confirmation, no announcement follows (ui-standards controls.md § dialogs /
// § action feedback, [D21]).
type Phase = 'confirm' | 'deleting' | 'error';

// The typed rejections → their catalog messages (spec S6). Anything unmapped
// (e.g. LineDeleteError) falls back to the server's own description.
const errorMessage = (typename: string, description: string): string => {
  switch (typename) {
    case 'FinalisedRequisition':
      return t('messages.cannot-delete-finalised-requisition');
    case 'TransferredRequisition':
      return t('messages.cannot-delete-transfer-requisition');
    case 'RequisitionWithShipment':
      return t('messages.cannot-delete-requisition-with-shipment');
    case 'RecordNotFound':
      return t('messages.record-not-found');
    default:
      return description;
  }
};

export const DeleteRequisitionsAction: Component<
  DeleteRequisitionsActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="danger"
        icon={<TrashIcon />}
        data-testid="delete-lines-button"
        onClick={() => setOpen(true)}
      >
        {t('button.delete')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (
  props: DeleteRequisitionsActionProps & { onClose: () => void }
) => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [message, setMessage] = createSignal<string>();
  // Count snapshotted on open (Body mounts once per open) so the confirm
  // message can't shift if the selection changes behind the dialog.
  const count = props.selectedIds().length;

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('deleting');
    const result = await graphqlFetch(DeleteRequisitions, {
      storeId: props.storeId,
      ids: props.selectedIds().map(id => ({ id })),
    });
    if (result.kind !== 'success') {
      // transport/unexpected → the global error modal already surfaced it;
      // drop back to confirm so the dialog isn't left stuck loading.
      setPhase('confirm');
      return;
    }
    const items =
      result.data.batchResponseRequisition.deleteResponseRequisitions ?? [];
    // Judge the batch by whether ANY member errored — a validating member
    // still reports DeleteResponse on a rolled-back batch (contract › deletion
    // wire trap), so a per-member "success" is not proof.
    const firstError = items.find(
      i => i.response.__typename === 'DeleteResponseRequisitionError'
    );
    if (
      firstError &&
      firstError.response.__typename === 'DeleteResponseRequisitionError'
    ) {
      setMessage(
        errorMessage(
          firstError.response.error.__typename,
          firstError.response.error.description
        )
      );
      setPhase('error');
      return;
    }
    // Success: close (closure is the confirmation — ui-standards controls.md
    // § dialogs), then hand back to the list. onDeleted clears the selection,
    // which unmounts the selection-gated footer this dialog lives in — so it
    // must come last, after the dialog is already closed.
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
      // The title tracks the phase — a rejection is not a question
      // (kdd/action-modal).
      title={
        phase() === 'error'
          ? t('heading.cannot-do-that')
          : t('heading.are-you-sure')
      }
      description={
        <Show
          when={phase() === 'error'}
          fallback={tPlural('messages.confirm-delete-requisitions', count)}
        >
          <Alert severity="error">{message()}</Alert>
        </Show>
      }
      actions={
        <Show
          when={phase() === 'error'}
          fallback={
            // confirm / deleting: Cancel (hidden while deleting) + the loading
            // Delete.
            <>
              <Show when={phase() === 'confirm'}>
                <CancelButton onClick={props.onClose} />
              </Show>
              <Button
                variant="danger"
                confirms="plain"
                data-testid="confirmation-modal-ok"
                loading={phase() === 'deleting'}
                onClick={() => void run()}
              >
                {t('button.ok')}
              </Button>
            </>
          }
        >
          {/* Error: nothing to submit — a single Close. */}
          <Button variant="secondary" confirms="plain" onClick={props.onClose}>
            {t('button.close')}
          </Button>
        </Show>
      }
    />
  );
};
