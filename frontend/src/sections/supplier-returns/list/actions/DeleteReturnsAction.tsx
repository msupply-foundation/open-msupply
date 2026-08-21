import { createSignal, For, Match, Show, Switch, type Component } from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CancelButton } from '../../../../ui/elements/buttons/StandardButtons';
import { ErrorDetails } from '../../../../ui/elements/feedback/ErrorDetails';
import { TrashIcon } from '../../../../ui/icons';
import { deleteReturn } from '../../detail/returnUpdate';
import type { DeleteRejection } from '@/domain/invoice';

export interface DeleteReturnsActionProps {
  storeId: string;
  /** The selected rows' id + status (the status drives the stock warning). */
  selectedRows: () => { id: string; status: string }[];
  /** Deletion succeeded — clear the selection and re-query. */
  onDeleted: () => void;
}

// The returns-list bulk delete (spec/supplier-returns § deletion). Offered for
// any selection: deletability is the admissibility of an action, not a standing
// property of the rows, so the batch is SUBMITTED and each row's own refusal
// reported rather than pre-screened here (validation.md § actions; issue #1134)
// — which is also how the detail screen's own Delete already behaved, so one
// return now gives one answer wherever it is deleted.
//
// There is NO batch mutation for supplier returns, so a confirmed batch runs
// one deleteSupplierReturn per id and each row succeeds or fails on its own — a
// refusal never stops the rest, and the report says how many went.
//
// Deleting a PICKED return RESTORES its stock: the server deletes each
// stock-out line, which returns the packs to the stock line (rules § deleting
// an issued return restores its stock). The confirmation says so — stock moving
// is worth stating, even when it moves back.
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
          reference vertical's bulk delete. */}
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
  const restoresStock = props.selectedRows().some(row => row.status !== 'NEW');

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
              {/* The stock comes back — informational, so the confirm still
                  submits (validation.md § actions). */}
              <Show when={restoresStock}>
                <Alert severity="warning" testId="delete-restores-stock">
                  {t('messages.delete-restores-issued-stock')}
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
