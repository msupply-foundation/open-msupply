import { createSignal, Show, type Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { TrashIcon } from '@/ui/icons';
import { DeleteStockMovements } from '../deleteStockMovements.generated';

export interface DeleteStockMovementsActionProps {
  storeId: string;
  selectedIds: () => string[];
  /** Deletion succeeded — the list clears its selection and re-queries. */
  onDeleted: () => void;
}

// The list's bulk delete — button + confirm → deleting → error dialog
// (the DeleteStocktakesAction shape). The backend owns what can be deleted;
// the batch is ALL-OR-NOTHING with no per-id results (contract § deletion):
// one finalised movement in the selection refuses the whole delete as a
// single untyped top-level error, so on failure we show OUR translated
// refusal (rules § deletion / OMS-REG-SMV-10.28/.30), selection kept.
// Success closes the dialog — closure is the confirmation (D21).
type Phase = 'confirm' | 'deleting' | 'error';

export const DeleteStockMovementsAction: Component<
  DeleteStockMovementsActionProps
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
  props: DeleteStockMovementsActionProps & { onClose: () => void }
) => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const count = props.selectedIds().length;

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('deleting');
    // returnGraphqlErrors: the finalised refusal arrives as a top-level
    // GraphQL error (nothing typed on this union) — handled here as the
    // error phase, not the global unexpected-error modal.
    const result = await graphqlFetch(
      DeleteStockMovements,
      { storeId: props.storeId, ids: props.selectedIds() },
      { returnGraphqlErrors: true }
    );
    if (result.kind === 'graphqlError') {
      setPhase('error');
      return;
    }
    if (result.kind !== 'success') {
      setPhase('confirm');
      return;
    }
    props.onClose();
    props.onDeleted();
  };

  return (
    <Dialog
      open
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
          fallback={tPlural('messages.confirm-delete-stock-movements', count)}
        >
          <Alert severity="error">
            {t('messages.cant-delete-finalised-stock-movements')}
          </Alert>
        </Show>
      }
      actions={
        <Show
          when={phase() === 'error'}
          fallback={
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
          {/* Nothing was deleted, so there is nothing to cancel — the error
              phase is acknowledged, not aborted. */}
          <Button variant="secondary" confirms="plain" onClick={props.onClose}>
            {t('button.close')}
          </Button>
        </Show>
      }
    />
  );
};
