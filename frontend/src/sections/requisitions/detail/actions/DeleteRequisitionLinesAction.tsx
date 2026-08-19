import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { TrashIcon } from '@/ui/icons';
import { DeleteRequisitionLines } from '../edit-modal/requisitionLineEdit.generated';

/**
 * The two standing states the UI mirrors WITHOUT a server call (AC-LD2):
 * not editable-by-status (Finalised / approval-blocked / disabled store) and
 * transfer-linked (the customer's ask is not deleted here). Every other guard
 * is the server's (rules › deleting lines).
 */
export type DeleteLinesBlock = 'not-editable' | 'transferred';

export interface DeleteRequisitionLinesActionProps {
  storeId: string;
  /** The currently-selected line ids. */
  selectedIds: () => string[];
  /**
   * The standing block in force, if any — picked when the dialog opens. The
   * button stays clickable regardless; when set, the click surfaces the
   * explanation instead of a confirmation and nothing is submitted (AC-LD2).
   */
  blocked: () => DeleteLinesBlock | undefined;
  /**
   * Deletion succeeded — the detail clears its selection and refetches so the
   * removed rows disappear (AC-LD1).
   */
  onDeleted: () => void;
}

// The requisition detail line delete (spec S2 § footer, AC-LD1–LD3): a footer
// button + a blocked | confirm → deleting → error dialog, mirroring the
// internal-order detail's DeleteLinesAction (same atomic batch, same
// active-and-explaining treatment of a blocked selection). On a read-only or
// transfer-linked requisition the click opens the dialog already explaining
// why it can't proceed — each block under its own message, no server call
// (AC-LD2) — never a silently dead click. The batch is ATOMIC: any member
// error rolls the whole batch back and nothing is removed (AC-LD3), so on
// error we show the mapped reason with just a Cancel, keeping the selection.
//
// No success phase: a clean delete CLOSES the dialog — closure is the
// confirmation and the rows gone behind it are the visible result
// (spec/ui-standards/controls.md § dialogs, D22; § action feedback, D21).
type Phase = 'blocked' | 'confirm' | 'deleting' | 'error';

// The typed rejections → their catalog messages (spec S6). The shipment guard
// names its cause (AC-LD3); anything unmapped falls back to the server's own
// description.
const errorMessage = (typename: string, description: string): string =>
  typename === 'CannotDeleteLineLinkedToShipment'
    ? t('message.cannot-delete-line-linked-to-shipment')
    : description;

export const DeleteRequisitionLinesAction: Component<
  DeleteRequisitionLinesActionProps
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
        {t('button.delete-lines')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (
  props: DeleteRequisitionLinesActionProps & { onClose: () => void }
) => {
  // Body mounts once per open, so the opening state is snapshotted here: the
  // standing block picks the initial phase, and the count freezes so the
  // confirm message can't shift if the selection changes behind the dialog.
  const block = props.blocked();
  const [phase, setPhase] = createSignal<Phase>(block ? 'blocked' : 'confirm');
  const [message, setMessage] = createSignal<string>();
  const count = props.selectedIds().length;

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('deleting');
    const result = await graphqlFetch(DeleteRequisitionLines, {
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
      result.data.batchResponseRequisition.deleteResponseRequisitionLines ??
      [];
    // Judge the batch by whether ANY member errored — a validating member
    // still reports DeleteResponse on a rolled-back batch (contract › deletion
    // wire trap), so a per-member "success" is not proof.
    const firstError = items.find(
      i => i.response.__typename === 'DeleteResponseRequisitionLineError'
    );
    if (
      firstError &&
      firstError.response.__typename === 'DeleteResponseRequisitionLineError'
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
    // Success: close first (closure is the confirmation), then hand back to
    // the detail. onDeleted clears the selection, which unmounts the
    // selection-gated footer this dialog lives in — so it must come last.
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
      // Blocked / error are no longer questions, so the heading stops asking
      // one (it would otherwise read "Are you sure?" over an explanation).
      title={
        phase() === 'blocked' || phase() === 'error'
          ? t('heading.cannot-do-that')
          : t('heading.are-you-sure')
      }
      description={
        <Switch
          fallback={tPlural('messages.confirm-delete-requisition-lines', count)}
        >
          {/* Blocked: explain the standing state and never submit (AC-LD2) —
              read-only and transfer-linked each under their own message. */}
          <Match when={phase() === 'blocked'}>
            <Alert severity="warning">
              {block === 'transferred'
                ? t('messages.cannot-delete-linked-requisition')
                : t('label.cant-delete-disabled-requisition')}
            </Alert>
          </Match>
          <Match when={phase() === 'error'}>
            <Alert severity="error">{message()}</Alert>
          </Match>
        </Switch>
      }
      actions={
        <Switch
          fallback={
            // confirm / deleting: Cancel (hidden while deleting) + the loading
            // danger OK (D55 — the confirming action carries the emphasis).
            <>
              <Show when={phase() === 'confirm'}>
                <CancelButton
                  data-testid="dialog-button-cancel"
                  onClick={props.onClose}
                />
              </Show>
              <Button
                variant="danger"
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
          {/* Blocked / error: nothing to submit — a single Close. */}
          <Match when={phase() === 'blocked' || phase() === 'error'}>
            <Button
              variant="secondary"
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
