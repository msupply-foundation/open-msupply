import { createSignal, Show, type Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { LockIcon } from '@/ui/icons';
import { closePurchaseOrderLines } from '../purchaseOrderUpdate';

export interface CloseLinesActionProps {
  storeId: string;
  selectedIds: () => string[];
  /** Offered on a SENT order, and only there. */
  disabled: boolean;
  onChanged: () => void;
}

/*
 * Close the selected lines for receipt (spec/purchase-orders S7 §
 * line-selection actions) — the ONLY surface in the app that changes a line's
 * status (rules § line status: the line editor presents the control for it
 * disabled in every state).
 *
 * Confirmed first, and the confirmation says plainly that no more stock can be
 * received against those lines. Closing is not final — the line-status rules
 * allow a closed line back to sent — but nothing offers that, so the wording
 * stays the spec's "permanently close".
 *
 * There is no bulk line update on the wire, so this is one call per line; a
 * line that refuses (re-closing an already-closed one) leaves the rest to run.
 */
export const CloseLinesAction: Component<CloseLinesActionProps> = props => {
  const [confirming, setConfirming] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [message, setMessage] = createSignal<string>();
  const [tone, setTone] = createSignal<'success' | 'error'>('success');

  const count = () => props.selectedIds().length;

  const close = async () => {
    if (busy()) return;
    setBusy(true);
    setMessage(undefined);
    const outcome = await closePurchaseOrderLines(
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
      setMessage(
        tPlural('messages.closed-purchase-order-lines', outcome.applied, {
          count: outcome.applied,
        })
      );
    }
    if (outcome.applied > 0) props.onChanged();
  };

  return (
    <>
      <Button
        variant="secondary"
        icon={<LockIcon />}
        disabled={props.disabled}
        data-testid="close-lines-button"
        onClick={() => setConfirming(true)}
      >
        {t('button.close-purchase-order-lines')}
      </Button>
      <Show when={message()}>
        {text => (
          <Alert severity={tone()} testId="close-lines-result">
            {text()}
          </Alert>
        )}
      </Show>
      <ConfirmDialog
        open={confirming()}
        onClose={() => setConfirming(false)}
        title={t('heading.are-you-sure')}
        message={tPlural(
          'messages.confirm-close-purchase-order-lines',
          count(),
          { count: count() }
        )}
        confirmVariant="danger"
        onConfirm={() => void close()}
      />
    </>
  );
};
