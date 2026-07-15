import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t } from '../../../intl';
import { graphqlFetch } from '../../../api/graphql';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Button } from '../../../ui/elements/buttons/Button';
import { CheckIcon, TrashIcon, XCircleIcon } from '../../../ui/icons';
import { DeleteStocktakes } from './stocktakes.generated';

export interface DeleteStocktakesActionProps {
  storeId: string;
  /** The currently-selected stocktake ids. */
  selectedIds: () => string[];
  /** Deletion succeeded — the list clears its selection and re-queries so the rows disappear. */
  onDeleted: () => void;
}

// The stocktakes-list delete action — its footer button + a confirm → deleting → success | error
// dialog, extracted as a self-contained component (peer of the detail-view actions, kdd/action-modal).
//
// The backend is the source of truth for what can be deleted — we don't pre-check status
// client-side. The batch is ATOMIC: if any stocktake can't be deleted (e.g. a finalised one →
// CannotEditStocktake) the whole batch fails and NOTHING is deleted, so on error we show OUR
// translated message (not the server's English description) with just a Close. While deleting, the
// dialog is blocking (no scrim/Escape) and Cancel is hidden. Success reports the count; the list
// clears selection + re-queries (onDeleted).
//
// Unlike the detail LINE actions this KEEPS success/error phases in the modal: the list has no rows
// to stamp per-line errors onto, so the outcome (a count, or the atomic can't-delete message) is
// shown in the dialog itself. Same mount-while-open shape though — the phase lives in <Body>, fresh
// on every open, and the selected ids are read straight from props (like the line actions).
type Phase = 'confirm' | 'deleting' | 'success' | 'error';

export const DeleteStocktakesAction: Component<DeleteStocktakesActionProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button variant="secondary" icon={<TrashIcon />} onClick={() => setOpen(true)}>
        {t('common.delete')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (props: DeleteStocktakesActionProps & { onClose: () => void }) => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  // Count snapshotted on open (Body mounts once per open) so the success/confirm message can't shift
  // if the selection changes behind the dialog.
  const count = props.selectedIds().length;

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('deleting');
    const result = await graphqlFetch(DeleteStocktakes, {
      storeId: props.storeId,
      ids: props.selectedIds().map((id) => ({ id })),
    });
    if (result.kind !== 'success') {
      // transport/unexpected → the global error modal already surfaced it; drop back to confirm so
      // the dialog isn't left stuck loading.
      setPhase('confirm');
      return;
    }
    const items = result.data.batchStocktake.deleteStocktakes ?? [];
    const failed = items.some((i) => i.response.__typename === 'DeleteStocktakeError');
    if (failed) {
      setPhase('error');
      return;
    }
    // Success: hand back to the list (clear selection + re-query behind the dialog), then report.
    props.onDeleted();
    setPhase('success');
  };

  return (
    // A plain "delete N?" confirm; if the atomic batch reports it can't (a finalised stocktake in the
    // selection), the same dialog switches to the translated error with just a Close.
    <Dialog
      open
      // Blocking while the mutation is in flight — no click-outside / Escape exit until it resolves.
      dismissable={phase() !== 'deleting'}
      onClose={props.onClose}
      icon={<TrashIcon />}
      title={t('stocktake.delete.title')}
      description={
        <Switch fallback={t('stocktake.delete.confirm', { count })}>
          <Match when={phase() === 'error'}>
            <Alert severity="error">{t('stocktake.delete.cannot-edit')}</Alert>
          </Match>
          <Match when={phase() === 'success'}>{t('stocktake.delete.success', { count })}</Match>
        </Switch>
      }
      actions={
        <Switch
          fallback={
            // confirm / deleting: Cancel (hidden while deleting) + the loading Delete.
            <>
              <Show when={phase() === 'confirm'}>
                <Button variant="secondary" icon={<XCircleIcon />} onClick={props.onClose}>
                  {t('common.cancel')}
                </Button>
              </Show>
              <Button
                variant="secondary"
                icon={<TrashIcon />}
                loading={phase() === 'deleting'}
                onClick={() => void run()}
              >
                {t('stocktake.delete.action')}
              </Button>
            </>
          }
        >
          <Match when={phase() === 'success'}>
            <Button variant="secondary" icon={<CheckIcon />} onClick={props.onClose}>
              {t('common.ok')}
            </Button>
          </Match>
          <Match when={phase() === 'error'}>
            <Button variant="secondary" icon={<XCircleIcon />} onClick={props.onClose}>
              {t('common.cancel')}
            </Button>
          </Match>
        </Switch>
      }
    />
  );
};
