import { createSignal, Show, type Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { TrashIcon } from '@/ui/icons';
import { deletePurchaseOrderLines } from '../purchaseOrderUpdate';
import { LinesOutcomeDialog } from './LinesOutcomeDialog';

export interface DeleteLinesActionProps {
  storeId: string;
  selectedIds: () => string[];
  /** True unless the order is New or Ready for approval. */
  disabled: boolean;
  /** Lines went — clear the selection and re-read the page and the gates. */
  onChanged: () => void;
}

// Remove the selected lines (spec/purchase-orders S7 § line-selection
// actions). The mutation is plural and answers per id, so one call can partly
// succeed; the state gate that makes deletion drafting-only arrives untyped,
// which is why the surface gates it.
export const DeleteLinesAction: Component<DeleteLinesActionProps> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="danger"
        icon={<TrashIcon />}
        disabled={props.disabled}
        data-testid="delete-lines-button"
        onClick={() => setOpen(true)}
      >
        {t('button.delete-lines')}
      </Button>
      <Show when={open()}>
        <LinesOutcomeDialog
          selectedIds={props.selectedIds}
          icon={<TrashIcon />}
          confirmLabel={t('button.delete-lines')}
          confirmMessage={count =>
            tPlural('messages.confirm-delete-lines-purchase-order', count, {
              count,
            })
          }
          partialTitle={t('heading.some-not-deleted')}
          appliedMessage={count => tPlural('messages.deleted-lines', count)}
          resultTestId="delete-lines-result"
          run={ids => deletePurchaseOrderLines(props.storeId, ids)}
          onClose={() => setOpen(false)}
          onChanged={props.onChanged}
        />
      </Show>
    </>
  );
};
