import { createSignal, Show, type Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  reportPermissionDenied,
} from '@/api/graphql';
import { rejectionFrom } from '@/api/rejection';
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
// Untyped is not unreadable: the server writes the service-error variant into
// extensions.details, and every refusal this mutation raises is a unit variant
// — RelocationAlreadyFinalised, RelocationDoesNotExist, NotThisStoreRelocation
// (server graphql/stock_relocation → mutations/delete.rs `map_error`) — so
// rejectionFrom translates the actual cause. It names the finalised case ONLY
// when that is the case; hard-coding it reported a reason that was not the
// user's, and a blanket refusal reported none at all. Anything unrecognised
// falls back to the generic refusal with the server's text behind a
// disclosure. Permission denials are separated out first: those owe the user
// the global permission-denied modal (D38), which opting into GraphQL errors
// would otherwise swallow. Success closes the dialog — closure is the
// confirmation (D21). Mirrors the stock-movement detail view's own line delete.
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
  // The refusal: the server's own reason where it named one, and the raw text
  // behind a disclosure where it did not.
  const [errorMessage, setErrorMessage] = createSignal<string>();
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
      const rejection = rejectionFrom(
        result.errors,
        t('messages.cant-delete-generic')
      );
      setErrorMessage(rejection.message);
      setErrorDetail(rejection.detail);
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
            {errorMessage()}
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
