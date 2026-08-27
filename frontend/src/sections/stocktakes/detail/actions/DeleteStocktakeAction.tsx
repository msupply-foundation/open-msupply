import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { TrashIcon } from '@/ui/icons';
import { DeleteStocktake } from '../lines/stocktakeDetail.generated';

export interface DeleteStocktakeActionProps {
  storeId: string;
  /** The stocktake to delete. */
  stocktakeId: string;
  /** Its human number — shown in the confirm copy. */
  stocktakeNumber: number;
  /**
   * NEW-and-unlocked gate (the same editability gate the rest of the detail
   * screen uses). When true the button is disabled — the backend would reject
   * the delete anyway (finalised / on-hold), but we mirror the gate so the
   * action reads as unavailable rather than failing on confirm.
   */
  disabled: boolean;
  /**
   * The stocktake was deleted — the view leaves for the list (with a replaced
   * history entry so Back can't return to the now-deleted record).
   */
  onDeleted: () => void;
}

// The detail side-panel "Delete" action — its button plus a confirm → deleting
// → error dialog, a self-contained peer of the other detail actions
// (kdd/action-modal), modelled on the LIST's DeleteStocktakesAction but for the
// ONE record in view.
//
// Shape mirrors FinaliseAction: the dialog is blocking while the delete is in
// flight (no scrim/Escape, Cancel hidden, the OK button shows loading). The
// atomic batchStocktake delete is the source of truth for what can be deleted
// (a finalised / on-hold stocktake can't) — on a DeleteStocktakeError we switch
// the SAME dialog to our translated message with just a Close. There is no
// success PHASE: a successful delete hands control to the view (onDeleted),
// which navigates away — so the dialog simply disappears with the page rather
// than reporting a count nobody stays to read.
type Phase = 'confirm' | 'deleting' | 'error';

export const DeleteStocktakeAction: Component<
  DeleteStocktakeActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  const [phase, setPhase] = createSignal<Phase>('confirm');

  const close = () => {
    setOpen(false);
    setPhase('confirm');
  };

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('deleting');
    const result = await graphqlFetch(DeleteStocktake, {
      storeId: props.storeId,
      id: props.stocktakeId,
    });
    if (result.kind !== 'success') {
      // transport/unexpected → the global error modal already surfaced it; drop
      // back to confirm so the dialog isn't left stuck loading.
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
    // Deleted: leave for the list (the view navigates with a replaced history
    // entry). No success phase — the dialog goes with the page.
    props.onDeleted();
  };

  return (
    <>
      <Button
        variant="danger"
        icon={<TrashIcon />}
        disabled={props.disabled}
        data-testid="delete-stocktake-button"
        onClick={() => setOpen(true)}
      >
        {t('button.delete')}
      </Button>
      <Show when={open()}>
        <Dialog
          open
          // Blocking while the mutation is in flight — no click-outside /
          // Escape exit until it resolves.
          dismissable={phase() !== 'deleting'}
          onClose={close}
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
            <Switch
              fallback={t('messages.confirm-delete-stocktake', {
                number: props.stocktakeNumber,
              })}
            >
              <Match when={phase() === 'error'}>
                <Alert severity="error">
                  {t('messages.cannot-delete-stocktake')}
                </Alert>
              </Match>
            </Switch>
          }
          actions={
            <Switch
              fallback={
                // confirm / deleting: Cancel (hidden while deleting) + the
                // loading Delete.
                <>
                  <Show when={phase() === 'confirm'}>
                    <CancelButton
                      data-testid="dialog-button-cancel"
                      onClick={close}
                    />
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
              {/* Nothing was deleted, so this is acknowledged, not confirmed. */}
              <Match when={phase() === 'error'}>
                <Button
                  variant="secondary"
                  confirms="plain"
                  data-testid="dialog-button-ok"
                  onClick={close}
                >
                  {t('button.close')}
                </Button>
              </Match>
            </Switch>
          }
        />
      </Show>
    </>
  );
};
