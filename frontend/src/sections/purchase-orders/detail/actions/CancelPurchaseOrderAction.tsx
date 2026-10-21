import { createResource, createSignal, Show, type Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton, OkButton } from '@/ui/elements/buttons/StandardButtons';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Stack } from '@/ui/layout/Stack/Stack';
import { MinusCircleIcon } from '@/ui/icons';
import { graphqlFetch } from '@/api/graphql';
import { hasPermission } from '@/store/storeContext';
import { PurchaseOrderShipments } from '../purchaseOrderDetail.generated';
import { updatePurchaseOrder } from '../purchaseOrderUpdate';

export interface CancelPurchaseOrderActionProps {
  storeId: string;
  orderId: string;
  /** Cancelling is offered on a Sent order alone (rules § cancellation). */
  offered: boolean;
  /** The cancellation landed — the screen re-reads the order and its lines. */
  onCancelled: () => void;
}

// The side panel's Cancel (spec/purchase-orders S9 § actions → S18): a status
// move the ladder never offers, so it lives beside Delete rather than on the
// footer. Runs the confirm → working → error machine over one Dialog
// (kdd/action-modal): a refusal has to be SHOWN — the domain types the one
// that matters, a shipment past New — so the dialog stays up on it rather
// than closing into silence. Success closes the dialog; the ladder's new
// Cancelled rung is the feedback.
//
// The warning about shipments is a fact only the server holds, so it is read
// when the dialog opens, never pre-computed: the New shipments raised against
// the order are deleted with it, and the user is told how many before
// confirming (OMS-REG-PO-01.30).
export const CancelPurchaseOrderAction: Component<
  CancelPurchaseOrderActionProps
> = props => {
  const [phase, setPhase] = createSignal<'confirm' | 'working' | 'error'>();
  const [error, setError] = createSignal('');
  const canMutate = () => hasPermission('PURCHASE_ORDER_MUTATE');

  // How many New shipments the cancellation will delete — fetched on open.
  // Read non-suspending: the dialog sits inside the already-open screen.
  const [shipments] = createResource(
    () =>
      phase() ? { storeId: props.storeId, orderId: props.orderId } : undefined,
    async variables => {
      const result = await graphqlFetch(PurchaseOrderShipments, variables);
      if (result.kind !== 'success') return 0;
      return result.data.invoices.nodes.filter(
        shipment => shipment.status === 'NEW'
      ).length;
    }
  );
  const newShipments = () =>
    shipments.state === 'ready' || shipments.state === 'refreshing'
      ? (shipments.latest ?? 0)
      : 0;

  const close = () => setPhase(undefined);

  const cancel = async () => {
    setPhase('working');
    const result = await updatePurchaseOrder(props.storeId, {
      id: props.orderId,
      status: 'CANCELLED',
    });
    if (result.kind === 'saved') {
      close();
      props.onCancelled();
      return;
    }
    if (result.kind === 'error') {
      setError(result.message);
      setPhase('error');
      return;
    }
    // A transport failure is already up in the global modal.
    close();
  };

  return (
    <Show when={props.offered}>
      {/* The permission gate withholds the action with its reason on the
          control (ui-standards/validation.md § permission gating). Danger
          tone: cancelling a sent order is final. */}
      <Button
        variant="danger"
        icon={<MinusCircleIcon />}
        data-testid="cancel-purchase-order-button"
        title={
          canMutate()
            ? undefined
            : t('messages.cancel-purchase-order-not-allowed')
        }
        disabled={!canMutate()}
        onClick={() => setPhase('confirm')}
      >
        {t('label.cancel-purchase-order')}
      </Button>
      <Show when={phase()}>
        {current => (
          <Dialog
            open
            dismissable={current() !== 'working'}
            onClose={close}
            icon={<MinusCircleIcon />}
            testId="confirmation-modal"
            // The title tracks the phase — a rejection is not a question
            // (kdd/action-modal).
            title={
              current() === 'error'
                ? t('heading.cannot-do-that')
                : t('heading.are-you-sure')
            }
            description={
              <Show
                when={current() === 'error'}
                fallback={
                  <Stack gap="sm">
                    <span>{t('messages.confirm-cancel-purchase-order')}</span>
                    <Show when={newShipments() > 0}>
                      <Alert
                        severity="warning"
                        compact
                        testId="cancel-purchase-order-shipments-notice"
                      >
                        {tPlural(
                          'messages.cancel-purchase-order-deletes-shipments',
                          newShipments()
                        )}
                      </Alert>
                    </Show>
                  </Stack>
                }
              >
                <Alert severity="error">{error()}</Alert>
              </Show>
            }
            actions={
              <Show
                when={current() === 'error'}
                fallback={
                  <>
                    <Show when={current() === 'confirm'}>
                      <CancelButton onClick={close} />
                    </Show>
                    <Button
                      variant="danger"
                      confirms="plain"
                      data-testid="confirmation-modal-ok"
                      loading={current() === 'working'}
                      onClick={() => void cancel()}
                    >
                      {t('label.cancel-purchase-order')}
                    </Button>
                  </>
                }
              >
                <OkButton data-testid="dialog-button-ok" onClick={close} />
              </Show>
            }
          />
        )}
      </Show>
    </Show>
  );
};
