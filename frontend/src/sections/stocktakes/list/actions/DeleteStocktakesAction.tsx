import { createSignal, Show, type Component } from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { TrashIcon, XCircleIcon } from '../../../../ui/icons';
import { DeleteStocktakes } from '../stocktakes.generated';

export interface DeleteStocktakesActionProps {
  storeId: string;
  /** The currently-selected stocktake ids. */
  selectedIds: () => string[];
  /**
   * Deletion succeeded — the list clears its selection and re-queries so the
   * rows disappear.
   */
  onDeleted: () => void;
}

// The stocktakes-list delete action — its footer button + a confirm → deleting
// → error dialog, extracted as a self-contained component (peer of the
// detail-view actions, kdd/action-modal).
//
// The backend is the source of truth for what can be deleted — we don't
// pre-check status client-side. The batch is ATOMIC: if any stocktake can't be
// deleted (e.g. a finalised one → CannotEditStocktake) the whole batch fails
// and NOTHING is deleted, so on error we show OUR translated message (not the
// server's English description) with just a Close — the selection is kept so
// the footer (and this dialog) stay mounted. While deleting, the dialog is
// blocking (no scrim/Escape) and Cancel is hidden. Success closes the dialog
// and hands back to the list (clear selection + re-query, onDeleted) — closure
// is the confirmation, no announcement follows (ui-standards controls.md
// § dialogs / § action feedback).
//
// Unlike the detail LINE actions this KEEPS the error phase in the modal: the
// list has no rows to stamp per-line errors onto, so the atomic can't-delete
// message is shown in the dialog itself. Same mount-while-open shape though —
// the phase lives in <Body>, fresh on every open, and the selected ids are
// read straight from props (like the line actions).
type Phase = 'confirm' | 'deleting' | 'error';

export const DeleteStocktakesAction: Component<
  DeleteStocktakesActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="secondary"
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

const Body = (props: DeleteStocktakesActionProps & { onClose: () => void }) => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  // Count snapshotted on open (Body mounts once per open) so the confirm
  // message can't shift if the selection changes behind the dialog.
  const count = props.selectedIds().length;

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('deleting');
    const result = await graphqlFetch(DeleteStocktakes, {
      storeId: props.storeId,
      ids: props.selectedIds().map(id => ({ id })),
    });
    if (result.kind !== 'success') {
      // transport/unexpected → the global error modal already surfaced it;
      // drop back to confirm so the dialog isn't left stuck loading.
      setPhase('confirm');
      return;
    }
    const items = result.data.batchStocktake.deleteStocktakes ?? [];
    const failed = items.some(
      i => i.response.__typename === 'DeleteStocktakeError'
    );
    if (failed) {
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
    // A plain "delete N?" confirm; if the atomic batch reports it can't (a
    // finalised stocktake in the selection), the same dialog switches to the
    // translated error with just a Close.
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
        <Show
          when={phase() === 'error'}
          fallback={tPlural('messages.confirm-delete-stocktakes', count)}
        >
          <Alert severity="error">
            {t('messages.cannot-delete-finalised-stocktakes')}
          </Alert>
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
                <Button
                  variant="secondary"
                  icon={<XCircleIcon />}
                  onClick={props.onClose}
                >
                  {t('button.cancel')}
                </Button>
              </Show>
              <Button
                variant="secondary"
                icon={<TrashIcon />}
                data-testid="confirmation-modal-ok"
                loading={phase() === 'deleting'}
                onClick={() => void run()}
              >
                {t('button.ok')}
              </Button>
            </>
          }
        >
          <Button
            variant="secondary"
            icon={<XCircleIcon />}
            onClick={props.onClose}
          >
            {t('button.cancel')}
          </Button>
        </Show>
      }
    />
  );
};
