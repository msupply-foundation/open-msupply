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
// clears selection + re-queries (onDeleted). Ids are snapshotted on open so a re-sort/refetch can't
// change what we submit.
//
// This is NOT the shared ActionModal: the list delete has no per-line errors (atomic, one message)
// and no "show error lines" jump — a distinct, simpler shape than the line actions.
type Phase = 'confirm' | 'deleting' | 'success' | 'error';
type State = { ids: string[]; phase: Phase };

export const DeleteStocktakesAction: Component<DeleteStocktakesActionProps> = (props) => {
  const [state, setState] = createSignal<State | null>(null);

  const open = () => setState({ ids: [...props.selectedIds()], phase: 'confirm' });

  const run = async () => {
    const ids = state()?.ids ?? [];
    if (ids.length === 0) return setState(null);
    setState({ ids, phase: 'deleting' });
    const result = await graphqlFetch(DeleteStocktakes, {
      storeId: props.storeId,
      ids: ids.map((id) => ({ id })),
    });
    if (result.kind !== 'success') {
      // transport/unexpected → the global error modal already surfaced it; drop back to confirm so
      // the dialog isn't left stuck loading.
      setState({ ids, phase: 'confirm' });
      return;
    }
    const items = result.data.batchStocktake.deleteStocktakes ?? [];
    const failed = items.some((i) => i.response.__typename === 'DeleteStocktakeError');
    if (failed) {
      setState({ ids, phase: 'error' });
      return;
    }
    // Success: hand back to the list (clear selection + re-query behind the dialog), then report.
    props.onDeleted();
    setState({ ids, phase: 'success' });
  };

  return (
    <>
      <Button variant="secondary" icon={<TrashIcon />} onClick={open}>
        {t('common.delete')}
      </Button>
      {/* A plain "delete N?" confirm; if the atomic batch reports it can't (a finalised stocktake in
          the selection), the same dialog switches to the translated error with just a Close. */}
      <Dialog
        open={state() != null}
        // Blocking while the mutation is in flight — no click-outside / Escape exit until it
        // resolves; dismissable again on confirm / success / error.
        dismissable={state()?.phase !== 'deleting'}
        onClose={() => setState(null)}
        icon={<TrashIcon />}
        title={t('stocktake.delete.title')}
        description={
          <Switch fallback={t('stocktake.delete.confirm', { count: state()?.ids.length ?? 0 })}>
            <Match when={state()?.phase === 'error'}>
              <Alert severity="error">{t('stocktake.delete.cannot-edit')}</Alert>
            </Match>
            <Match when={state()?.phase === 'success'}>
              {t('stocktake.delete.success', { count: state()?.ids.length ?? 0 })}
            </Match>
          </Switch>
        }
        actions={
          <Switch
            fallback={
              // confirm / deleting: Cancel (hidden while deleting) + the loading Delete.
              <>
                <Show when={state()?.phase === 'confirm'}>
                  <Button variant="secondary" icon={<XCircleIcon />} onClick={() => setState(null)}>
                    {t('common.cancel')}
                  </Button>
                </Show>
                <Button
                  variant="secondary"
                  icon={<TrashIcon />}
                  loading={state()?.phase === 'deleting'}
                  onClick={() => void run()}
                >
                  {t('stocktake.delete.action')}
                </Button>
              </>
            }
          >
            <Match when={state()?.phase === 'success'}>
              <Button variant="secondary" icon={<CheckIcon />} onClick={() => setState(null)}>
                {t('common.ok')}
              </Button>
            </Match>
            <Match when={state()?.phase === 'error'}>
              <Button variant="secondary" icon={<XCircleIcon />} onClick={() => setState(null)}>
                {t('common.cancel')}
              </Button>
            </Match>
          </Switch>
        }
      />
    </>
  );
};
