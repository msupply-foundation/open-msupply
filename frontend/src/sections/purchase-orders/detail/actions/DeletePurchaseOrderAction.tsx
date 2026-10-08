import { createSignal, Show, type Component } from 'solid-js';
import { t } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { TrashIcon } from '@/ui/icons';
import { DeletePurchaseOrdersDialog } from '../../list/actions';

export interface DeletePurchaseOrderActionProps {
  storeId: string;
  orderId: string;
  orderNumber: number;
  /** True unless the order is New or Ready for approval. */
  disabled: boolean;
  /** The deletion committed — the screen leaves for the orders list. */
  onDeleted: () => void;
}

// The side panel's Delete (spec/purchase-orders S9 § actions → S3): the list's
// own delete dialog over a selection of one. The screen leaves only on a real
// deletion; a refusal is reported in the dialog with the order still on
// screen (rules § deleting from the screen).
export const DeletePurchaseOrderAction: Component<
  DeletePurchaseOrderActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="secondary"
        icon={<TrashIcon />}
        disabled={props.disabled}
        data-testid="delete-purchase-order-button"
        onClick={() => setOpen(true)}
      >
        {t('label.delete')}
      </Button>
      <Show when={open()}>
        <DeletePurchaseOrdersDialog
          storeId={props.storeId}
          selection={() => [{ id: props.orderId, number: props.orderNumber }]}
          onClose={() => setOpen(false)}
          onFinished={summary => {
            if (summary.deletedCount > 0) props.onDeleted();
          }}
        />
      </Show>
    </>
  );
};
