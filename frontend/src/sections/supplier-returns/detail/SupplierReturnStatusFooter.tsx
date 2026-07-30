import { createSignal, Show, type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { t } from '../../../intl';
import { CheckboxButton } from '../../../ui/elements/buttons/CheckboxButton';
import { CloseButton } from '../../../ui/elements/buttons/StandardButtons';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { StatusIndicator } from '../../../ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { StatusChangeAction } from './actions/StatusChangeAction';
import { currentStep, statusSteps } from './returnStatus';
import type { SupplierReturnInfoFragment } from './supplierReturnDetail.generated';

// The return-level footer (spec/supplier-returns/ui-surface.md S3 § layout —
// footer): Hold toggle · lifecycle indicator (New · Picked · Shipped · Received
// · Verified — Received/Verified for display only, filtered by the invoice-
// status-options preference) · spacer · Close · the status-advance split
// button.
//
// Hold is a soft pause on status change only (rules § header rules): the toggle
// stays available while the return is editable, confirms before flipping, and
// the messages flip with direction. It hides once the return is read-only
// (D39).

export interface SupplierReturnStatusFooterProps {
  storeId: string;
  node: SupplierReturnInfoFragment;
  /** The standing editability gate (rules § editability). */
  disabled: boolean;
  /** ≥1 line (gates the advance). */
  hasLines: boolean;
  /** The invoice-status-options preference (empty = no restriction). */
  statusOptions: readonly string[];
  /** Toggle hold (a header-level save). */
  onSetHold: (hold: boolean) => void;
  /** A status advance succeeded — merge the returned info over the node. */
  onAdvanced: (node: SupplierReturnInfoFragment) => void;
}

export const SupplierReturnStatusFooter: Component<
  SupplierReturnStatusFooterProps
> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [holdConfirm, setHoldConfirm] = createSignal(false);

  const holding = () => props.node.onHold;

  return (
    <ContentFooter>
      {/* Hold: hidden once the return is no longer editable (SHIPPED is
          terminal for this store — D39). */}
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
        steps={statusSteps(props.node, props.statusOptions)}
        current={currentStep(props.node.status, props.statusOptions)}
      />

      {/* One inline-end cluster: Close sits right beside the Confirm-status
          split button. */}
      <ContentFooterActions>
        <CloseButton
          data-testid="close-button"
          onClick={() =>
            navigate(`/${params.storeId}/replenishment/supplier-return`)
          }
        />
        <StatusChangeAction
          storeId={props.storeId}
          node={props.node}
          hasLines={props.hasLines}
          statusOptions={props.statusOptions}
          onApplied={props.onAdvanced}
        />
      </ContentFooterActions>

      {/* Hold confirm: message flips with direction (the reversible pause). */}
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
