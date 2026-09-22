import { createSignal, Show, type Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { LockIcon } from '@/ui/icons';
import { closePurchaseOrderLines } from '../purchaseOrderUpdate';
import { LinesOutcomeDialog } from './LinesOutcomeDialog';

export interface CloseLinesActionProps {
  storeId: string;
  selectedIds: () => string[];
  /** Offered on a SENT order, and only there. */
  disabled: boolean;
  onChanged: () => void;
}

// Close the selected lines for receipt (spec/purchase-orders S7 §
// line-selection actions) — the only surface that changes a line's status
// (rules § line status). One call per line on the wire, so a refusal never
// stops the rest.
export const CloseLinesAction: Component<CloseLinesActionProps> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="secondary"
        icon={<LockIcon />}
        disabled={props.disabled}
        data-testid="close-lines-button"
        onClick={() => setOpen(true)}
      >
        {t('button.close-purchase-order-lines')}
      </Button>
      <Show when={open()}>
        <LinesOutcomeDialog
          selectedIds={props.selectedIds}
          icon={<LockIcon />}
          confirmLabel={t('button.close-purchase-order-lines')}
          confirmMessage={count =>
            tPlural('messages.confirm-close-purchase-order-lines', count, {
              count,
            })
          }
          partialTitle={t('heading.some-not-closed')}
          appliedMessage={count =>
            tPlural('messages.closed-purchase-order-lines', count, { count })
          }
          resultTestId="close-lines-result"
          run={ids => closePurchaseOrderLines(props.storeId, ids)}
          onClose={() => setOpen(false)}
          onChanged={props.onChanged}
        />
      </Show>
    </>
  );
};
