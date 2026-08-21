import { createSignal, Show, type Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  reportPermissionDenied,
} from '@/api/graphql';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { ErrorDetails } from '@/ui/elements/feedback/ErrorDetails';
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
// any rejection refuses the whole delete as a single untyped top-level error
// (rules § deletion / OMS-REG-SMV-10.28/.30), selection kept.
//
// Because it is untyped there is nothing to branch on, so the error phase does
// NOT name a cause: it states the refusal generically and puts the server's own
// text behind a disclosure — naming the finalised case for every rejection that
// lands here reported a reason that was not the user's. Permission denials are
// separated out first: those owe the user the global permission-denied modal
// (D38), which opting into GraphQL errors would otherwise swallow. Success
// closes the dialog — closure is the confirmation (D21). Mirrors the
// stock-movement detail view's own line delete.
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
  // The server's own text, behind a disclosure — the refusal arrives untyped.
  const [errorDetail, setErrorDetail] = createSignal<string>();
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
      // A permission denial is not a delete refusal — hand it to the global
      // permission-denied modal (D38) and close, as the default path would.
      if (isForbidden(result.errors)) {
        reportPermissionDenied(missingPermissions(result.errors));
        props.onClose();
        return;
      }
      setErrorDetail(result.message);
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
            {t('messages.cant-delete-generic')}
            <Show when={errorDetail()}>
              {detail => <ErrorDetails detail={detail()} />}
            </Show>
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
