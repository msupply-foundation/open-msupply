import { createSignal, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '../../../../ui/icons';
import { runInboundBatch } from '../inboundShipmentUpdate';
import type { LineActionProps } from './DeleteLinesAction';

// Approve / Reject / Pending the selected lines (spec S3 → line-selection
// actions; shown only when the authorisation-required preference is active).
// Sets each line's authorisation status via a batch update. The server blocks
// a status change once the shipment is Received (a no-op is allowed) — a
// rejection stamps the offending lines inline.
type LineStatus = 'PASSED' | 'REJECTED' | 'PENDING';

export const AuthoriseLinesAction: Component<LineActionProps> = props => {
  const [busy, setBusy] = createSignal(false);

  const run = async (status: LineStatus) => {
    if (busy() || props.disabled) return;
    setBusy(true);
    const outcome = await runInboundBatch(props.storeId, props.isExternal, {
      updateInboundShipmentLines: props
        .selectedIds()
        .map(id => ({ id, status })),
    });
    setBusy(false);
    if (!outcome) return;
    if (outcome.errors.size > 0) props.onError(outcome.errors);
    if (outcome.applied) props.onChanged();
  };

  return (
    <>
      <Button
        variant="secondary"
        icon={<CheckCircleIcon />}
        disabled={props.disabled}
        loading={busy()}
        data-testid="approve-lines-button"
        onClick={() => void run('PASSED')}
      >
        {t('label.approve')}
      </Button>
      <Button
        variant="secondary"
        icon={<XCircleIcon />}
        disabled={props.disabled}
        loading={busy()}
        data-testid="reject-lines-button"
        onClick={() => void run('REJECTED')}
      >
        {t('label.reject')}
      </Button>
      <Button
        variant="secondary"
        icon={<ClockIcon />}
        disabled={props.disabled}
        loading={busy()}
        data-testid="pending-lines-button"
        onClick={() => void run('PENDING')}
      >
        {t('label.pending')}
      </Button>
    </>
  );
};
