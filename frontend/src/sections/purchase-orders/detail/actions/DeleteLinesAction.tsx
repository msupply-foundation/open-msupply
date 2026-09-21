import { createSignal, Show, type Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { TrashIcon } from '@/ui/icons';
import { deletePurchaseOrderLines } from '../purchaseOrderUpdate';

export interface DeleteLinesActionProps {
  storeId: string;
  selectedIds: () => string[];
  /** True unless the order is New or Ready for approval. */
  disabled: boolean;
  /** Lines went — re-read the page and the whole-set gates. */
  onChanged: () => void;
}

/*
 * Remove the selected lines (spec/purchase-orders S7 § line-selection
 * actions). Confirmed first, naming how many, and reported by count when it
 * lands.
 *
 * The mutation is plural and answers per id, so one call can PARTLY succeed:
 * the report says how many went and carries the first refusal. Its one typed
 * rejection is a missing line — the state gate that makes deletion
 * drafting-only arrives as an undifferentiated bad-input error (contract ⚠️),
 * which is why the action is offered only while the order is drafting.
 */
export const DeleteLinesAction: Component<DeleteLinesActionProps> = props => {
  const [confirming, setConfirming] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [message, setMessage] = createSignal<string>();
  const [tone, setTone] = createSignal<'success' | 'error'>('success');

  const count = () => props.selectedIds().length;

  const remove = async () => {
    if (busy()) return;
    setBusy(true);
    setMessage(undefined);
    const outcome = await deletePurchaseOrderLines(
      props.storeId,
      props.selectedIds()
    );
    setBusy(false);
    setConfirming(false);
    if (outcome.message) {
      setTone('error');
      setMessage(outcome.message);
    } else {
      setTone('success');
      setMessage(tPlural('messages.deleted-lines', outcome.applied));
    }
    if (outcome.applied > 0) props.onChanged();
  };

  return (
    <>
      <Button
        variant="secondary"
        icon={<TrashIcon />}
        disabled={props.disabled}
        data-testid="delete-lines-button"
        onClick={() => setConfirming(true)}
      >
        {t('button.delete-lines')}
      </Button>
      <Show when={message()}>
        {text => (
          <Alert severity={tone()} testId="delete-lines-result">
            {text()}
          </Alert>
        )}
      </Show>
      <ConfirmDialog
        open={confirming()}
        onClose={() => setConfirming(false)}
        title={t('heading.are-you-sure')}
        message={tPlural(
          'messages.confirm-delete-lines-purchase-order',
          count(),
          { count: count() }
        )}
        confirmVariant="danger"
        onConfirm={() => void remove()}
      />
    </>
  );
};
