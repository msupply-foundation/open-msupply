import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { CheckboxButton } from '../../../ui/elements/buttons/CheckboxButton';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { StatusIndicator } from '../../../ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { StatusChangeAction } from './actions/StatusChangeAction';
import { currentStep, filterByStatusPreference } from '@/domain/invoice';
import { STATUS_FLOW, statusSteps } from './returnStatus';
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
  const [holdConfirm, setHoldConfirm] = createSignal(false);

  const holding = () => props.node.onHold;
  // The flow narrowed by the invoice-status-options preference (rules §
  // preference gates); an excluded current status highlights the nearest
  // included earlier stage.
  const offered = () =>
    filterByStatusPreference(STATUS_FLOW, props.statusOptions);

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
        steps={statusSteps(offered(), props.node)}
        current={currentStep(STATUS_FLOW, offered(), props.node.status)}
      />

      {/* One inline-end cluster: the Confirm-status split button alone. No
          Close beside it (D103) — leaving the return is the breadcrumb's job,
          in the app bar, where every other screen puts it. */}
      <ContentFooterActions>
        <StatusChangeAction
          storeId={props.storeId}
          node={props.node}
          hasLines={props.hasLines}
          statusOptions={props.statusOptions}
          onApplied={props.onAdvanced}
        />
      </ContentFooterActions>

      {/* Hold confirm: message flips with direction (the reversible pause).

          Mounted only while open (kdd/action-modal). A closed <dialog> is still
          in the document, just hidden, so a permanently-mounted one keeps its
          `confirmation-modal` + footer ids matchable — three of them coexist on
          this screen, which is what forced the e2e suite's `.last()` workaround
          (e2e/TESTIDS.md). */}
      <Show when={holdConfirm()}>
        <ConfirmDialog
          open
          onClose={() => setHoldConfirm(false)}
          title={t('heading.are-you-sure')}
          message={
            holding()
              ? t('messages.off-hold-confirmation')
              : t('messages.on-hold-confirmation')
          }
          onConfirm={() => props.onSetHold(!holding())}
        />
      </Show>
    </ContentFooter>
  );
};
