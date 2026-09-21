import { createSignal, Show, type Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { Button } from '@/ui/elements/buttons/Button';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { TrashIcon } from '@/ui/icons';
import { DeletePurchaseOrder } from '../../list/purchaseOrders.generated';
import { deleteOutcome } from '../../list/deletePurchaseOrders';

export interface DeletePurchaseOrderActionProps {
  storeId: string;
  orderId: string;
  orderNumber: number;
  /** True unless the order is New or Ready for approval. */
  disabled: boolean;
  /** The deletion committed — the screen leaves for the orders list. */
  onDeleted: () => void;
}

/*
 * The side panel's Delete (spec/purchase-orders S9 § actions → S3): the same
 * confirmation the list raises, over one order, and then back to the list.
 *
 * It DIVERGES from the reference app deliberately: that screen navigates away
 * whether or not the deletion succeeded, so a refused deletion is
 * indistinguishable from a successful one (rules § deleting from the screen,
 * README defect 12). Here the outcome is awaited — the screen leaves only on a
 * real deletion, and a refusal is reported in place with the order still on
 * screen.
 *
 * The mutation, its fold and both of its unexplainable failures are the list's
 * (deletePurchaseOrders.ts): an order past Ready for approval is refused as
 * the typed CannotDeletePurchaseOrder, and an order an inbound shipment points
 * at fails as a top-level `Internal error` naming no cause (contract ⚠️).
 */
export const DeletePurchaseOrderAction: Component<
  DeletePurchaseOrderActionProps
> = props => {
  const [confirming, setConfirming] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const remove = async () => {
    if (busy()) return;
    setBusy(true);
    setErrorMessage(undefined);
    const result = await graphqlFetch(
      DeletePurchaseOrder,
      { storeId: props.storeId, id: props.orderId },
      { returnGraphqlErrors: true }
    );
    setBusy(false);
    setConfirming(false);
    const outcome = deleteOutcome(props.orderId, result);
    if (outcome.kind === 'deleted') {
      props.onDeleted();
      return;
    }
    // The domain's own words are not a user-facing sentence, so the rule is
    // said here and the order named — exactly as the list's report does.
    setErrorMessage(
      outcome.kind === 'notDeletable'
        ? t('messages.cannot-delete-purchase-order', {
            number: props.orderNumber,
          })
        : t('messages.error-saving-purchase-order')
    );
  };

  return (
    <>
      <Button
        variant="secondary"
        icon={<TrashIcon />}
        disabled={props.disabled}
        data-testid="delete-purchase-order-button"
        onClick={() => setConfirming(true)}
      >
        {t('label.delete')}
      </Button>
      <Show when={errorMessage()}>
        {message => (
          <Alert severity="error" testId="delete-error">
            {message()}
          </Alert>
        )}
      </Show>
      <ConfirmDialog
        open={confirming()}
        onClose={() => setConfirming(false)}
        title={t('heading.are-you-sure')}
        // The count-pluralised notice the list uses, over one order. It
        // mentions neither the order's state nor a shipment reference, though
        // either can refuse the deletion (spec S3).
        message={tPlural('messages.confirm-delete-purchase-orders', 1)}
        confirmVariant="danger"
        onConfirm={() => void remove()}
      />
    </>
  );
};
