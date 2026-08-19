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
import { currentStep, filterByStatusPreference } from '@/domain/invoice';
import { returnKind, statusFlow, statusSteps } from './returnStatus';
import type { CustomerReturnInfoFragment } from './customerReturnDetail.generated';

// The return-level footer (spec/customer-returns/ui-surface.md S3 § layout —
// footer): Hold toggle · lifecycle indicator (the kind's sequence, history on
// hover) · spacer · Close · the status-advance split button. Shown only when
// nothing is selected — the selection action bar replaces it.
//
// Hold is a soft pause on status change only (rules § header;
// OMS-REG-DIST-07.7/.32/.33): the
// toggle stays available while the return is editable, confirms before
// flipping, and the messages flip with direction.

export interface CustomerReturnStatusFooterProps {
  storeId: string;
  node: CustomerReturnInfoFragment;
  /** The standing editability gate (rules § editability). */
  disabled: boolean;
  /** ≥1 line (gates the advance — OMS-REG-DIST-07.38). */
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
  // The kind's flow narrowed by the invoice-status-options preference (rules
  // § preference gates); an excluded current status highlights the nearest
  // included earlier stage.
  const flow = () => statusFlow(kind());
  const offered = () => filterByStatusPreference(flow(), props.statusOptions);

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
        steps={statusSteps(offered(), props.node)}
        current={currentStep(flow(), offered(), props.node.status)}
      />

      {/* One inline-end cluster (the current app's footer): Close sits right
          beside the Confirm-status split button. */}
      <ContentFooterActions>
        <CloseButton
          data-testid="close-button"
          onClick={() =>
            navigate(`/${params.storeId}/distribution/customer-return`)
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

      {/* Hold confirm: message flips with direction (the reversible pause,
          OMS-REG-DIST-07.32;
          the copy is the current app's on/off-hold confirmations).

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
