import {
  createSignal,
  For,
  Match,
  Show,
  Switch,
  type Component,
} from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CancelButton } from '../../../../ui/elements/buttons/StandardButtons';
import { ErrorDetails } from '../../../../ui/elements/feedback/ErrorDetails';
import { TrashIcon } from '../../../../ui/icons';
import { deleteReturn } from '../../detail/returnUpdate';
import { hasIntroducedStock } from '../../detail/returnStatus';
import type { DeleteRejection } from '@/domain/invoice';

export interface DeleteReturnsActionProps {
  storeId: string;
  /**
   * The selected rows' id + status + whether they hold any lines (status and
   * lines together drive the stock warning).
   */
  selectedRows: () => { id: string; status: string; hasLines: boolean }[];
  /** Deletion succeeded — clear the selection and re-query. */
  onDeleted: () => void;
}

// The returns-list bulk delete (spec/customer-returns, the delete flow —
// OMS-REG-DIST-07.40/.41). Offered for any selection: deletability is the
// admissibility of an action, not a standing property of the rows, so the batch
// is SUBMITTED and each row's own refusal reported rather than pre-screened
// here (validation.md § actions; issue #1134). The detail screen behaves the
// same way, so one return gives one answer wherever it is deleted.
//
// There is NO batch mutation for customer returns, so a confirmed batch runs
// one deleteCustomerReturn per id and each row succeeds or fails on its own — a
// refusal never stops the rest, and the report says how many went.
//
// Once RECEIVED the delete REVERSES the receipt: the server cascades to the
// lines and the stock they created, refusing per-line once any of that stock
// has been issued, reserved, counted in a stocktake or arrived by transfer
// (rules § deletion rules). So it is warned about, not blocked — and only where
// there is stock to take, which needs both the status and a line to exist.
//
// A clean sweep closes silently (closure is the confirmation — ui-standards
// controls.md § dialogs). The hand-back to the list (clear selection +
// re-query) is DEFERRED to the dialog's close: clearing the selection collapses
// the selection-gated footer this dialog lives in, so calling it mid-flow
// unmounts the dialog before the error phase can show.
type Phase = 'confirm' | 'deleting' | 'error';

export const DeleteReturnsAction: Component<
  DeleteReturnsActionProps
> = props => {
  const [open, setOpen] = createSignal(false);

  return (
    <>
      {/* Destructive tone (ui-standards: delete = danger), matching the
          reference vertical's bulk delete and the confirm below. */}
      <Button
        variant="danger"
        icon={<TrashIcon />}
        data-testid="delete-lines-button"
        onClick={() => setOpen(true)}
      >
        {t('label.delete')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (props: DeleteReturnsActionProps & { onClose: () => void }) => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  // How many rows went — the deferred hand-back needs it (see finish), and the
  // report both counts them and titles itself from it.
  const [deletedCount, setDeletedCount] = createSignal(0);
  // Each refused row's reason. Deduplicated for the report: N rows refused for
  // the same cause is one notice, not N identical ones.
  const [failures, setFailures] = createSignal<DeleteRejection[]>([]);
  // Snapshotted on open so neither can shift behind the dialog.
  const count = props.selectedRows().length;
  // Both halves have to hold for there to be stock at all: the return must have
  // reached RECEIVED (hasIntroducedStock — a transfer return at PICKED or
  // SHIPPED holds none), and it must actually have lines, since stock only ever
  // comes from those.
  const removesStock = props
    .selectedRows()
    .some(row => hasIntroducedStock(row.status) && row.hasLines);

  const reasons = () => {
    const seen = new Set<string>();
    return failures().filter(f => {
      if (seen.has(f.message)) return false;
      seen.add(f.message);
      return true;
    });
  };

  // Every close path: dismiss the dialog FIRST, then hand back to the list —
  // onDeleted clears the selection, which unmounts this dialog's footer host.
  const finish = () => {
    props.onClose();
    if (deletedCount() > 0) props.onDeleted();
  };

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('deleting');
    const failed: DeleteRejection[] = [];
    // Sequential, one per id — keeps the outcome per row unambiguous. A refusal
    // never stops the rest: the rows that CAN go, go.
    for (const row of props.selectedRows()) {
      const result = await deleteReturn(props.storeId, row.id);
      if (result.kind === 'deleted') setDeletedCount(n => n + 1);
      else if (result.kind === 'forbidden') {
        // A standing permission block — the global permission-denied modal is
        // already showing (D38) and every remaining row would fail the same
        // way. Commit any rows deleted before it and close this dialog rather
        // than stacking a second notice on top.
        finish();
        return;
      } else if (result.kind === 'error')
        failed.push({ message: result.message, detail: result.detail });
      // A transport failure has no reason to give; the global modal owns the
      // description, so it only counts against the batch.
      else failed.push({ message: t('messages.cant-delete-generic') });
    }
    if (failed.length > 0) {
      setFailures(failed);
      setPhase('error');
      return;
    }
    // Clean sweep: closure is the confirmation — no announcement.
    finish();
  };

  return (
    <Dialog
      open
      dismissable={phase() !== 'deleting'}
      onClose={finish}
      icon={<TrashIcon />}
      testId="confirmation-modal"
      // The title tracks the phase — a rejection is not a question
      // (kdd/action-modal). There is no batch mutation for returns, so these
      // are N independent deletes: when some rows DID go, "Can't do that!"
      // would sit over an outcome that partly succeeded.
      title={
        phase() !== 'error'
          ? t('heading.are-you-sure')
          : deletedCount() > 0
            ? t('heading.some-not-deleted')
            : t('heading.cannot-do-that')
      }
      description={
        <Switch
          fallback={
            <>
              {tPlural('messages.confirm-delete-returns', count)}
              {/* Receipt reversal — informational, so the confirm still
                  submits (validation.md § actions). */}
              <Show when={removesStock}>
                <Alert severity="warning" testId="delete-removes-stock">
                  {t('messages.delete-removes-received-stock')}
                </Alert>
              </Show>
            </>
          }
        >
          <Match when={phase() === 'error'}>
            <Show when={deletedCount() > 0}>
              <p>{tPlural('messages.deleted-returns', deletedCount())}</p>
            </Show>
            {/* One notice per distinct reason, so the user reads what the
                server actually said rather than a blanket refusal. */}
            <For each={reasons()}>
              {reason => (
                <Alert severity="error" testId="return-delete-refused">
                  {reason.message}
                  <Show when={reason.detail}>
                    {detail => <ErrorDetails detail={detail()} />}
                  </Show>
                </Alert>
              )}
            </For>
          </Match>
        </Switch>
      }
      // Dialog-footer identity (D55): icon-less throughout, Cancel secondary,
      // and the destructive confirm in the danger tone — a confirmation is
      // never a pair of equal-weight buttons.
      actions={
        <Switch
          fallback={
            <>
              <Show when={phase() === 'confirm'}>
                <CancelButton
                  data-testid="dialog-button-cancel"
                  onClick={finish}
                />
              </Show>
              <Button
                variant="danger"
                confirms="plain"
                data-testid="confirmation-modal-ok"
                loading={phase() === 'deleting'}
                onClick={() => void run()}
              >
                {t('label.delete')}
              </Button>
            </>
          }
        >
          <Match when={phase() === 'error'}>
            <Button
              variant="secondary"
              confirms="plain"
              data-testid="dialog-button-ok"
              onClick={finish}
            >
              {t('button.close')}
            </Button>
          </Match>
        </Switch>
      }
    />
  );
};
