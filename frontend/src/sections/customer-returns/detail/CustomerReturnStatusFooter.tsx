import { createSignal, Show, type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { t } from '../../../intl';
import { CheckboxButton } from '../../../ui/elements/buttons/CheckboxButton';
import { Button } from '../../../ui/elements/buttons/Button';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { StatusIndicator } from '../../../ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { XCircleIcon } from '../../../ui/icons';
import { StatusChangeAction } from './actions/StatusChangeAction';
import { currentStep, returnKind, statusSteps } from './returnStatus';
import type { CustomerReturnInfoFragment } from './customerReturnDetail.generated';

// The return-level footer (spec/customer-returns/ui-surface.md S3 § layout —
// footer): Hold toggle · lifecycle indicator (the kind's sequence, history on
// hover) · spacer · Close · the status-advance split button. Shown only when
// nothing is selected — the selection action bar replaces it.
//
// Hold is a soft pause on status change only (rules § header; OMS-REG-DIST-07.7): the
// toggle stays available while the return is editable, confirms before
// flipping, and the messages flip with direction.

export interface CustomerReturnStatusFooterProps {
  storeId: string;
  node: CustomerReturnInfoFragment;
  /** The standing editability gate (rules § editability). */
  disabled: boolean;
  /** ≥1 line (gates the advance — OMS-REG-DIST-07.27). */
  hasLines: boolean;
  /** The invoice-status-options preference (empty = no restriction). */
  statusOptions: readonly string[];
  /** Toggle hold (a header-level save). */
  onSetHold: (hold: boolean) => void;
  /** A status advance succeeded — merge the returned info over the node. */
  onAdvanced: (node: CustomerReturnInfoFragment) => void;
}

export const CustomerReturnStatusFooter: Component<
  CustomerReturnStatusFooterProps
> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [holdConfirm, setHoldConfirm] = createSignal(false);

  const kind = () => returnKind(props.node);
  const holding = () => props.node.onHold;

  return (
    <ContentFooter>
      {/* Hold: hidden once the return is no longer editable (a VERIFIED return
          can't change; a transfer return in the sender's hands can't either). */}
      <Show when={!props.disabled}>
        <CheckboxButton
          checked={holding()}
          data-testid="on-hold-button"
          onChange={() => setHoldConfirm(true)}
        >
          {t('label.hold')}
        </CheckboxButton>
      </Show>

      <StatusIndicator
        steps={statusSteps(kind(), props.node, props.statusOptions)}
        current={currentStep(kind(), props.node.status, props.statusOptions)}
      />

      {/* One inline-end cluster (the current app's footer): Close sits right
          beside the Confirm-status split button. */}
      <ContentFooterActions>
        <Button
          variant="secondary"
          icon={<XCircleIcon />}
          data-testid="close-button"
          onClick={() =>
            navigate(`/${params.storeId}/distribution/customer-return`)
          }
        >
          {t('button.close')}
        </Button>
        <StatusChangeAction
          storeId={props.storeId}
          node={props.node}
          hasLines={props.hasLines}
          statusOptions={props.statusOptions}
          onApplied={props.onAdvanced}
        />
      </ContentFooterActions>

      {/* Hold confirm: message flips with direction (OMS-REG-DIST-07.7's reversible pause;
          the copy is the current app's on/off-hold confirmations). */}
      <ConfirmDialog
        open={holdConfirm()}
        onClose={() => setHoldConfirm(false)}
        title={t('heading.are-you-sure')}
        message={
          holding()
            ? t('messages.off-hold-confirmation')
            : t('messages.on-hold-confirmation')
        }
        onConfirm={() => props.onSetHold(!holding())}
      />
    </ContentFooter>
  );
};
