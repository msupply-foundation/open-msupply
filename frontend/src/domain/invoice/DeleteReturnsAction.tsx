import {
  createSignal,
  For,
  Match,
  Show,
  Switch,
  type Component,
} from 'solid-js';
import { t, tPlural } from '../../intl';
import type { Rejection } from '../../api/rejection';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { Alert } from '../../ui/elements/feedback/Alert';
import { Button } from '../../ui/elements/buttons/Button';
import { CancelButton } from '../../ui/elements/buttons/StandardButtons';
import { ErrorDetails } from '../../ui/elements/feedback/ErrorDetails';
import { Stack } from '../../ui/layout/Stack/Stack';
import { TrashIcon } from '../../ui/icons';

/**
 * What a vertical's own `deleteReturn` answers. Both returns verticals return
 * this same union: `forbidden` means the global permission-denied modal has
 * already been raised (D38), `error` carries the server's reason, and `failed`
 * is a transport failure the global modal already owns.
 */
export type DeleteReturnOutcome =
  | { kind: 'deleted' }
  | { kind: 'forbidden' }
  | { kind: 'error'; message: string; detail?: string }
  | { kind: 'failed' };

export interface DeleteReturnsActionProps {
  storeId: string;
  /**
   * The selection, by id — every one of them is submitted. Ids, not rows, so a
   * selection carried across a page change still deletes what the footer says
   * is selected rather than only the part still on screen.
   */
  selectedIds: () => string[];
  /** Delete one return — the vertical's own mutation. */
  deleteOne: (storeId: string, id: string) => Promise<DeleteReturnOutcome>;
  /**
   * The confirmation's stock notice: whether the selection holds stock this
   * delete moves (read once, on open), and what to say about it. Omitted where
   * a delete moves no stock.
   */
  stockNotice?: {
    applies: () => boolean;
    message: string;
    testId: string;
  };
  /** Anything was deleted — clear the selection and re-query. */
  onDeleted: () => void;
}

// The returns-list bulk delete, shared by customer and supplier returns: the
// two differ only in which mutation deletes a row and what the confirmation
// says about the stock, both supplied as props (kdd/explicit-composition).
//
// Offered for any selection: deletability is the admissibility of an action,
// not a standing property of the rows, so the batch is SUBMITTED and each
// row's own refusal reported rather than pre-screened here (validation.md
// § actions; issue #1134). Each vertical's detail screen behaves the same way,
// so one return gives one answer wherever it is deleted.
//
// There is NO batch mutation for either kind of return, so a confirmed batch
// runs one delete per id and each row succeeds or fails on its own — a refusal
// never stops the rest, and the report says how many went.
//
// A delete past the first status moves stock, which the confirmation states
// rather than blocks — see each vertical's own `stockNotice` at the call site
// for which way it moves.
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
  const [failures, setFailures] = createSignal<Rejection[]>([]);
  // Snapshotted on open so neither can shift behind the dialog: the count, and
  // the stock notice — kept only where it applies to this selection.
  const count = props.selectedIds().length;
  const stockNotice = props.stockNotice?.applies()
    ? props.stockNotice
    : undefined;

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
    const failed: Rejection[] = [];
    // Sequential, one per id — keeps the outcome per row unambiguous. A refusal
    // never stops the rest: the rows that CAN go, go.
    for (const id of props.selectedIds()) {
      const result = await props.deleteOne(props.storeId, id);
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
            <Stack gap="sm">
              {tPlural('messages.confirm-delete-returns', count)}
              {/* Stock moving — informational, so the confirm still submits
                  (validation.md § actions). */}
              <Show when={stockNotice}>
                {notice => (
                  <Alert severity="warning" testId={notice().testId}>
                    {notice().message}
                  </Alert>
                )}
              </Show>
            </Stack>
          }
        >
          <Match when={phase() === 'error'}>
            <Stack gap="sm">
              <Show when={deletedCount() > 0}>
                <p>{tPlural('messages.deleted-returns', deletedCount())}</p>
              </Show>
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
            </Stack>
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
